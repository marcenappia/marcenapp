from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'public' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)

for size in (192, 512):
    image = Image.new('RGBA', (size, size), '#2563EB')
    draw = ImageDraw.Draw(image)
    radius = round(size * 0.24)
    draw.rounded_rectangle((round(size * 0.055), round(size * 0.055), round(size * 0.945), round(size * 0.945)), radius=radius, fill='#2563EB')
    left = round(size * 0.22)
    right = round(size * 0.78)
    top = round(size * 0.27)
    bottom = round(size * 0.74)
    stroke = max(4, round(size * 0.13))
    draw.line((left, bottom, left, top, round(size * 0.39), round(size * 0.54), round(size * 0.50), round(size * 0.39), round(size * 0.61), round(size * 0.54), right, top, right, bottom), fill='white', width=stroke, joint='curve')
    image.save(OUT / f'icon-{size}.png', format='PNG', optimize=True)
