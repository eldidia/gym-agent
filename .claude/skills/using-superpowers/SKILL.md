---
name: using-superpowers
description: Use before starting any task to check if any skill applies - if there is even a 1% chance a skill applies, invoke it before doing anything else
---

# Using Superpowers

## Overview

Check for applicable skills before taking any action.

**Core principle:** If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

This applies before clarifying questions, exploration, or any response.

## Hierarchy

Priority order (highest to lowest):
1. User's explicit instructions
2. Superpowers skills (override defaults)
3. Default system prompt

User directives always take precedence over skill requirements.

## Workflow

Before responding to any request:

1. Check if any skill might apply to the task
2. If there's even minimal relevance — invoke the skill tool
3. Follow the skill's guidance exactly
4. Create todos for any checklists within the skill

## Skill Types and Priority

**Rigid skills** (TDD, verification, debugging) — demand strict adherence, no exceptions.

**Flexible skills** (brainstorming, patterns) — permit contextual adaptation.

Process skills (brainstorming, debugging) take priority over implementation skills.

## Red Flags Against Rationalization

These thoughts signal avoidance of skill invocation:
- "This is just a simple question"
- "I need context first"
- "The skill is overkill"
- "This is different because..."

When you catch these thoughts: invoke the skill anyway.

## Common Skill Triggers

| Task Type | Check These Skills |
|-----------|-------------------|
| New feature/fix | test-driven-development, brainstorming |
| Debugging | systematic-debugging |
| Completing work | verification-before-completion |
| Multiple failures | dispatching-parallel-agents |
| Getting review feedback | receiving-code-review |
| Creating plans | writing-plans |
| Following plans | executing-plans or subagent-driven-development |
