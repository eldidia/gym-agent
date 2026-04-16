---
name: using-git-worktrees
description: Use when starting development work that needs an isolated environment - creates a git worktree with dependencies installed and baseline tests passing
---

# Using Git Worktrees

## Overview

Create isolated git worktrees for parallel development work without affecting the main working directory.

## Three-Phase Workflow

### Phase 1: Directory Selection

1. Check for existing preferences in CLAUDE.md
2. Choose between:
   - **Project-local**: `./worktrees/<branch-name>/` (inside repo, must be gitignored)
   - **Global**: `~/.config/superpowers/worktrees/<project>/<branch>/` (outside repo)
3. Ask user if preferences unclear

### Phase 2: Safety Verification (project-local only)

Before creating a project-local worktree, verify the target directory is gitignored:

```bash
git check-ignore -v worktrees/
```

If NOT gitignored:
```bash
echo "worktrees/" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore worktrees directory"
```

### Phase 3: Creation with Validation

```bash
# Detect project name
PROJECT=$(basename $(git rev-parse --show-toplevel))

# Create worktree on new branch
git worktree add ./worktrees/feature-name -b feature-name

# Enter worktree
cd ./worktrees/feature-name

# Auto-detect and install dependencies
if [ -f package.json ]; then npm install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f pyproject.toml ]; then pip install -e .; fi
if [ -f go.mod ]; then go mod download; fi

# Run baseline tests to confirm clean starting state
npm test  # or equivalent
```

Report completion with file path and test results.

## Common Pitfalls

- Don't proceed with failing baseline tests without permission
- Don't assume directory locations without verification
- Don't hardcode setup commands — auto-detect project type
- Don't skip gitignore check for project-local worktrees

## Cleanup

When done with a worktree:
```bash
cd ..  # exit the worktree
git worktree remove ./worktrees/feature-name
git branch -d feature-name  # if merged
```
