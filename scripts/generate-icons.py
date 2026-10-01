"""Render the extension logo to PNG icons. Run: python3 scripts/generate-icons.py"""

from pathlib import Path

from PIL import Image, ImageDraw

CANVAS = 1024  # drawn large, then downscaled for anti-aliasing
SIZES = (16, 32, 48, 128)
OUT_DIR = Path(__file__).resolve().parent.parent / "icons"

BLUE_TOP = (45, 136, 255)
BLUE_BOTTOM = (12, 84, 214)
WHITE = (255, 255, 255)
RED = (240, 40, 73)


def gradient_background() -> Image.Image:
    gradient = Image.new("RGB", (CANVAS, CANVAS))
    draw = ImageDraw.Draw(gradient)
    for y in range(CANVAS):
        t = y / (CANVAS - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(BLUE_TOP, BLUE_BOTTOM))
        draw.line([(0, y), (CANVAS, y)], fill=color)

    mask = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, CANVAS - 1, CANVAS - 1], radius=230, fill=255)

    icon = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    icon.paste(gradient, mask=mask)
    return icon


def draw_feed(draw: ImageDraw.ImageDraw) -> None:
    # Three feed rows: avatar dot + post bar; the last one is short to leave room for the badge.
    rows = ((300, 824), (512, 824), (724, 540))
    for center_y, bar_end in rows:
        draw.ellipse([210, center_y - 58, 326, center_y + 58], fill=WHITE)
        draw.rounded_rectangle([370, center_y - 46, bar_end, center_y + 46], radius=46, fill=WHITE)


def draw_no_chat_badge(draw: ImageDraw.ImageDraw) -> None:
    cx, cy, r = 760, 760, 200
    # Ring in the background colour separates the badge from the feed rows.
    draw.ellipse([cx - r - 34, cy - r - 34, cx + r + 34, cy + r + 34], fill=BLUE_BOTTOM)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=RED)

    draw.ellipse([cx - 110, cy - 95, cx + 110, cy + 75], fill=WHITE)
    draw.polygon([(cx - 70, cy + 40), (cx - 100, cy + 115), (cx - 15, cy + 65)], fill=WHITE)

    draw.line([(cx - 125, cy - 125), (cx + 125, cy + 125)], fill=RED, width=64)


def main() -> None:
    icon = gradient_background()
    draw = ImageDraw.Draw(icon)
    draw_feed(draw)
    draw_no_chat_badge(draw)

    OUT_DIR.mkdir(exist_ok=True)
    for size in SIZES:
        icon.resize((size, size), Image.LANCZOS).save(OUT_DIR / f"icon-{size}.png", optimize=True)
    icon.resize((512, 512), Image.LANCZOS).save(OUT_DIR / "logo-512.png", optimize=True)


if __name__ == "__main__":
    main()
