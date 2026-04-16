---
name: mcp-builder
description: Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).
license: Complete terms in LICENSE.txt
---

# MCP Server Builder

## Overview

This guide provides a comprehensive framework for developing Model Context Protocol servers. "The quality of an MCP server is measured by how well it enables LLMs to accomplish real-world tasks."

## Four-Phase Development Process

### Phase 1: Deep Research and Planning

- Study the MCP specification (access via sitemap at modelcontextprotocol.io)
- Balance comprehensive endpoint coverage with specialized workflow tools
- Use consistent prefixes and action-oriented naming: `github_create_issue`, `github_list_repos`
- **When uncertain, prioritize comprehensive API coverage** to give agents maximum flexibility

**Recommended tech stack:**
- Language: TypeScript (recommended for strong SDK support)
- Transport: Streamable HTTP for remote servers; stdio for local servers
- Data format: Stateless JSON for easier scaling

### Phase 2: Implementation

1. Set up project structure (language-specific)
2. Build shared infrastructure (API clients, authentication, error handling)
3. Implement individual tools with:
   - Input schemas using Zod (TypeScript) or Pydantic (Python)
   - Output schemas with structured content
   - Concise descriptions with parameter guidance
   - Async operations with actionable error messages
   - Pagination support where applicable
   - Tool annotations (readOnly, destructive, idempotent, openWorld hints)

### Phase 3: Review and Testing

- Eliminate code duplication
- Verify consistent error handling
- Ensure complete type coverage
- Validate clear tool descriptions
- Run `npm run build` (TypeScript) or syntax verification (Python)
- Test with MCP Inspector tool

### Phase 4: Create Evaluations

Create 10 evaluation questions testing realistic, complex scenarios:
- **Characteristics**: Independent, read-only, multi-step, realistic, verifiable, stable
- **Format**: XML with question-answer pairs
- **Process**: List tools → explore data → generate questions → verify answers
