---
name: writing-plans
description: Use when you have an approved design spec and need to create a detailed implementation plan with step-by-step tasks for a developer to follow
---

# Writing Plans

## Overview

Create comprehensive, task-by-task implementation plans for engineers who may be unfamiliar with the codebase.

## Key Principles

- **Bite-sized tasks**: Each step takes 2–5 minutes and follows TDD
- **Complete code**: No placeholders like "TBD" or "add validation later"
- **Clear file structure**: Map which files are created or modified before writing tasks
- **Frequent commits**: Each task ends with a git commit
- **Exact paths and commands**: Include full file paths, code blocks, and expected test output

## When to Use

Use when you have:
- A specification or requirements document (from brainstorming skill)
- A clear sense of scope (single subsystem per plan)
- A need to hand off implementation to another engineer with minimal context

## Plan Format

Plans are saved to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` and include:

```
# Plan: <Feature Name>

## Goal
[One sentence description]

## Architecture
[How this fits into existing system]

## Tech Stack
[Relevant technologies]

## Files
[Map of files to create/modify]

## Tasks

### Task 1: [Name]
**Files:** src/path/to/file.ts

1. Write failing test:
   ```typescript
   test('...', () => { ... })
   ```
2. Run test: `npm test path/to/test.ts` (expect failure)
3. Implement:
   ```typescript
   // code here
   ```
4. Run test: `npm test path/to/test.ts` (expect pass)
5. Commit: `git commit -m "feat: ..."`

### Task 2: ...
```

## Self-Review Checklist

Before delivering the plan:
- [ ] Each task has a clear name and scope
- [ ] All tasks have failing tests written first
- [ ] No placeholders — all code is complete
- [ ] File paths are exact and consistent
- [ ] Each task ends with a git commit
- [ ] Tasks are in correct dependency order
