---
name: algorithmic-art
description: Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations.
license: Complete terms in LICENSE.txt
---

# Algorithmic Art Creation

## Overview

This skill establishes a structured process for generating computational art through three core phases:

1. **Algorithmic Philosophy** - Develop a conceptual framework describing the generative aesthetic as mathematical and computational principles
2. **Conceptual Deduction** - Identify subtle thematic threads that inform parameter choices and emergent behaviors
3. **p5.js Implementation** - Express the philosophy through self-contained interactive HTML artifacts

## Key Principles

**Process-Centered Design**: Beauty emerges from the algorithm's execution - each run is unique. Emphasize that the final implementation should feel like "the product of deep computational expertise" and "painstaking optimization."

**Parametric Expression**: Systems communicate through mathematical relationships, forces, and behaviors rather than static composition. Parameters emerge naturally from what qualities of the system benefit from adjustment.

**Technical Foundation**: All artifacts use seeded randomness for reproducibility, following the Art Blocks pattern where identical seeds produce identical outputs across runs.

**UI Consistency**: Start from `templates/viewer.html` as the literal foundation—maintain fixed layout structure, Anthropic branding, seed navigation controls, and action buttons while customizing only the algorithm and parameter controls.

## Fixed UI Elements (maintain from template)

- Sidebar layout and structure
- Anthropic branding (Poppins/Lora fonts, light color scheme, gradient backdrop)
- Seed navigation controls (previous/next/random/jump)
- Action buttons (regenerate/reset/download)

## Variable Elements (create uniquely)

- The p5.js algorithm expressing the specific philosophy
- Parameter objects tailored to the art's needs
- UI controls (sliders, color pickers) matching parameters
- Visual outcome reflecting computational intent
