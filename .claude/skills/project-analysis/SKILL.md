---
name: project-analysis
description: "Reverse-engineer business logic, state transitions, and functional specifications from project source code. Use this skill when the user mentions 'project analysis', 'code reverse engineering', 'extract spec from code', 'state machine analysis',  'AS-IS analysis', 'next-gen migration', 'what does this code do', 'document business rules',  or any request to understand undocumented project systems. This skill treats the source code as the Single Source of Truth when original developers are unavailable or documentation is missing."
---

# project Analysis Skill

Read project code and extract the buried domain knowledge into structured, actionable documents.

## Core Philosophy

This skill is NOT about refactoring. It reads code **as-is** and documents the business rules and behaviors accurately. No judgments on code quality. The only question it answers is: "What does this code actually do?"

Three principles:

- **No guessing**: If a behavior cannot be confirmed from code, mark it `[UNVERIFIED]`
- **Source location required**: Every rule, branch, and state transition must include `FileName.java:lineNumber`
- **Separate dead code**: Clearly distinguish reachable code paths from unreachable dead code

---

## Workflow

### Step 1: Locate and Load SPEC.md

SPEC.md contains project-specific context (tech stack, directory structure, ERD, table definitions, external integrations, glossary, etc.). The skill follows a hierarchical lookup:

**Priority 1 — Package-level SPEC.md**

Check if a SPEC.md exists at the package or module level being analyzed.
For example: `billing-core/SPEC.md`, `order-api/SPEC.md`

Package-level SPECs contain module-scoped details such as:

- Entry points and key classes specific to that module
- Module-specific table schemas and SQL mappers
- Known issues and patch history for that module
- Module-specific glossary and domain terms

**Priority 2 — Project-level SPEC.md**

If no package-level SPEC.md is found, fall back to the project root SPEC.md.
For example: `project-root/SPEC.md`

Project-level SPECs contain cross-cutting information such as:

- Overall tech stack and framework versions
- Full directory structure and module map
- Database ERD and table relationships
- External system integrations
- Project-wide glossary

**Priority 3 — No SPEC.md found**

If neither exists, recommend running the `spec-generator` skill (`/spec-generator`) to auto-generate SPEC.md.
The spec-generator skill scans the project codebase to auto-detect tech stack, directory structure, entry points, DB settings, and external integrations, then generates a complete SPEC.md through interactive Q&A.

If the user declines to run spec-generator, analysis can still begin with minimum information: tech stack + entry point class name.

**Merging behavior**: When both package-level and project-level SPECs exist, load both. Package-level SPEC takes precedence for overlapping information (e.g., if both define a glossary term, the package-level definition wins).

### Step 2: Determine Analysis Type

Classify the user's request into one or more of these three Task types:

| Task                                     | Trigger Keywords                                                              | Core Question                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Business Logic Reverse Engineering**   | "what does this do", "calculation logic", "extract rules", "reverse engineer" | What business rules does this method implement?                                |
| **State Transition Reverse Engineering** | "state", "status", "workflow", "transition", "state machine"                  | How does this entity's state change and through which paths?                   |
| **Functional Specification Extraction**  | "spec", "specification", "next-gen", "AS-IS", "feature list", "migration"     | What features does this module provide and what is the exact behavior of each? |

### Step 3: Code Reading Strategy

Start from the entry point and trace depth-first:

```
Entry point method
  → Called service methods
    → Internal private methods / utilities
    → DAO / Repository methods
      → SQL mappers (MyBatis XML, JPA queries, etc.)
        → Related table structures
  → External API client calls
  → Event publishing / message sending
```

At each level, record:

- **Branch conditions**: For every if/switch/ternary, describe the business decision in natural language
- **Data transformations**: How input values are processed into outputs
- **Side effects**: DB writes, event publishing, logging, external calls
- **Exception handling**: What exceptions are caught and how they are handled

### Step 4: Generate Deliverables

Generate deliverables according to the analysis type. See `references/output-formats.md` for detailed format specifications.

#### Task A: Business Logic Reverse Engineering

1. **Sequence Diagram** (Mermaid `sequenceDiagram`)
   - Define participants at the method-call level
   - Use `alt/opt/loop` for conditional branches
   - Explicitly distinguish DB queries from external API calls

2. **Business Rules Table**
   - Rule ID: `BR-[3-digit sequence]`
   - Each rule includes: condition, action, source location, basis (hardcoded / DB / config file)

#### Task B: State Transition Reverse Engineering

1. **State Transition Diagram** (Mermaid `stateDiagram-v2`)
   - Include trigger condition labels on all transitions
   - Mark abnormal/suspicious transitions with `note` warnings

2. **State Transition Detail Diagram** (Mermaid `stateDiagram-v2` extended)
   - Include transition number (`#N`) in labels for traceability
   - Specify side effects and source locations in `note` blocks per transition

3. **Transition Flowchart** (Mermaid `flowchart LR`)
   - Separate normal flow / cancel-exception flow / side effects into subgraphs
   - Distinguish abnormal transitions with dashed lines + ⚠️ styling

4. **Transition Coverage Analysis** (Markdown)
   - Transitions allowed by code but suspicious from a business perspective
   - Paths lacking validation guards
   - Unreachable states

#### Task C: Functional Specification Extraction

1. **Feature Inventory Table**
   - Feature ID: `FN-[module abbreviation]-[3-digit sequence]`
   - One-line summary and entry point for each feature

2. **Detailed Feature Specification**
   - Overview, pre-conditions, input, process flow, output, exception handling, post-conditions
   - Cross-reference business rules from Task A and state transitions from Task B

---

## Deliverable Authoring Guidelines

### Business Rule Notation

Each rule corresponds to a conditional statement in the code. If a condition is compound, split into separate rules.

| Rule ID | Rule Name          | Condition                 | Action                      | Source            | Basis     |
| ------- | ------------------ | ------------------------- | --------------------------- | ----------------- | --------- |
| BR-001  | Tax-free fee rate  | `orderType == "TAX_FREE"` | `feeRate = 0.02`            | FeePolicy.java:45 | Hardcoded |
| BR-002  | Taxable fee lookup | `orderType == "TAXABLE"`  | `feeRate = T_FEE_RULE.rate` | FeePolicy.java:52 | DB        |

### Marking Uncertainty

When something cannot be confirmed from code alone, use the following formats:

```
[UNVERIFIED] This branch is reachable in code, but whether it occurs in
production requires DB verification. (OrderService.java:128)
```

```
[SUSPECTED DEAD CODE] processprojectOrder() is not called from any code path.
Git blame shows last modification on 2021-03-15. (OrderService.java:340)
```

---

## File Output

Generate analysis deliverables as files:

- Sequence diagrams → `.mermaid` files
- State transition diagrams → `.mermaid` files
- Business rules inventory → `.md` file (table format)
- Functional specifications → `.md` file
- Comprehensive analysis report → `.md` file (consolidates all deliverables)

File naming convention: `[project]-[deliverable-type]-[module].[ext]`
Examples: `oms-sequence-billing.mermaid`, `oms-business-rules-billing.md`, `oms-spec-order.md`

---

## Iterative Analysis

A single pass rarely captures everything. When the user provides additional code or asks follow-up questions, update existing deliverables. Record version and change history at the top of each deliverable.

```markdown
> **Version**: v1.2 | **Last updated**: 2026-02-14
> **Changelog**: Added BR-007~BR-009 in v1.1, reflected refund flow in sequence diagram
```
