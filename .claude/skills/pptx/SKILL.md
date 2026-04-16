---
name: pptx
description: "Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file (even if the extracted content will be used elsewhere, like in an email or summary); editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates, layouts, speaker notes, or comments. Trigger whenever the user mentions \"deck,\" \"slides,\" \"presentation,\" or references a .pptx filename, regardless of what they plan to do with the content afterward. If a .pptx file needs to be opened, created, or touched, use this skill."
license: Proprietary. LICENSE.txt has complete terms
---

# PPTX Skill

## Core Workflows

| Task | Approach |
|------|----------|
| Read/extract content | `python -m markitdown presentation.pptx` |
| Visual inspection | `thumbnail.py` for image previews |
| Edit existing | Unpack → modify → repack (see `editing.md`) |
| Create from scratch | PptxGenJS (see `pptxgenjs.md`) |

## Design Principles

Avoid "boring slides" with plain bullets. Every slide needs imagery, charts, icons, or shapes — never text-only.

**Color strategy**: Select bold, content-informed palettes:
- One dominant color (60-70% visual weight)
- 1-2 supporting tones
- One accent color

**Layout variety**: Mix two-column layouts, icon grids, half-bleed images, and data callouts.

**Typography**: Pair interesting header fonts with clean body fonts; 36-44pt titles, 14-16pt body.

## Quality Assurance

"Assume there are problems. Your job is to find them."

- **Content QA**: Check for missing text, placeholder remnants (`grep -iE "xxxx|lorem|ipsum"`)
- **Visual QA**: Convert slides to images (`pdftoppm -jpeg -r 150`), review for overlaps, overflow, contrast, alignment
- Your first render is almost never correct — always verify visually

## Dependencies

- markitdown — text extraction
- Pillow — image processing
- PptxGenJS — creation from scratch
- LibreOffice — format conversion
- Poppler — PDF/image conversion
