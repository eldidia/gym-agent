---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.
---

# Skill Creator

## Core Workflow

The process follows a structured loop: define intent → draft skill → test with prompts → evaluate results → iterate → optimize triggering.

## Creating Skills

### Capture Intent
Understand:
- What the skill enables Claude to do
- When it should trigger
- Expected output format
- Whether test cases are needed

### SKILL.md Structure
Required YAML frontmatter (name, description) plus markdown instructions. The description acts as the primary triggering mechanism and should be "pushy" about when to use the skill.

## Testing & Evaluation

For each test case, spawn **two parallel runs**:
- One with the skill
- One without (baseline for new skills; previous version for improvements)

Save test cases to `evals/evals.json`. Draft quantitative assertions explaining what each checks. Grade outputs against assertions, aggregate into `benchmark.json`, then launch the eval viewer using `generate_review.py`.

**Critical**: GENERATE THE EVAL VIEWER *BEFORE* evaluating inputs yourself.

## Improving Skills

Focus on **generalizing from feedback** rather than overfitting to examples. Remove unproductive elements, explain the reasoning behind requirements, and bundle repeated helper scripts into `scripts/`.

Iteration loop: apply improvements → rerun all tests in `iteration-<N+1>/` → launch viewer with previous iteration → read feedback → repeat.

## Description Optimization

1. Generate 20 trigger eval queries (mix of should/shouldn't trigger)
2. Review with user
3. Run optimization loop with `run_loop.py`
4. Apply the `best_description` result

## Platform Notes

- **Claude.ai**: No subagents; run tests sequentially, present results inline, skip browser reviewer
- **Claude Code**: Has subagents; use `--static` flag for viewer
- **Updating existing skills**: Preserve original name, edit in writable location
