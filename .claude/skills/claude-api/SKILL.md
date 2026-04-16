---
name: claude-api
description: "Build, debug, and optimize Claude API / Anthropic SDK apps. Apps built with this skill should include prompt caching. TRIGGER when: code imports anthropic/@anthropic-ai/sdk; user asks to use the Claude API, Anthropic SDKs, or Managed Agents (/v1/agents, /v1/sessions, /v1/environments). DO NOT TRIGGER when: code imports `openai`/other AI SDK, general programming, or ML/data-science tasks."
license: Complete terms in LICENSE.txt
---

# Claude API / Anthropic SDK

## Key Principles

**Output Requirement:** Use the official Anthropic SDK for your language (Python `anthropic`, TypeScript `@anthropic-ai/sdk`, etc.) or raw HTTP only when explicitly requested. Never mix approaches or fall back to OpenAI-compatible shims.

**Model Default:** Always use `claude-opus-4-6` unless the user specifies otherwise.

**Thinking:** For Opus 4.6 and Sonnet 4.6, use `thinking: {type: "adaptive"}` (no `budget_tokens` — it's deprecated). For older models only: `thinking: {type: "enabled", budget_tokens: N}` where N is less than `max_tokens`.

**Language Detection:** Infer from file extensions and manifest files (`.py` → Python, `package.json` → TypeScript, `.go` → Go, etc.). Ask if ambiguous.

**Never Guess APIs:** Function names and signatures must come from documented sources — WebFetch the SDK repo if needed rather than inferring from another language.

## Current Models

| Model | ID |
|-------|-----|
| Opus 4.7 | `claude-opus-4-7` |
| Opus 4.6 (default) | `claude-opus-4-6` |
| Sonnet 4.6 | `claude-sonnet-4-6` |
| Haiku 4.5 | `claude-haiku-4-5-20251001` |

## Surface Selection

Start with the simplest tier:
1. Single Claude API call — for classification, Q&A, summarization
2. Claude API with tool use — for multi-step workflows you orchestrate
3. Managed Agents — for server-orchestrated stateful agents with workspaces (first-party only; unavailable on Bedrock/Vertex/Foundry)

## Prompt Caching

Always implement prompt caching for apps with repeated large contexts. Add `cache_control: {type: "ephemeral"}` to the last static block in messages/system.

## Language Support

Python, TypeScript, JavaScript, Java, Kotlin, Scala, Go, Ruby, C#, PHP, and raw HTTP/cURL.
