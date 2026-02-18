#!/usr/bin/env bash
# =============================================================================
# auto-commit.sh
# Claude Code Stop Hook: 변경사항 자동 커밋
#
# Claude가 작업을 완료(Stop)할 때 커밋되지 않은 변경사항이 있으면
# 변경 내용을 분석하여 conventional commit 메시지를 생성하고 자동 커밋합니다.
# =============================================================================

set -euo pipefail

# 프로젝트 디렉토리로 이동
cd "${CLAUDE_PROJECT_DIR:-.}"

# Git 저장소인지 확인
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    exit 0
fi

# 커밋되지 않은 변경사항 확인
HAS_STAGED=$(git diff --cached --quiet 2>/dev/null; echo $?)
HAS_UNSTAGED=$(git diff --quiet 2>/dev/null; echo $?)
HAS_UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | head -1)

if [ "$HAS_STAGED" = "0" ] && [ "$HAS_UNSTAGED" = "0" ] && [ -z "$HAS_UNTRACKED" ]; then
    exit 0
fi

# 모든 변경사항 스테이징
git add -A

# 변경된 파일 목록 수집
CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null)
DIFF_STAT=$(git diff --cached --stat 2>/dev/null)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

# -----------------------------------------------------------------------------
# 커밋 타입 추론
# -----------------------------------------------------------------------------
detect_type() {
    local files="$1"
    local has_src=false
    local has_test=false
    local has_docs=false
    local has_ci=false
    local has_build=false
    local has_style=false
    local has_config=false

    while IFS= read -r file; do
        case "$file" in
            *.test.*|*.spec.*|*__tests__/*|*test/*|*tests/*)
                has_test=true ;;
            *.md|docs/*|*.txt)
                has_docs=true ;;
            .github/*|.gitlab-ci*|Jenkinsfile|*.yml|*.yaml)
                has_ci=true ;;
            package.json|package-lock.json|yarn.lock|pnpm-lock.yaml|Makefile|Dockerfile|*.toml|go.sum|go.mod)
                has_build=true ;;
            .eslintrc*|.prettierrc*|.editorconfig|.stylelintrc*)
                has_style=true ;;
            *.json|*.env*|*config*|*settings*)
                has_config=true ;;
            *)
                has_src=true ;;
        esac
    done <<< "$files"

    # 단일 카테고리만 해당하면 해당 타입 반환
    if $has_test && ! $has_src; then echo "test"; return; fi
    if $has_docs && ! $has_src; then echo "docs"; return; fi
    if $has_ci && ! $has_src; then echo "ci"; return; fi
    if $has_build && ! $has_src; then echo "build"; return; fi
    if $has_style && ! $has_src; then echo "style"; return; fi
    if $has_config && ! $has_src; then echo "chore"; return; fi

    # 새 파일이 대부분이면 feat, 아니면 chore
    local added=$(git diff --cached --diff-filter=A --name-only 2>/dev/null | wc -l | tr -d ' ')
    local modified=$(git diff --cached --diff-filter=M --name-only 2>/dev/null | wc -l | tr -d ' ')
    local deleted=$(git diff --cached --diff-filter=D --name-only 2>/dev/null | wc -l | tr -d ' ')

    if [ "$added" -gt "$modified" ] && [ "$added" -gt "$deleted" ]; then
        echo "feat"
    elif [ "$deleted" -gt "$added" ] && [ "$deleted" -gt "$modified" ]; then
        echo "refactor"
    else
        echo "chore"
    fi
}

# -----------------------------------------------------------------------------
# 스코프 추론 (공통 디렉토리 기반)
# -----------------------------------------------------------------------------
detect_scope() {
    local files="$1"
    local dirs=()

    while IFS= read -r file; do
        local dir
        dir=$(dirname "$file" | cut -d'/' -f1-2)
        if [ "$dir" != "." ]; then
            dirs+=("$dir")
        fi
    done <<< "$files"

    if [ ${#dirs[@]} -eq 0 ]; then
        echo ""
        return
    fi

    # 모든 파일이 같은 최상위 디렉토리에 있으면 스코프로 사용
    local first_top
    first_top=$(echo "${dirs[0]}" | cut -d'/' -f1)
    local all_same=true

    for d in "${dirs[@]}"; do
        local top
        top=$(echo "$d" | cut -d'/' -f1)
        if [ "$top" != "$first_top" ]; then
            all_same=false
            break
        fi
    done

    if $all_same; then
        echo "$first_top"
    else
        echo ""
    fi
}

# -----------------------------------------------------------------------------
# 설명(description) 생성
# -----------------------------------------------------------------------------
generate_description() {
    local files="$1"
    local file_count
    file_count=$(echo "$files" | wc -l | tr -d ' ')

    if [ "$file_count" -eq 1 ]; then
        local filename
        filename=$(basename "$files")
        local status
        status=$(git diff --cached --diff-filter=AMDRT --name-status 2>/dev/null | grep "$(echo "$files" | head -1)" | cut -f1)

        case "$status" in
            A) echo "add $filename" ;;
            D) echo "remove $filename" ;;
            M) echo "update $filename" ;;
            R*) echo "rename $filename" ;;
            *) echo "update $filename" ;;
        esac
    else
        local added=$(git diff --cached --diff-filter=A --name-only 2>/dev/null | wc -l | tr -d ' ')
        local modified=$(git diff --cached --diff-filter=M --name-only 2>/dev/null | wc -l | tr -d ' ')
        local deleted=$(git diff --cached --diff-filter=D --name-only 2>/dev/null | wc -l | tr -d ' ')

        local parts=()
        [ "$added" -gt 0 ] && parts+=("add ${added} file(s)")
        [ "$modified" -gt 0 ] && parts+=("update ${modified} file(s)")
        [ "$deleted" -gt 0 ] && parts+=("remove ${deleted} file(s)")

        local IFS=', '
        echo "${parts[*]}"
    fi
}

# -----------------------------------------------------------------------------
# 메시지 조합 및 커밋
# -----------------------------------------------------------------------------
TYPE=$(detect_type "$CHANGED_FILES")
SCOPE=$(detect_scope "$CHANGED_FILES")
DESC=$(generate_description "$CHANGED_FILES")

if [ -n "$SCOPE" ]; then
    COMMIT_MSG="${TYPE}(${SCOPE}): ${DESC}"
else
    COMMIT_MSG="${TYPE}: ${DESC}"
fi

# 72자 제한
COMMIT_MSG=$(echo "$COMMIT_MSG" | cut -c1-72)

# body: 변경 파일 목록
BODY=$(echo "$CHANGED_FILES" | sed 's/^/- /')

git commit -m "$(cat <<EOF
${COMMIT_MSG}

${BODY}
EOF
)"

exit 0
