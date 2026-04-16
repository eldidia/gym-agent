---
name: brainstorming
description: Use when starting any new feature, project, or significant change - requires designing before implementing. Do NOT invoke any implementation skill or write any code until you have presented a design and the user has approved it.
---

# Brainstorming

## Overview

Design before implementation. Always.

**Hard gate:** Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it.

This applies universally, even to seemingly simple projects.

## Process Checklist

1. Explore project context through files and documentation
2. Offer visual companion tool if needed (as a separate message)
3. Ask clarifying questions one at a time
4. Propose 2-3 approaches with trade-offs
5. Present design in appropriately-scaled sections
6. Create written design document
7. Self-review the spec for completeness
8. Get user approval on written spec
9. Invoke the writing-plans skill to begin implementation

## Key Practices

- **One question per message** — avoid overwhelming users
- **Multiple choice preferred** over open-ended questions when possible
- **Scope assessment upfront**: Flag oversized projects requiring decomposition
- **Design isolation**: Break systems into focused units with clear boundaries and interfaces
- **Existing codebase patterns**: Follow established conventions and incorporate targeted improvements

## After Design Approval

Save the spec to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, commit to git, then invoke writing-plans as the only next skill.

## What NOT to Do

- Do not start coding before design approval
- Do not assume requirements — ask
- Do not propose a single option — give 2-3 with trade-offs
- Do not skip the written spec step
