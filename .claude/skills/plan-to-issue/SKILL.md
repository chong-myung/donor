---
name: plan-to-issue
description: "Convert Claude Code plan mode outputs into structured GitHub Issues with type-specific templates. Use this skill when the user mentions 'plan to issue', 'create issue from plan', 'register as issue', 'issue 등록', '이슈로 만들어줘', '태스크 분리', '티켓 생성', or any request to turn a plan into trackable GitHub tickets. Automatically detects plan type (feature, bugfix, refactor, docs, test, chore) and applies the appropriate template. Supports epic decomposition for large plans."
---

## Overview

Automatically converts plans generated in Claude Code's plan mode into GitHub Issues.
Detects the plan type (feature, bugfix, refactor, etc.) and applies the appropriate issue template.
Uses the **GitHub MCP Server** as the primary method for issue creation — no CLI installation required.

---

## Workflow

### Step 0: Detect Repository Context

Before anything else, identify `owner` and `repo` from the current project's git remote.

```bash
# Parse owner/repo from git remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

# Handle SSH format: git@github.com:owner/repo.git
# Handle HTTPS format: https://github.com/owner/repo.git
OWNER=$(echo "$REMOTE_URL" | sed -E 's#(git@|https://)github\.com[:/]##' | sed 's#\.git$##' | cut -d'/' -f1)
REPO=$(echo "$REMOTE_URL" | sed -E 's#(git@|https://)github\.com[:/]##' | sed 's#\.git$##' | cut -d'/' -f2)
```

**Fallback**: If git remote is not available or not a GitHub URL, ask the user:
> "GitHub 저장소 정보를 자동으로 감지할 수 없습니다. `owner/repo` 형식으로 알려주세요."

Store these values and reuse throughout all subsequent MCP calls.

---

### Step 1: Locate and Read the Plan

Check these locations in order:

1. **Conversation context** — plan content already in the current chat
2. **Project-local plans** — `.claude/plans/` in the current working directory
3. **Global plans** — `~/.claude/plans/`

If multiple plans exist, list them and ask the user to select:
> "다음 plan 파일들을 찾았습니다. 어떤 것을 이슈로 등록할까요?"

---

### Step 2: Auto-detect Plan Type

Read the plan content and classify based on keywords.

> **참조**: `references/classification-rules.md` 섹션 1 — 유형별 감지 키워드 테이블 및 애매한 경우 처리

---

### Step 3: Detect Language

Determine the primary language of the plan content to match template language:

- **Korean template**: Plan content is predominantly Korean, or user's messages are in Korean
- **English template**: Plan content is predominantly English, or user's messages are in English

Default to the language the user is currently speaking in. All templates below are provided in Korean; for English users, translate template headings and placeholder comments accordingly.

---

### Step 4: Estimate Size and Priority

Before creating the issue, assess size and priority.

> **참조**: `references/classification-rules.md` 섹션 2-3 — 크기(S/M/L) 및 우선순위(critical/high/medium) 추정 규칙

---

### Step 5: Apply Type-specific Template

감지된 유형에 맞는 템플릿을 적용한다. 6가지 유형(Feature, Bugfix, Refactor, Docs, Test, Chore)별 템플릿, 라벨, 브랜치 프리픽스를 참조한다.

> **참조**: `references/issue-templates.md` — 유형별 마크다운 템플릿 및 메타데이터(Labels, Branch prefix)

---

### Step 6: Preview Before Creating

**Always show the user a preview before making any MCP calls.**

Present a summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Issue Preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Repo:     owner/repo
📝 Title:    [feature] 사용자 인증 시스템 구현
🏷️  Labels:   enhancement, type:feature, size:M, priority:medium
👤 Assignee: (none)
🎯 Milestone: (none)

--- Body Preview (first 20 lines) ---
## 개요
사용자 인증을 위한 JWT 기반 로그인/회원가입 시스템을 구현합니다.
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then ask:
> "이대로 이슈를 생성할까요? 수정할 부분이 있으면 알려주세요."

Options to offer:
- ✅ 바로 생성
- ✅ 이슈 + 브랜치 함께 생성
- ✏️ 제목 수정
- 🏷️ 라벨 변경
- 👤 담당자 지정
- 🎯 마일스톤 연결
- 📝 본문 수정

