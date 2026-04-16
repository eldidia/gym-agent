---
name: subagent-driven-development
description: Use when executing implementation plans with subagents - dispatches fresh agents per task with two-stage review (spec compliance then code quality)
---

# Subagent-Driven Development

## Overview

Execute implementation plans by dispatching specialized subagents for each task within a single session.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

## Process Flow

1. Extract all tasks from the plan with complete context
2. Create a task tracking system
3. For each task:
   - Dispatch an implementer subagent
   - Answer any questions before work begins
   - Conduct spec compliance review
   - Conduct code quality review
   - Mark complete only after both reviews pass
4. Run final review across entire implementation
5. Prepare branch for merging

## Two-Stage Review

Each task requires both reviews to pass before proceeding:

**Stage 1: Spec Compliance**
- Does the implementation match the plan?
- Are all requirements addressed?
- Are the tests written first (TDD)?

**Stage 2: Code Quality**
- Is the code clean and readable?
- Are there unnecessary abstractions?
- Does it follow project conventions?

## Model Selection Strategy

Use the least powerful model for each role:
- Simple, isolated tasks → fast/cheap models
- Multi-file integration work → standard models
- Architecture and review decisions → most capable models

## Critical Rules

- Never skip reviews
- Never ignore open issues
- Never proceed before both approval stages complete
- If subagents request clarification, answer thoroughly before allowing implementation
- Review loops continue until issues resolve completely

## Integration Requirements

This skill requires:
- using-git-worktrees (isolated workspace)
- writing-plans (source document)
- requesting-code-review / receiving-code-review
- test-driven-development methodology
