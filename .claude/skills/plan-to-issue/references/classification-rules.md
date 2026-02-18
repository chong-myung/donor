# Classification Rules

Defines type detection, size/priority estimation, and error handling rules.
Referenced in SKILL.md Steps 2, 4, and 7.

---

## 1. Type Detection Keywords

Read the Plan content and classify the type based on the keywords below.

| Type | Detection Keywords / Patterns |
|---|---|
| `feature` | new feature, add, implement, introduce, create |
| `bugfix` | bug, error, fix, crash, broken, failing, regression |
| `refactor` | refactoring, improve, clean up, restructure, performance, optimize, migrate |
| `docs` | documentation, README, API docs, comments, guide, annotations |
| `test` | test, coverage, E2E, unit test, spec, assertion |
| `chore` | dependency, CI/CD, build, config, upgrade, bump |

### Handling Ambiguous Cases

If a Plan matches multiple types or does not clearly belong to any type, confirm with the user:

> "This plan could be classified as both feature and refactor. Which type would you like to register it as?"

---

## 2. Size Estimation Rules (Size Labels)

Estimated based on the number of implementation steps/phases in the Plan. Applied only when the repository uses size labels.

| Size | Criteria |
|---|---|
| `size:S` | 1-2 steps |
| `size:M` | 3-5 steps |
| `size:L` | 6+ steps or multi-module |

---

## 3. Priority Estimation Rules (Priority Labels)

Estimated based on urgency keywords within the Plan.

| Priority | Detection Keywords |
|---|---|
| `priority:critical` | urgent, ASAP, emergency |
| `priority:high` | important, high priority |
| `priority:medium` | (default — no explicit keywords) |

---

## 4. Error Handling Rules

Respond according to the table below when an issue creation MCP call fails.

| Error | Cause | Resolution |
|---|---|---|
| `404 Not Found` | Wrong owner/repo or no access | Verify repo URL and MCP authentication |
| `422 Validation Failed` | Invalid label or assignee | Create missing labels first, or remove invalid values and retry |
| `403 Forbidden` | Insufficient permissions | Inform user to check their GitHub token scope |
| `Rate limit exceeded` | Too many API calls | Wait and retry, or inform the user |

### Error Message Format

When an error occurs, **never ignore it** and report using the format below:

> "⚠️ An error occurred while creating the issue: [error]. [suggested fix]"