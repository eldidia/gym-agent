---
name: slack-gif-creator
description: Knowledge and utilities for creating animated GIFs optimized for Slack. Provides constraints, validation tools, and animation concepts. Use when users request animated GIFs for Slack like "make me a GIF of X doing Y for Slack."
license: Complete terms in LICENSE.txt
---

# Slack GIF Creator

A toolkit providing utilities and knowledge for creating animated GIFs optimized for Slack.

## Slack Requirements

**Dimensions:**
- Emoji GIFs: 128x128 (recommended)
- Message GIFs: 480x480

**Parameters:**
- FPS: 10-30 (lower is smaller file size)
- Colors: 48-128 (fewer = smaller file size)
- Duration: Keep under 3 seconds for emoji GIFs

## Core Workflow

```python
from core.gif_builder import GIFBuilder
from PIL import Image, ImageDraw

# 1. Create builder
builder = GIFBuilder(width=128, height=128, fps=10)

# 2. Generate frames
for i in range(12):
    frame = Image.new('RGB', (128, 128), (240, 248, 255))
    draw = ImageDraw.Draw(frame)

    # Draw your animation using PIL primitives
    # (circles, polygons, lines, etc.)

    builder.add_frame(frame)

# 3. Save with optimization
builder.save('output.gif', num_colors=48, optimize_for_emoji=True)
```

## Drawing Graphics

### Working with User-Uploaded Images
If a user uploads an image, consider whether they want to:
- **Use it directly** (e.g., "animate this", "split this into frames")
- **Use it as inspiration** (e.g., "make something like this")

Load and work with images using PIL:
```python
from PIL import Image

uploaded = Image.open('file.png')
# Use directly, or just as reference for colors/style
```

### Drawing from Scratch
When drawing graphics from scratch, use PIL ImageDraw primitives:

```python
from PIL import ImageDraw

draw = ImageDraw.Draw(frame)

# Circles/ovals
draw.ellipse([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)

# Stars, triangles, any polygon
points = [(x1, y1), (x2, y2), (x3, y3), ...]
draw.polygon(points, fill=(r, g, b), outline=(r, g, b), width=3)

# Lines
draw.line([(x1, y1), (x2, y2)], fill=(r, g, b), width=5)

# Rectangles
draw.rectangle([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)
```

**Don't use:** Emoji fonts (unreliable across platforms) or assume pre-packaged graphics exist in this skill.

### Making Graphics Look Good

- **Use thicker lines** - Always set `width=2` or higher for outlines. Thin lines look choppy.
- **Add visual depth** - Use gradients for backgrounds, layer multiple shapes
- **Make shapes interesting** - Add highlights, rings, or patterns; combine multiple shapes
- **Pay attention to colors** - Use vibrant, complementary colors with good contrast

## Available Utilities

### GIFBuilder (`core.gif_builder`)
```python
builder = GIFBuilder(width=128, height=128, fps=10)
builder.add_frame(frame)  # Add PIL Image
builder.add_frames(frames)  # Add list of frames
builder.save('out.gif', num_colors=48, optimize_for_emoji=True, remove_duplicates=True)
```

### Validators (`core.validators`)
```python
from core.validators import validate_gif, is_slack_ready

passes, info = validate_gif('my.gif', is_emoji=True, verbose=True)
if is_slack_ready('my.gif'):
    print("Ready!")
```

### Easing Functions (`core.easing`)
```python
from core.easing import interpolate

t = i / (num_frames - 1)
y = interpolate(start=0, end=400, t=t, easing='ease_out')

# Available: linear, ease_in, ease_out, ease_in_out,
#           bounce_out, elastic_out, back_out
```

### Frame Helpers (`core.frame_composer`)
```python
from core.frame_composer import (
    create_blank_frame,
    create_gradient_background,
    draw_circle,
    draw_text,
    draw_star
)
```

## Animation Concepts

- **Shake/Vibrate**: Offset position with `math.sin()` oscillation
- **Pulse/Heartbeat**: Scale size with `math.sin(t * frequency * 2 * math.pi)`
- **Bounce**: Use `easing='bounce_out'` for landing, `easing='ease_in'` for falling
- **Spin/Rotate**: `image.rotate(angle, resample=Image.BICUBIC)` or sine wave for wobble
- **Fade**: Adjust alpha channel or use `Image.blend(image1, image2, alpha)`
- **Slide**: Move from off-screen using `easing='ease_out'`
- **Particle Burst**: Generate particles with random angles/velocities, update positions each frame

## Optimization Strategies

Only when asked to make the file size smaller:

1. Fewer frames — Lower FPS (10 instead of 20) or shorter duration
2. Fewer colors — `num_colors=48` instead of 128
3. Smaller dimensions — 128x128 instead of 480x480
4. Remove duplicates — `remove_duplicates=True` in save()
5. Emoji mode — `optimize_for_emoji=True` auto-optimizes

## Dependencies

```bash
pip install pillow imageio numpy
```