---

### Step 7: Create the Issue via MCP

#### Single issue creation

```
Tool:  mcp__github__create_issue
Params:
  owner:     "<detected-owner>"
  repo:      "<detected-repo>"
  title:     "[<type>] <concise title from plan>"
  body:      "<rendered template content>"
  labels:    ["<type-label>", "<size-label>", "<priority-label>"]
  assignees: ["<username>"]       # if specified by user
  milestone:  <milestone-number>  # if specified by user
```

#### Error handling

오류 발생 시 절대 무시하지 않고, 원인과 해결 방법을 사용자에게 보고한다.

> **참조**: `references/classification-rules.md` 섹션 4 — 에러 코드별 대응 테이블 및 안내 메시지 형식

#### Post-creation: confirm success

After successful creation, display:
```
✅ Issue #<number> created successfully!
🔗 https://github.com/<owner>/<repo>/issues/<number>
```

---

### Step 8: Post-creation Actions (Optional)

Offer these as follow-up options after issue creation:

#### A. Add implementation context as a comment

```
Tool:  mcp__github__add_issue_comment
Params:
  owner:        "<owner>"
  repo:         "<repo>"
  issue_number: <created-issue-number>
  body:         "## Implementation Notes\n\n<additional context from plan>"
```

#### B. Create a feature branch

이슈 생성 후 해당 이슈에 대한 작업 브랜치를 MCP로 생성한다.

**Branch naming convention:**
- Format: `<branch-prefix>/<issue-number>-<slug>`
- Slugify: 이슈 제목을 lowercase로 변환, 공백은 하이픈으로, 특수문자 제거, 최대 50자
- 예시: `feat/42-user-auth-system`, `fix/15-login-token-expired`

```
Tool:  mcp__github__create_branch
Params:
  owner:       "<owner>"
  repo:        "<repo>"
  branch:      "<branch-prefix>/<issue-number>-<slug>"
  from_branch: "main"    # 또는 프로젝트의 기본 브랜치
```

성공 시 표시:
```
🌿 Branch created: <branch-prefix>/<issue-number>-<slug>
   from: main
```

생성 후 로컬에서 작업을 바로 시작하려면 다음 명령어를 안내한다:
```bash
git fetch origin
git checkout <branch-prefix>/<issue-number>-<slug>
```

> **Fallback**: MCP 호출 실패 시 (권한 문제 등) 로컬 git 명령어를 대안으로 제시:
> ```bash
> git checkout -b <branch-prefix>/<issue-number>-<slug> main
> git push -u origin <branch-prefix>/<issue-number>-<slug>
> ```

---

### Step 9: Splitting Large Plans (Epic Strategy)

Plan이 3개 이상의 독립적인 작업 단위를 포함하면 Epic + 하위 이슈로 분해한다.

> **참조**: `references/epic-strategy.md` — Epic 감지 기준, 분해 워크플로우 4단계, Epic 본문 업데이트 템플릿

---

## Important Notes

- **MCP-first approach**: Always prefer MCP tools over `gh` CLI. MCP works without CLI installation and is natively integrated into Claude Code.
- **Owner/repo detection**: Always auto-detect from git remote. Never hardcode values. Confirm with user if detection fails.
- **Preview before creation**: Always show a preview and get user confirmation before creating issues. This prevents mistakes and gives the user a chance to adjust.
- **Label validation**: If a label does not exist in the repo, the MCP `create_issue` call may fail on some repositories. If it fails, inform the user and suggest creating the label first or proceeding without it.
- **Plan file locations**: Check conversation context first, then `.claude/plans/`, then `~/.claude/plans/`.
- **Ambiguous plans**: If the plan type or scope is unclear, ask the user to confirm before proceeding.
- **Rate limits**: GitHub API has rate limits. For large Epic decompositions (5+ sub-issues), add a brief pause between calls if needed.
- **Language consistency**: Match the template language to the user's language. Don't mix Korean and English within a single issue body.
- **Error transparency**: Never silently skip errors. Always report what failed and why, with actionable suggestions.