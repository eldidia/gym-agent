---
name: executing-plans
description: Use when implementing a written development plan - follow tasks sequentially with built-in review checkpoints, stop immediately when hitting blockers
---

# Executing Plans

## Overview

Implement written development plans with structured review checkpoints.

**Core principle:** Stop immediately when encountering blockers. Never proceed with guesses.

## Process Steps

### Step 1: Load and Review

Read the plan file completely. Identify any questions or concerns before proceeding.

### Step 2: Execute Tasks

Work through each task sequentially:
1. Read the task completely before starting
2. Follow TDD as specified in the plan
3. Mark progress as you complete each sub-step
4. Run the specified verifications to confirm completion
5. Commit as specified

### Step 3: Review Checkpoints

After every 3 tasks (or as specified in the plan):
- Request a code review using the requesting-code-review skill
- Address any findings before continuing

### Step 4: Complete Development

After all tasks verified, transition to the finishing-a-development-branch skill.

## Critical Safeguards

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has gaps or contradictions
- Implementation differs significantly from plan

**Do NOT:**
- Guess at missing information
- Skip ahead to later tasks
- Modify the plan without communicating

## When Subagents Are Available

Note: subagent-driven development produces superior results when available on platforms supporting subagents. Use that skill when possible.

## Integration

This skill requires:
- using-git-worktrees (for isolated workspace)
- writing-plans (the source plan document)
- finishing-a-development-branch (to close out work)
