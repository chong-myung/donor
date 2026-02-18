---
name: claude-generator
description: "Use this skill whenever the user wants to generate, create, or initialize a CLAUDE.md file for a project. Triggers include: any mention of 'CLAUDE.md', 'claude md', 'project config for Claude Code', or requests to analyze a codebase and produce a configuration file for AI coding agents. Also use when the user wants to update, refresh, or audit an existing CLAUDE.md against the current state of their codebase. Do NOT use for general documentation, README files, or non-Claude-Code configuration."
argument-hint: <generate|update|audit> [path-to-project]
---

# CLAUDE.md Generator

Analyze any codebase and produce a concise, high-quality CLAUDE.md file that gives Claude Code persistent project context.

## Overview

A CLAUDE.md is a markdown file that Claude Code reads at the start of every session. It provides project-specific instructions — tech stack, folder structure, commands, conventions, and rules — so the developer doesn't have to repeat themselves.

Every word in CLAUDE.md consumes context tokens. The goal is **maximum signal in minimum space**.

## Quick Reference

| Task                      | Action                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Generate new CLAUDE.md    | Analyze codebase → produce file following Output Structure         |
| Update existing CLAUDE.md | Diff against codebase → prune stale, add new                       |
| Audit CLAUDE.md           | Compare instructions vs actual code patterns → flag contradictions |

---

## Workflow: Generate New CLAUDE.md

### Step 1 — Gather Context

Scan the project to collect raw facts. Do NOT write the file yet.

```
1. Read package.json / Cargo.toml / pyproject.toml / go.mod (or equivalent)
   → Extract: language, framework, key dependencies, scripts/commands
2. List top-level directories (ignore node_modules, .git, dist, build, __pycache__)
   → Note the purpose of each from filenames and contents
3. Check for linter/formatter configs (.eslintrc, .prettierrc, ruff.toml, biome.json, .editorconfig)
   → If present, note them. Do NOT duplicate their rules in the output.
4. Sample 3-5 source files across different directories
   → Observe: naming conventions, import style, error handling, type usage
5. Read git log --oneline -20 (if available)
   → Observe: branch naming, commit message format
6. Check for CI config (.github/workflows, .gitlab-ci.yml, Jenkinsfile)
   → Extract: test/build/deploy commands
7. Check for existing docs (README.md, CONTRIBUTING.md, docs/)
   → Note locations to link to, do NOT duplicate content
```

### Step 2 — Write the CLAUDE.md

Use the Output Structure below. Apply these rules strictly:

**DO:**

- Keep the total file under 80 lines
- Use 1-line bullet points
- Only document what the code actually does (observation-based)
- Mention linter/formatter configs by name so Claude knows they exist
- Include commands that actually exist in the project
- Add IMPORTANT warnings for things that can break the build or cause data loss

**DO NOT:**

- Include generic programming advice Claude already knows
- Duplicate rules already enforced by linters/formatters
- Invent conventions not observed in the code
- Add explanatory paragraphs — every line should be actionable
- Include obvious directory descriptions (e.g., "node_modules contains dependencies")

### Step 3 — Validate

After writing, verify:

- [ ] Every command listed actually exists and works
- [ ] Every directory listed actually exists
- [ ] No coding standard contradicts existing linter config
- [ ] File is under 80 lines
- [ ] No generic filler content

---

## Output Structure

The generated CLAUDE.md must follow this exact structure:

```markdown
# Project: {project-name}

{One-line description: framework + purpose}

## Tech Stack

- {Language} {version}
- {Framework} {version} ({variant if applicable, e.g., App Router})
- {Database / ORM}
- {Key libraries that affect how code is written}
- Linting/Formatting: {config file names}

## Project Structure

- `/{dir}`: {purpose}
- `/{dir}`: {purpose}
- ...

## Commands

- `{command}`: {what it does}
- `{command}`: {what it does}
- ...

## Coding Standards

- {Observed naming convention for files}
- {Observed naming convention for functions/components}
- {Import style: named vs default, aliases}
- {Error handling pattern}
- {Type usage: strict, any, generics, etc.}
- See `{linter-config}` for formatting rules

## Workflow Rules

- Branch naming: `{pattern}` (if observable)
- Commit format: `{pattern}` (if observable)
- {Environment setup steps}
- IMPORTANT: {critical warnings — files not to touch, secrets, etc.}
```

---

## Workflow: Update Existing CLAUDE.md

When a CLAUDE.md already exists:

1. Read the current CLAUDE.md
2. Re-run Step 1 (Gather Context) from the Generate workflow
3. Compare each section:
   - **Remove** instructions that no longer match the code
   - **Add** new patterns, commands, or conventions that have emerged
   - **Flag** anything that contradicts actual code behavior
4. Keep the same structure — do not reorganize unless the user asks
5. Ensure the result stays under 80 lines

---

## Workflow: Audit Existing CLAUDE.md

When the user wants to check if their CLAUDE.md is still accurate:

1. Read the current CLAUDE.md
2. For each instruction, verify it against the codebase:
   - Does the command still exist?
   - Does the directory still exist?
   - Does the coding standard match what the code actually does?
3. Output a report:
   - ✅ Verified: {instruction}
   - ❌ Outdated: {instruction} — {what changed}
   - ⚠️ Conflict: {instruction} — {contradicts X}
4. Offer to apply fixes automatically

---

## Key Principles

| Principle                  | Rationale                                                            |
| -------------------------- | -------------------------------------------------------------------- |
| **Under 80 lines**         | Longer files degrade Claude's instruction-following uniformly        |
| **Observation-based only** | Invented rules cause confusion when they conflict with actual code   |
| **Delegate to linters**    | Formatting rules in CLAUDE.md waste tokens and conflict with tooling |
| **Actionable lines only**  | Every line should change Claude's behavior; delete the rest          |
| **Progressive disclosure** | Link to detailed docs instead of inlining them                       |

---

## File Hierarchy Reference

Claude Code supports multiple CLAUDE.md locations. When generating, place the file at the project root unless the user specifies otherwise.

| Location                   | Scope               | Use Case                               |
| -------------------------- | ------------------- | -------------------------------------- |
| `~/.claude/CLAUDE.md`      | All projects        | Personal global preferences            |
| `{project-root}/CLAUDE.md` | This project        | Shared team context (commit to Git)    |
| `{subdir}/CLAUDE.md`       | Subdirectory only   | Module-specific overrides              |
| `CLAUDE.local.md`          | This project, local | Personal overrides (add to .gitignore) |

More specific files override less specific ones on conflict.
