---
name: write-issue
description: "Converts user plans or requirements into structured GitHub Issues. Triggered by requests such as 'create issue', 'make ticket', 'split into tasks', 'register issue', etc. Accepts any form of plan — conversation context, direct input, file contents, or pasted text — auto-detects the issue type (feature, bugfix, refactor, docs, test, chore) and applies the appropriate template."
---

## Overview
A skill that converts plans, ideas, and requirements described by the user into GitHub Issues.
Regardless of the input source — conversation context, directly written text, files, or pasted content — it auto-detects the issue type and applies the corresponding template to create the issue.

---

## Input Sources

Any of the following forms are recognized as a plan:

1. **Conversation context** — Content discussed in the current conversation
2. **Direct input** — Text provided by the user in a message
3. **File reference** — A file specified by the user (markdown, text, etc.)
4. **Clipboard / Paste** — Content pasted by the user

If the input is unclear, confirm with the user what content should be converted into an issue.

---

## Workflow

### Step 1: Auto-detect Issue Type

Read the plan content and classify it based on the following criteria:

| Type | Detection Keywords / Patterns |
|---|---|
| `feature` | 새 기능, 추가, 구현, 도입, new, implement, add, introduce |
| `bugfix` | 버그, 오류, 수정, fix, crash, error, broken, failing |
| `refactor` | 리팩토링, 개선, 정리, 구조 변경, 성능, optimize, restructure, clean up |
| `docs` | 문서화, README, API docs, 주석, documentation, comments |
| `test` | 테스트, 커버리지, E2E, unit test, coverage, spec |
| `chore` | 의존성, CI/CD, 빌드, 설정, dependency, build, config, upgrade |

If the type is ambiguous, confirm with the user before proceeding.

---

### Step 2: Apply Type-specific Template

#### 🚀 Feature

```markdown
## 개요
<!-- 기능 목적 1-2문장 -->

## 사용자 시나리오
- As a [사용자 유형], I want to [행동] so that [이유]

## 구현 계획
- [ ] Phase 1: [기반 작업 - 모델/스키마/인터페이스]
- [ ] Phase 2: [핵심 로직 구현]
- [ ] Phase 3: [UI/API 연결]
- [ ] Phase 4: [테스트 작성]

## 기술 결정사항
- **접근 방식**:
- **사용 라이브러리**:
- **영향받는 모듈**:

## 변경 예상 파일
- `src/...`

## 수용 기준 (Acceptance Criteria)
- [ ] [구체적이고 검증 가능한 조건]
```

**Labels**: `enhancement`, `type:feature`
**Branch prefix**: `feat/`

---

#### 🐛 Bugfix (버그 수정)

```markdown
## 버그 설명
<!-- 무엇이 잘못되고 있는가 -->

## 재현 단계
1. ...
2. ...
3. ...

## 현재 동작 (Actual)
<!-- 지금 어떻게 동작하는가 -->

## 기대 동작 (Expected)
<!-- 올바르게 동작하면 어떠해야 하는가 -->

## 원인 분석
- **원인 위치**: `src/...`
- **근본 원인**:

## 수정 계획
- [ ] [수정 단계 1]
- [ ] [수정 단계 2]
- [ ] [회귀 테스트 추가]

## 영향 범위
- **심각도**: Critical / High / Medium / Low
- **영향받는 기능**:

## 관련 로그/에러
```
에러 메시지 또는 스택 트레이스
```
```

**Labels**: `bug`, `type:bugfix`
**Branch prefix**: `fix/`

---

#### ♻️ Refactor (리팩토링)

```markdown
## 리팩토링 목적
<!-- 왜 리팩토링이 필요한가 -->

## 현재 구조의 문제점
- 문제 1: ...
- 문제 2: ...

## 변경 전 → 변경 후

### Before 현재 구조 다이어그램 또는 코드 패턴

### After 목표 구조 다이어그램 또는 코드 패턴

## 리팩토링 단계
- [ ] Step 1: [안전한 준비 작업 - 테스트 보강 등]
- [ ] Step 2: [핵심 구조 변경]
- [ ] Step 3: [의존하는 코드 업데이트]
- [ ] Step 4: [정리 및 검증]

## 변경 범위
- **변경 파일 수**: 약 N개
- **핵심 파일**: `src/...`
- **공개 API 변경 여부**: Yes / No

## 리스크 & 완화 전략
| 리스크 | 확률 | 완화 방법 |
|---|---|---|
| 기존 테스트 실패 | 중 | 단계별 커밋으로 롤백 용이하게 |

## 성공 기준
- [ ] 기존 테스트 100% 통과
- [ ] [성능/가독성/유지보수성 개선 지표]
- [ ] 외부 동작 변경 없음
```

