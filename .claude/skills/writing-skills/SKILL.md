---
name: writing-skills
description: Use when creating new skills or editing existing skills - skill creation follows TDD principles, no skill deploys without watching an agent fail without it first
---

# Writing Skills

## Overview

Skill creation follows Test-Driven Development principles applied to documentation.

**The Iron Law:** No skill deploys without a failing test first.

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

## TDD for Skills

| TDD Phase | Skills Equivalent |
|-----------|------------------|
| RED | Run baseline scenarios without the skill; document agent violations |
| GREEN | Write minimal skill addressing those specific failures |
| REFACTOR | Close loopholes discovered during testing |

## SKILL.md Structure

```yaml
---
name: skill-name  # letters, numbers, hyphens only
description: Use when...  # max 1024 chars, triggering conditions only
---

# Skill Name

## Overview
Core principle in 1-2 sentences.

## Content
Organized by relevance: quick reference tables, then details.
```

## Description Rules

The description field is critical for discoverability.

**DO:** Describe the problem and triggering conditions
**DON'T:** Summarize the workflow (Claude will skip the body)

**Format:** Start with "Use when..." covering ONLY when to invoke, never the workflow.

> "Descriptions that summarize workflow create a shortcut Claude will take. The skill body becomes documentation Claude skips."

## Testing Methodology

Different skill types require different testing:

| Skill Type | Test Approach |
|-----------|---------------|
| Discipline (TDD, verification) | Test compliance under maximum pressure |
| Technique | Test correct application to new scenarios |
| Pattern | Test recognition and appropriate use |
| Reference | Test information retrieval and application |

## Deployment Checklist

All three phases must complete for each skill:
- [ ] Document baseline failures (RED)
- [ ] Write skill addressing those failures (GREEN)
- [ ] Identify and plug new rationalizations (REFACTOR)

This applies to new skills AND any edits to existing ones — no exceptions.
