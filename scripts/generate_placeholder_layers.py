#!/usr/bin/env python3
"""Generate placeholder rig layers + rig JSON for the 7 animal musicians.

Base layer = the real flat illustration (keeps the original 2D look).
Overlay layers = semi-transparent colored blocks marking where a moving
limb roughly sits, each with a pivot dot. These are stand-ins only, meant
to validate rig/animation logic before real cutout art (see docs/ASSET_GUIDE.md)
replaces them part-by-part.
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(os.path.dirname(ROOT), "图片")
LAYERS_DIR = os.path.join(ROOT, "assets", "layers")
RIGS_DIR = os.path.join(ROOT, "assets", "rigs")
CANVAS = 900  # target square size for all rigs

# id, source filename, instrument label, list of parts
# part: (id, cx, cy, w, h, pivot_x, pivot_y, color, z)
ANIMALS = {
    "hippo": {
        "src": "Weixin Image_20260702125932_17_868.jpg",
        "label": "河马 · 贝斯",
        "parts": [
            ("strumHand", 0.66, 0.60, 0.30, 0.28, 0.66, 0.46, (255, 99, 71), 3),
            ("head", 0.5, 0.18, 0.55, 0.34, 0.5, 0.34, (255, 214, 99), 2),
        ],
    },
    "bear": {
        "src": "Weixin Image_20260702125957_22_868.jpg",
        "label": "熊 · 军鼓",
        "parts": [
            ("stickL", 0.32, 0.40, 0.26, 0.32, 0.34, 0.30, (255, 99, 71), 3),
            ("stickR", 0.68, 0.40, 0.26, 0.32, 0.66, 0.30, (99, 179, 255), 3),
            ("head", 0.5, 0.16, 0.50, 0.30, 0.5, 0.31, (255, 214, 99), 2),
        ],
    },
    "parrot": {
        "src": "Weixin Image_20260702125951_21_868.jpg",
        "label": "鹦鹉 · 麦克风",
        "parts": [
            ("beak", 0.46, 0.28, 0.20, 0.16, 0.40, 0.28, (255, 99, 71), 3),
            ("micWing", 0.74, 0.38, 0.22, 0.24, 0.66, 0.30, (99, 179, 255), 3),
            ("head", 0.42, 0.22, 0.40, 0.32, 0.45, 0.42, (255, 214, 99), 2),
        ],
    },
    "monkey": {
        "src": "Weixin Image_20260702125928_16_868.jpg",
        "label": "猴子 · 电吉他",
        "parts": [
            ("strumArm", 0.68, 0.55, 0.26, 0.26, 0.64, 0.42, (255, 99, 71), 3),
            ("head", 0.5, 0.16, 0.42, 0.30, 0.5, 0.31, (255, 214, 99), 2),
        ],
    },
    "owl": {
        "src": "Weixin Image_20260702131744_29_868.jpg",
        "label": "猫头鹰 · 鼓机",
        "parts": [
            ("fingerL", 0.36, 0.78, 0.16, 0.16, 0.36, 0.68, (255, 99, 71), 3),
            ("fingerR", 0.60, 0.78, 0.16, 0.16, 0.60, 0.68, (99, 179, 255), 3),
            ("head", 0.5, 0.28, 0.48, 0.36, 0.5, 0.56, (255, 214, 99), 2),
        ],
    },
    "cat": {
        "src": "Weixin Image_20260702125944_20_868.jpg",
        "label": "猫 · 电子琴",
        "parts": [
            ("handL", 0.37, 0.53, 0.20, 0.16, 0.37, 0.46, (255, 99, 71), 3),
            ("handR", 0.63, 0.53, 0.20, 0.16, 0.63, 0.46, (99, 179, 255), 3),
            ("tail", 0.28, 0.82, 0.16, 0.26, 0.35, 0.78, (150, 220, 140), 1),
            ("head", 0.5, 0.20, 0.42, 0.30, 0.5, 0.35, (255, 214, 99), 2),
        ],
    },
    "rabbit": {
        "src": "Weixin Image_20260702130004_23_868.jpg",
        "label": "兔子 · 小提琴",
        "parts": [
            ("bowArm", 0.76, 0.50, 0.24, 0.28, 0.68, 0.34, (255, 99, 71), 3),
            ("head", 0.46, 0.28, 0.40, 0.30, 0.5, 0.46, (255, 214, 99), 2),
        ],
    },
}


def load_font(size):
    for name in ("PingFang.ttc", "Arial Unicode.ttf", "Helvetica.ttc"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_base(animal_id, src_name):
    src_path = os.path.join(SRC_DIR, src_name)
    img = Image.open(src_path).convert("RGBA")
    img = img.resize((CANVAS, CANVAS), Image.LANCZOS)
    out_dir = os.path.join(LAYERS_DIR, animal_id)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "base.png")
    img.save(out_path)
    return "base.png"


def make_part(animal_id, part, font):
    part_id, cx, cy, w, h, px, py, color, z = part
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    x0, y0 = (cx - w / 2) * CANVAS, (cy - h / 2) * CANVAS
    x1, y1 = (cx + w / 2) * CANVAS, (cy + h / 2) * CANVAS
    fill = color + (110,)
    outline = color + (230,)
    radius = min(x1 - x0, y1 - y0) * 0.18
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=4)

    label = part_id
    tw = draw.textlength(label, font=font)
    draw.text(((x0 + x1) / 2 - tw / 2, (y0 + y1) / 2 - 8), label, fill=(20, 20, 20, 230), font=font)

    pivot_px, pivot_py = px * CANVAS, py * CANVAS
    r = 7
    draw.ellipse([pivot_px - r, pivot_py - r, pivot_px + r, pivot_py + r], fill=(255, 0, 90, 255), outline=(255, 255, 255, 255), width=2)

    out_dir = os.path.join(LAYERS_DIR, animal_id)
    os.makedirs(out_dir, exist_ok=True)
    fname = f"{part_id}.png"
    canvas.save(os.path.join(out_dir, fname))
    return fname


def build_rig_json(animal_id, data, base_file, part_files):
    layers = [
        {
            "id": "body",
            "src": f"assets/layers/{animal_id}/{base_file}",
            "pivot": [0.5, 0.95],
            "parent": None,
            "z": 0,
        }
    ]
    for (part, fname) in zip(data["parts"], part_files):
        part_id, cx, cy, w, h, px, py, color, z = part
        layers.append(
            {
                "id": part_id,
                "src": f"assets/layers/{animal_id}/{fname}",
                "pivot": [px, py],
                "parent": "body",
                "z": z,
            }
        )
    rig = {
        "id": animal_id,
        "label": data["label"],
        "canvas": {"width": CANVAS, "height": CANVAS},
        "layers": layers,
    }
    os.makedirs(RIGS_DIR, exist_ok=True)
    with open(os.path.join(RIGS_DIR, f"{animal_id}.json"), "w", encoding="utf-8") as f:
        json.dump(rig, f, ensure_ascii=False, indent=2)


def main():
    font = load_font(28)
    for animal_id, data in ANIMALS.items():
        base_file = make_base(animal_id, data["src"])
        part_files = [make_part(animal_id, part, font) for part in data["parts"]]
        build_rig_json(animal_id, data, base_file, part_files)
        print(f"[ok] {animal_id}: base + {len(part_files)} placeholder parts")


if __name__ == "__main__":
    main()
