---
name: systematic-debugging
description: Use when debugging any issue, error, or unexpected behavior - requires finding root cause before attempting fixes
---

# Systematic Debugging

## Overview

ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Core principle:** Systematic investigation over trial-and-error. Understanding over rapid patching.

## Four-Phase Process

### Phase 1: Root Cause Investigation

1. Read error messages carefully and completely
2. Reproduce the issue consistently
3. Review recent changes that could be related
4. Gather diagnostic evidence across system components
5. Trace data flow backward to find the source

### Phase 2: Pattern Analysis

1. Locate similar working code in the codebase
2. Compare implementations completely
3. Identify ALL differences between working and broken versions
4. Understand dependencies

### Phase 3: Hypothesis Testing

Use the scientific method:
1. Form a specific, testable hypothesis
2. Test minimally — change ONE variable at a time
3. Verify results before proceeding to next hypothesis

### Phase 4: Implementation

1. Create a failing test case first (follows TDD)
2. Implement a single fix addressing root cause
3. Verify the solution works without breaking other tests

## Critical Safeguard: Three-Strike Rule

If three or more fix attempts fail:
> "Question the architecture...This is NOT a failed hypothesis - this is wrong architecture."

This signals deeper structural problems requiring redesign rather than continued patching. Stop and escalate to your human partner.

## Red Flags Requiring Process Restart

- Proposing solutions before data analysis
- Making multiple simultaneous changes
- Attempting fixes beyond the three-attempt threshold without architectural review
- Guessing without evidence

## Process Benefits

Systematic approaches resolve bugs in 15-30 minutes versus 2-3 hours of trial-and-error, and eliminate cascading issues from symptom fixes.
