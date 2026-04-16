---
name: internal-comms
description: A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).
---

# Internal Communications

## Overview

This skill helps craft internal company communications using standardized formats.

## Communication Types

Based on the user's request, identify the communication type and load the matching guideline:

| Type | Reference |
|------|-----------|
| 3P Updates (Progress, Plans, Problems) | `examples/3p-updates.md` |
| Company newsletters | `examples/company-newsletter.md` |
| FAQ responses | `examples/faq-answers.md` |
| Status reports | `examples/general-comms.md` |
| Leadership updates | `examples/general-comms.md` |
| Project updates | `examples/general-comms.md` |
| Incident reports | `examples/general-comms.md` |

## Process

1. Identify the communication type from the user's request
2. Load the matching guideline from the `examples/` directory
3. Follow the specific formatting and tone instructions in that file
4. Draft the communication using the template as a guide

For communications that don't match a specific category, use `examples/general-comms.md` or ask for clarification about the preferred format.
