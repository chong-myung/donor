# Classification Rules

유형 감지, 크기/우선순위 추정, 에러 처리 규칙을 정의한다.
SKILL.md Step 2, 4, 7에서 참조한다.

---

## 1. 유형 감지 키워드

Plan 내용을 읽고 아래 키워드로 유형을 분류한다.

| Type | Detection Keywords / Patterns |
|---|---|
| `feature` | 새 기능, 추가, 구현, 도입, new, implement, add, introduce, create |
| `bugfix` | 버그, 오류, 수정, fix, crash, error, broken, failing, regression |
| `refactor` | 리팩토링, 개선, 정리, 구조 변경, 성능, optimize, restructure, clean up, migrate |
| `docs` | 문서화, README, API docs, 주석, documentation, comments, guide |
| `test` | 테스트, 커버리지, E2E, unit test, coverage, spec, assertion |
| `chore` | 의존성, CI/CD, 빌드, 설정, dependency, build, config, upgrade, bump |

### 애매한 경우 처리

Plan이 여러 유형에 매칭되거나 어느 유형에도 명확히 해당하지 않으면 사용자에게 확인한다:

> "이 plan은 feature와 refactor 모두에 해당할 수 있습니다. 어떤 유형으로 등록할까요?"

---

## 2. 크기 추정 규칙 (Size Labels)

Plan의 구현 단계/Phase 수를 기준으로 추정한다. 레포지토리에서 size 라벨을 사용하는 경우에만 적용한다.

| Size | 조건 |
|---|---|
| `size:S` | 1-2 steps |
| `size:M` | 3-5 steps |
| `size:L` | 6+ steps 또는 multi-module |

---

## 3. 우선순위 추정 규칙 (Priority Labels)

Plan 내 긴급도 키워드를 기준으로 추정한다.

| Priority | Detection Keywords |
|---|---|
| `priority:critical` | 긴급, urgent, ASAP |
| `priority:high` | 중요, important |
| `priority:medium` | (default — 명시적 키워드 없음) |

---

## 4. 에러 처리 규칙

이슈 생성 MCP 호출 실패 시 아래 표에 따라 대응한다.

| Error | Cause | Resolution |
|---|---|---|
| `404 Not Found` | Wrong owner/repo or no access | Verify repo URL and MCP authentication |
| `422 Validation Failed` | Invalid label or assignee | Create missing labels first, or remove invalid values and retry |
| `403 Forbidden` | Insufficient permissions | Inform user to check their GitHub token scope |
| `Rate limit exceeded` | Too many API calls | Wait and retry, or inform the user |

### 안내 메시지 형식

오류 발생 시 **절대 무시하지 않고** 아래 형식으로 보고한다:

> "⚠️ 이슈 생성 중 오류가 발생했습니다: [error]. [suggested fix]"
