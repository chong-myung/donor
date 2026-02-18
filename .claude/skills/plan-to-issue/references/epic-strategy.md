# Epic Decomposition Strategy

Defines the strategy for decomposing large-scale plans into Epics and sub-issues.
Referenced in SKILL.md Step 9.

---

## 1. Epic Detection Criteria

Decompose into an Epic if one or more of the following conditions are met:

- The Plan contains **3 or more independent work units**
- **Multiple types** are detected (e.g., feature + refactor + test)
- The Plan explicitly includes expressions such as "step-by-step", "phase", or "milestone"

---

## 2. Decomposition Workflow

### Step 1: Create Epic (Parent Issue)

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

### Step 2: Create Sub-Issues (in dependency order)

Apply the corresponding type template (`references/issue-templates.md`) to each sub-issue.
Add the following at the top of each sub-issue body:

```markdown
> 🔗 Parent Epic: #<epic-number>
> 📌 Depends on: #<dependency-issue-number> (if applicable)
```

### Step 3: Update Epic Body

Update the Epic body after all sub-issues have been created.

```
Tool:  mcp__github__issue_write
Params:
  method:       "update"
  owner:        "<owner>"
  repo:         "<repo>"
  issue_number: <epic-number>
  body:         "<updated body with sub-issue checklist>"
```

### Step 4: Add Summary Comment to Epic

```
Tool:  mcp__github__add_issue_comment
Params:
  owner:        "<owner>"
  repo:         "<repo>"
  issue_number: <epic-number>
  body:         "📋 Sub-issues created: #101, #102, #103, #104\n\nSuggested order: #101 → #102 → #104 (parallel: #103)"
```

---

## 3. Epic Body Update Template

Apply the format below to the Epic body after all sub-issues have been created.

```markdown
## Overview
<Description of the overall goal>

## Sub-Issues

| # | Issue | Type | Dependencies | Size |
|---|---|---|---|---|
| 1 | #101 DB Schema Design | feature | - | S |
| 2 | #102 API Endpoint Implementation | feature | #101 | M |
| 3 | #103 Refactor Existing Auth Logic | refactor | - | M |
| 4 | #104 Write Integration Tests | test | #101, #102 | S |

## Progress
- [ ] #101 DB Schema Design
- [ ] #102 API Endpoint Implementation
- [ ] #103 Refactor Existing Auth Logic
- [ ] #104 Write Integration Tests
```