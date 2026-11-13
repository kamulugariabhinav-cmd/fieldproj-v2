"""Create raster versions of the existing five-bar VoiceGuard brand mark."""
from pathlib import Path
import requests
from PIL import Image, ImageDraw, ImageFont

ASSETS = Path(__file__).resolve().parent / "assets"


def mark(size):
    image = Image.new("RGB", (size, size), "#10162c")
    draw = ImageDraw.Draw(image)
    scale = size / 64
    draw.rounded_rectangle((scale, scale, size-scale, size-scale), radius=17*scale,
                           fill="#10162c", outline="#00f5ff", width=max(1, round(2*scale)))
    for x, y, height in [(11,24,16),(20,17,30),(29,11,42),(38,20,24),(47,23,18)]:
        draw.rounded_rectangle((x*scale,y*scale,(x+6)*scale,(y+height)*scale),
                               radius=3*scale, fill="#398dff")
    return image


def main():
    for filename, size in [("favicon-32.png",32),("apple-touch-icon.png",180)]:
        mark(size*4).resize((size,size),Image.Resampling.LANCZOS).save(ASSETS / filename)
    image = Image.new("RGB", (1200,630), "#080715")
    image.paste(mark(180), (88,180))
    draw = ImageDraw.Draw(image)
    font_path = "C:/Windows/Fonts/arialbd.ttf"
    draw.text((310,190), "VOICEGUARD", fill="#f6f3ff", font=ImageFont.truetype(font_path,72))
    draw.text((315,285), "Speech deepfake detection", fill="#00f5ff", font=ImageFont.truetype(font_path,32))
    draw.text((315,350), "Record. Compare model scores. Review results.", fill="#aaa3c6", font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",24))
    image.save(ASSETS / "voiceguard-social.png")
    base = "https://cdn.jsdelivr.net/npm/@fontsource-variable/manrope@5.2.8/"
    for remote, local in [("files/manrope-latin-wght-normal.woff2", "manrope-latin.woff2"), ("LICENSE", "Manrope-LICENSE.txt")]:
        response = requests.get(base + remote, timeout=60)
        response.raise_for_status()
        (ASSETS / local).write_bytes(response.content)
    assert (ASSETS / "manrope-latin.woff2").read_bytes().startswith(b"wOF2")


if __name__ == "__main__":
    main()
