# Issue Templates

Defines markdown templates, labels, and branch prefixes for each issue type.
Referenced in SKILL.md Step 5.

---

## 1. Feature (New Feature)

### Template

```markdown
## Overview
<!-- 1-2 sentence description of the feature purpose extracted from the plan -->

## User Scenario
- As a [user type], I want to [action] so that [reason]

## Implementation Plan
- [ ] Phase 1: [Foundation work - models/schemas/interfaces]
- [ ] Phase 2: [Core logic implementation]
- [ ] Phase 3: [UI/API integration]
- [ ] Phase 4: [Write tests]

## Technical Decisions
- **Approach**:
- **Libraries Used**:
- **Affected Modules**:

## Expected File Changes
- `src/...`

## Acceptance Criteria
- [ ] [Specific and verifiable condition]
```

### Metadata

- **Labels**: `enhancement`, `type:feature`
- **Branch prefix**: `feat/`

---

## 2. Bugfix (Bug Fix)

### Template

```markdown
## Bug Description
<!-- What is going wrong -->

## Steps to Reproduce
1. ...
2. ...
3. ...

## Actual Behavior
<!-- How it currently behaves -->

## Expected Behavior
<!-- How it should behave when working correctly -->

## Root Cause Analysis
- **Location**: `src/...`
- **Root Cause**:

## Fix Plan
- [ ] [Fix step 1]
- [ ] [Fix step 2]
- [ ] [Add regression test]

## Impact Scope
- **Severity**: Critical / High / Medium / Low
- **Affected Features**:

## Related Logs/Errors
```
Error message or stack trace
```
```

### Metadata

- **Labels**: `bug`, `type:bugfix`
- **Branch prefix**: `fix/`

---

## 3. Refactor (Refactoring)

### Template

```markdown
## Refactoring Purpose
<!-- Why is refactoring needed -->

## Problems with Current Structure
- Problem 1: ...
- Problem 2: ...

## Before → After

### Before: Current structure diagram or code pattern

### After: Target structure diagram or code pattern

## Refactoring Steps
- [ ] Step 1: [Safe preparation - reinforce tests, etc.]
- [ ] Step 2: [Core structural changes]
- [ ] Step 3: [Update dependent code]
- [ ] Step 4: [Cleanup and verification]

## Change Scope
- **Number of changed files**: ~N files
- **Key files**: `src/...`
- **Public API changes**: Yes / No

## Risks & Mitigation Strategy
| Risk | Probability | Mitigation |
|---|---|---|
| Existing tests fail | Medium | Commit incrementally for easy rollback |

## Success Criteria
- [ ] 100% of existing tests pass
- [ ] [Performance/readability/maintainability improvement metrics]
- [ ] No changes to external behavior
```

### Metadata

- **Labels**: `refactor`, `type:refactor`
- **Branch prefix**: `refactor/`

---

## 4. Docs (Documentation)

### Template

```markdown
## Documentation Target
<!-- What is this documentation about -->

## Reason for Documentation
<!-- Why it's needed: new feature, insufficient existing docs, onboarding, etc. -->

## Writing Plan
- [ ] [Documentation item 1]
- [ ] [Documentation item 2]
- [ ] [Add code comments/JSDoc]

## Target Audience
<!-- New developers / API consumers / Operations team, etc. -->

## Changed Files
- `docs/...`
- `README.md`
```

### Metadata

- **Labels**: `documentation`, `type:docs`
- **Branch prefix**: `docs/`

---

## 5. Test (Testing)

### Template

```markdown
## Test Target
<!-- Which module/feature is being tested -->

## Current Coverage Status
- **Current Coverage**: ~N%
- **Target Coverage**: ~N%
- **Uncovered Areas**:

## Test Plan
- [ ] Unit tests: [target]
- [ ] Integration tests: [target]
- [ ] E2E tests: [target]
- [ ] Edge cases: [list]

## Test Case List
| Case | Input | Expected Result | Type |
|---|---|---|---|
| Normal case | ... | ... | unit |
| Boundary value | ... | ... | unit |
| Error case | ... | ... | unit |
```

### Metadata

- **Labels**: `test`, `type:test`
- **Branch prefix**: `test/`

---

## 6. Chore (Maintenance)

### Template

```markdown
## Task Description
<!-- What is being changed -->

## Reason for Change
<!-- Why it's needed: security patch, version upgrade, CI improvement, etc. -->

## Change Plan
- [ ] [Task item 1]
- [ ] [Task item 2]

## Impact Scope
- **Service Downtime**: Yes / No
- **Backward Compatibility**: Maintained / Broken
- **Items Requiring Team Communication**:
```

### Metadata

- **Labels**: `chore`, `type:chore`
- **Branch prefix**: `chore/`