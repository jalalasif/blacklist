#!/usr/bin/env python3
"""Generate iconset PNGs for the Mac app."""
import sys, os, struct, zlib

SIZES = [16, 32, 64, 128, 256, 512, 1024]
output_dir = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(output_dir, exist_ok=True)

try:
    from PIL import Image, ImageDraw, ImageFont

    for sz in SIZES:
        img = Image.new("RGB", (sz, sz), (255, 255, 255))
        d = ImageDraw.Draw(img)
        # Black circle
        pad = sz // 8
        d.ellipse([pad, pad, sz - pad, sz - pad], fill=(0, 0, 0))
        # "B&W" in white
        font_size = max(6, sz // 4)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except Exception:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
            except Exception:
                font = ImageFont.load_default()
        text = "B&W"
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((sz - tw) // 2, (sz - th) // 2), text, fill=(255, 255, 255), font=font)
        img.save(os.path.join(output_dir, f"icon_{sz}x{sz}.png"))
        if sz <= 512:
            img.save(os.path.join(output_dir, f"icon_{sz}x{sz}@2x.png"))

    print(f"Icons written to {output_dir}")

except ImportError:
    # Pure-Python PNG fallback (plain black circle approximated as solid black)
    def write_black_png(path, w, h):
        def chunk(ctype, data):
            crc = zlib.crc32(ctype + data) & 0xFFFFFFFF
            return struct.pack(">I", len(data)) + ctype + data + struct.pack(">I", crc)

        # RGB scanlines: black pixel = \x00\x00\x00, filter byte = \x00
        row = b"\x00" + b"\x00\x00\x00" * w
        raw = row * h
        compressed = zlib.compress(raw)
        sig = b"\x89PNG\r\n\x1a\n"
        ihdr_data = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
        png = (
            sig
            + chunk(b"IHDR", ihdr_data)
            + chunk(b"IDAT", compressed)
            + chunk(b"IEND", b"")
        )
        with open(path, "wb") as f:
            f.write(png)

    for sz in SIZES:
        write_black_png(os.path.join(output_dir, f"icon_{sz}x{sz}.png"), sz, sz)
        if sz <= 512:
            write_black_png(os.path.join(output_dir, f"icon_{sz}x{sz}@2x.png"), sz, sz)
    print(f"Icons (fallback) written to {output_dir}")