**Labels**: `refactor`, `type:refactor`
**Branch prefix**: `refactor/`

---

#### 📝 Docs (문서화)

```markdown
## 문서화 대상
<!-- 무엇에 대한 문서인가 -->

## 문서화 이유
<!-- 왜 필요한가: 신규 기능, 기존 문서 부족, 온보딩 등 -->

## 작성 계획
- [ ] [문서 항목 1]
- [ ] [문서 항목 2]
- [ ] [코드 주석/JSDoc 추가]

## 대상 독자
<!-- 신규 개발자 / API 사용자 / 운영팀 등 -->

## 변경 파일
- `docs/...`
- `README.md`
```

**Labels**: `documentation`, `type:docs`
**Branch prefix**: `docs/`

---

#### 🧪 Test (테스트)

```markdown
## 테스트 대상
<!-- 어떤 모듈/기능의 테스트인가 -->

## 현재 커버리지 상태
- **현재 커버리지**: ~N%
- **목표 커버리지**: ~N%
- **미커버 영역**:

## 테스트 계획
- [ ] 단위 테스트: [대상]
- [ ] 통합 테스트: [대상]
- [ ] E2E 테스트: [대상]
- [ ] 엣지 케이스: [목록]

## 테스트 케이스 목록
| 케이스 | 입력 | 기대 결과 | 유형 |
|---|---|---|---|
| 정상 케이스 | ... | ... | unit |
| 경계값 | ... | ... | unit |
| 에러 케이스 | ... | ... | unit |
```

**Labels**: `test`, `type:test`
**Branch prefix**: `test/`

---

#### 🔧 Chore (유지보수)

```markdown
## 작업 내용
<!-- 무엇을 변경하는가 -->

## 변경 이유
<!-- 왜 필요한가: 보안 패치, 버전 업, CI 개선 등 -->

## 변경 계획
- [ ] [작업 항목 1]
- [ ] [작업 항목 2]

## 영향 범위
- **서비스 중단 여부**: Yes / No
- **하위 호환성**: 유지 / 깨짐
- **팀 공유 필요 사항**:
```

**Labels**: `chore`, `type:chore`
**Branch prefix**: `chore/`

---

### Step 3: Create Issue

#### Owner/Repo Detection

Read the `owner` and `repo` from the current project's git remote URL. Never hardcode these values.

#### Single Issue Creation

Create an issue on GitHub:

- **title**: `[<type>] <concise title>`
- **body**: Content filled according to the template
- **labels**: Labels matching the type
- **assignees**: Only if specified by the user

#### Post-creation (Optional)

- If there is additional implementation context, add a comment to the issue
- If the user requests it, create a working branch (apply the type-specific branch prefix)

---

### Step 4: Split Large Plans (Epic)

If the plan contains 3 or more independent work units, split it into an Epic + sub-issues.

1. **Create Epic (parent issue)**
   - Title: `[epic] <overall goal>`
   - Body: Overall summary + sub-issue checklist placeholder
   - Labels: `epic`

2. **Create each sub-issue**
   - Apply the type-specific template to each issue
   - Add `Parent: #<epic-number>` at the top of the body

3. **Update Epic body** — Link created sub-issue numbers as a checklist:
   ```markdown
   ## Sub-issues
   - [ ] #101 DB schema design (feature)
   - [ ] #102 API endpoint implementation (feature)
   - [ ] #103 Refactor existing auth logic (refactor)
   - [ ] #104 Write integration tests (test)
   ```

4. **Add summary comment to Epic**: `Sub-issues created: #101, #102, #103, #104`

---

## Notes

- **Owner/repo detection**: Automatically read from the git remote URL. Never hardcode.
- **Label validation**: GitHub may auto-create labels in some cases. If it fails, notify the user.
- **Unclear input**: Always confirm with the user before proceeding.
- **Rate limits**: Be mindful of API rate limits when creating 5 or more sub-issues.