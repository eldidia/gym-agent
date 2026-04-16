---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

## Overview

Request code reviews early and frequently to prevent issues from compounding.

## When to Review

**Mandatory:**
- After individual tasks in subagent-driven work
- Upon completing significant features
- Before merging to main branch

**Optional but valuable:**
- When facing obstacles
- Before refactoring
- After addressing intricate bugs

## Process

### Step 1: Obtain git references

```bash
BASE_SHA=$(git merge-base HEAD main)
HEAD_SHA=$(git rev-parse HEAD)
```

### Step 2: Dispatch the reviewer

Complete the code-reviewer.md template with:
- Implementation details
- Requirements being addressed
- Commit range (`$BASE_SHA..$HEAD_SHA`)
- Brief description of changes

### Step 3: Address findings

- **Critical issues**: Fix immediately before proceeding
- **Important issues**: Resolve before advancing to next task
- **Minor issues**: Note for later handling
- **Disagreements**: Provide technical reasoning, don't just dismiss

## Critical Guidance

- Never bypass review for "seemingly straightforward" changes
- Never proceed with unresolved critical or important issues
- When disagreeing with feedback, support your position with evidence
- Use receiving-code-review skill when processing feedback
