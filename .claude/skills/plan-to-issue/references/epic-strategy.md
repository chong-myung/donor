# Epic Decomposition Strategy

대규모 플랜의 Epic + 하위 이슈 분해 전략을 정의한다.
SKILL.md Step 9에서 참조한다.

---

## 1. Epic 감지 기준

아래 조건 중 하나 이상에 해당하면 Epic으로 분해한다:

- Plan에 **3개 이상의 독립적인 작업 단위**가 존재
- **여러 유형**이 감지됨 (예: feature + refactor + test)
- Plan에 "단계별", "phase", "milestone" 등의 표현이 명시적으로 포함

---

## 2. 분해 워크플로우

### Step 1: Epic (부모 이슈) 생성

```
Tool:  mcp__github__issue_write
Params:
  method: "create"
  owner:  "<owner>"
  repo:   "<repo>"
  title:  "[epic] <overall goal>"
  body:   "<overall summary + placeholder checklist>"
  labels: ["epic"]
```

### Step 2: 하위 이슈 생성 (의존 순서대로)

각 하위 이슈에 해당 유형의 템플릿(`references/issue-templates.md`)을 적용한다.
각 하위 이슈 본문 상단에 아래를 추가한다:

```markdown
> 🔗 Parent Epic: #<epic-number>
> 📌 Depends on: #<dependency-issue-number> (if applicable)
```

### Step 3: Epic 본문 업데이트

하위 이슈 생성 후 Epic 본문을 업데이트한다.

```
Tool:  mcp__github__issue_write
Params:
  method:       "update"
  owner:        "<owner>"
  repo:         "<repo>"
  issue_number: <epic-number>
  body:         "<updated body with sub-issue checklist>"
```

### Step 4: Epic에 요약 코멘트 작성

```
Tool:  mcp__github__add_issue_comment
Params:
  owner:        "<owner>"
  repo:         "<repo>"
  issue_number: <epic-number>
  body:         "📋 Sub-issues created: #101, #102, #103, #104\n\nSuggested order: #101 → #102 → #104 (parallel: #103)"
```

---

## 3. Epic 본문 업데이트 템플릿

하위 이슈 생성 완료 후 Epic 본문에 아래 형식을 적용한다.

```markdown
## 개요
<전체 목표 설명>

## 하위 이슈

| # | 이슈 | 유형 | 의존성 | 크기 |
|---|---|---|---|---|
| 1 | #101 DB 스키마 설계 | feature | - | S |
| 2 | #102 API 엔드포인트 구현 | feature | #101 | M |
| 3 | #103 기존 인증 로직 리팩토링 | refactor | - | M |
| 4 | #104 통합 테스트 작성 | test | #101, #102 | S |

## 진행 상황
- [ ] #101 DB 스키마 설계
- [ ] #102 API 엔드포인트 구현
- [ ] #103 기존 인증 로직 리팩토링
- [ ] #104 통합 테스트 작성
```
