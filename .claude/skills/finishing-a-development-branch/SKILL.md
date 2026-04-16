---
name: finishing-a-development-branch
description: Use when development work on a branch is complete - verifies tests, presents merge options, and cleans up worktree
---

# Finishing a Development Branch

## Overview

Structured completion of development work with test verification and cleanup.

## Workflow

### Step 1: Verify Tests Pass

Run the project's full test suite before proceeding.

```bash
npm test  # or equivalent
```

**Stop if tests fail.** Fix issues before continuing.

### Step 2: Determine Base Branch

Identify which branch (typically `main` or `master`) the feature branch split from:

```bash
git merge-base HEAD main
```

### Step 3: Present Four Options

Offer exactly these choices without elaboration:

1. **Merge back to base branch locally**
2. **Push and create a Pull Request**
3. **Keep the branch as-is**
4. **Discard this work**

### Step 4: Execute Choice & Cleanup

| Choice | Action | Cleanup worktree? |
|--------|--------|-------------------|
| Merge locally | `git checkout main && git merge feature-name` | Yes |
| Push/PR | `git push -u origin feature-name` | No (may need later) |
| Keep as-is | Nothing | No |
| Discard | Require typed "discard" confirmation, then delete | Yes |

## Key Constraints

- **Always verify tests before offering options**
- **Require "discard" confirmation** before permanent deletion
- **Don't auto-cleanup** for PR creation or keep-as-is scenarios
