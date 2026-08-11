#!/usr/bin/env python3
"""Generate Bark Break icons — dog head above a small garden gate."""

from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Pillow is required. Install with: pip install pillow") from exc

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "icons"
SIZES = (16, 32, 48, 128)

INK = (24, 50, 74, 255)
CREAM = (255, 246, 232, 255)
CORAL = (239, 106, 91, 255)
MUSTARD = (231, 174, 50, 255)
TEAL = (42, 140, 130, 255)


def draw_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    margin = max(1, size // 16)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=max(2, size // 6),
        fill=CREAM,
        outline=INK,
        width=max(1, size // 24),
    )

    # Gate posts
    post_w = max(2, size // 14)
    gate_top = int(size * 0.55)
    draw.rectangle([int(size * 0.22), gate_top, int(size * 0.22) + post_w, int(size * 0.86)], fill=TEAL, outline=INK)
    draw.rectangle([int(size * 0.72), gate_top, int(size * 0.72) + post_w, int(size * 0.86)], fill=TEAL, outline=INK)
    draw.rectangle([int(size * 0.22), int(size * 0.68), int(size * 0.78), int(size * 0.68) + post_w], fill=TEAL, outline=INK)

    # Dog head
    head_r = size * 0.22
    cx, cy = size / 2, size * 0.38
    draw.ellipse([cx - head_r, cy - head_r, cx + head_r, cy + head_r], fill=MUSTARD, outline=INK, width=max(1, size // 28))

    # Ears
    ear_w, ear_h = size * 0.1, size * 0.16
    draw.ellipse([cx - head_r - ear_w * 0.2, cy - ear_h, cx - head_r + ear_w, cy + ear_h * 0.2], fill=CORAL, outline=INK, width=max(1, size // 32))
    draw.ellipse([cx + head_r - ear_w, cy - ear_h, cx + head_r + ear_w * 0.2, cy + ear_h * 0.2], fill=CORAL, outline=INK, width=max(1, size // 32))

    # Eyes + nose
    eye_r = max(1, int(size * 0.035))
    draw.ellipse([cx - head_r * 0.35 - eye_r, cy - eye_r, cx - head_r * 0.35 + eye_r, cy + eye_r], fill=INK)
    draw.ellipse([cx + head_r * 0.35 - eye_r, cy - eye_r, cx + head_r * 0.35 + eye_r, cy + eye_r], fill=INK)
    nose_r = max(1, int(size * 0.045))
    draw.ellipse([cx - nose_r, cy + head_r * 0.2 - nose_r * 0.5, cx + nose_r, cy + head_r * 0.2 + nose_r * 0.8], fill=INK)

    return image


def main() -> None:
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        icon = draw_icon(size)
        output_path = ICONS_DIR / f"icon-{size}.png"
        icon.save(output_path, format="PNG")
        print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
