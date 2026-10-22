#!/usr/bin/env python3
"""Slice Gemini's all-in-one parts sheet into per-part PNGs, give each a white
collage/sticker outline (matching the bear's die-cut look), and place each onto
the 900x900 rig canvas registered to its body position on the original art.

- The sheet background is a painted grey/white checkerboard (NOT transparency);
  colour-key it out (achromatic & bright => background).
- Bases are the original clean illustrations in ../图片.
- PLACE holds per-part registration (centre x/y and width, as canvas fractions).
  Tune these until each collage piece sits exactly over its limb on the base.
  The opaque white outline hides the original limb underneath, so at rest the
  character reads as a clean paper-collage. Pivots are ignored for now.
"""
import os, sys, json
import numpy as np
import cv2
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_placeholder_layers as base_mod

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(APP, "..", "图片", "Gemini_Generated_Image_5gc9pq5gc9pq5gc9.png")
SRC_DIR = base_mod.SRC_DIR
LAYERS = base_mod.LAYERS_DIR
RIGS = base_mod.RIGS_DIR
CANVAS = base_mod.CANVAS
ANIMALS = base_mod.ANIMALS

BORDER_PX = 12  # white sticker outline width at 900px canvas

# which sheet blob feeds each part: (animal, part, approx blob centroid on sheet)
MAP = [
    ("hippo","strumHand",405,66),("hippo","head",936,77),
    ("bear","stickL",413,231),("bear","stickR",758,232),("bear","head",937,244),
    ("parrot","beak",442,373),("parrot","micWing",790,362),("parrot","head",945,373),
    ("monkey","strumArm",420,509),("monkey","fretHand",596,522),("monkey","legs",767,523),("monkey","head",925,519),
    ("owl","fingerL",439,660),("owl","fingerR",769,651),("owl","head",942,663),
    ("cat","handL",422,794),("cat","handR",593,794),("cat","tail",767,796),("cat","head",936,780),
    ("rabbit","bowArm",414,939),("rabbit","fretHand",593,944),("rabbit","ears",758,941),("rabbit","head",931,951),
]

# per-part registration on the 900 canvas: (centre_x, centre_y, width) as fractions.
# tuned iteratively to overlap the limb on the original illustration.
PLACE = {
    ("hippo","head"):(0.45,0.17,0.42), ("hippo","strumHand"):(0.27,0.65,0.19),
    ("bear","head"):(0.50,0.22,0.42),  ("bear","stickL"):(0.35,0.42,0.22),     ("bear","stickR"):(0.64,0.42,0.22),
    ("parrot","head"):(0.42,0.27,0.34),("parrot","beak"):(0.52,0.34,0.16),     ("parrot","micWing"):(0.72,0.42,0.24),
    ("monkey","head"):(0.50,0.20,0.40),("monkey","strumArm"):(0.64,0.52,0.24), ("monkey","fretHand"):(0.34,0.50,0.18),("monkey","legs"):(0.50,0.82,0.46),
    ("owl","head"):(0.50,0.30,0.46),   ("owl","fingerL"):(0.38,0.72,0.16),     ("owl","fingerR"):(0.60,0.72,0.16),
    ("cat","head"):(0.50,0.27,0.40),   ("cat","handL"):(0.40,0.52,0.18),       ("cat","handR"):(0.60,0.52,0.18),      ("cat","tail"):(0.30,0.80,0.16),
    ("rabbit","head"):(0.46,0.30,0.38),("rabbit","bowArm"):(0.68,0.50,0.24),   ("rabbit","fretHand"):(0.44,0.42,0.18),("rabbit","ears"):(0.50,0.12,0.40),
}


def sheet_foreground():
    img = Image.open(SHEET).convert("RGB")
    a = np.array(img).astype(np.int16)
    mx = a.max(2); mn = a.min(2); chroma = mx - mn
    bg = (chroma <= 14) & (mn >= 185)
    fg = (~bg).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    return np.array(img), fg, labels_of(fg)


def labels_of(fg):
    n, labels, stats, cent = cv2.connectedComponentsWithStats(fg, 8)
    return (n, labels, stats, cent)


def add_white_border(part_canvas):
    """Wrap the opaque part in a solid white outline (collage/sticker look)."""
    a = np.array(part_canvas)[:, :, 3]
    k = 2 * BORDER_PX + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    dilated = cv2.dilate(a, kernel)
    border = np.zeros((CANVAS, CANVAS, 4), np.uint8)
    border[:, :, 0:3] = 255
    border[:, :, 3] = dilated
    out = Image.fromarray(border, "RGBA")
    out.alpha_composite(part_canvas)
    return out


def main():
    rgb, fg, (n, labels, stats, cent) = sheet_foreground()
    blobs = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 2500 or w < 30 or h < 30:
            continue
        if h < 45 and w > 120:
            continue
        blobs.append((i, cent[i][0], cent[i][1], x, y, w, h))

    used = set()
    made = {}
    for (aid, pid, ax, ay) in MAP:
        best = None; bd = 1e18
        for b in blobs:
            if b[0] in used:
                continue
            d = (b[1] - ax) ** 2 + (b[2] - ay) ** 2
            if d < bd:
                bd = d; best = b
        if best is None:
            print("!! no blob for", aid, pid); continue
        used.add(best[0])
        i, cxb, cyb, x, y, w, h = best
        sub_rgb = rgb[y:y + h, x:x + w]
        sub_mask = (labels[y:y + h, x:x + w] == i).astype(np.uint8) * 255
        cut = Image.fromarray(np.dstack([sub_rgb, sub_mask]).astype(np.uint8), "RGBA")

        cx, cy, wfrac = PLACE[(aid, pid)]
        target_w = wfrac * CANVAS
        s = target_w / cut.width
        nw, nh = max(1, int(cut.width * s)), max(1, int(cut.height * s))
        cut_r = cut.resize((nw, nh), Image.LANCZOS)

        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        ox = int(cx * CANVAS - nw / 2); oy = int(cy * CANVAS - nh / 2)
        canvas.alpha_composite(cut_r, (ox, oy))
        canvas = add_white_border(canvas)

        out_dir = os.path.join(LAYERS, aid); os.makedirs(out_dir, exist_ok=True)
        canvas.save(os.path.join(out_dir, f"{pid}.png"))
        made.setdefault(aid, []).append(pid)

    for aid, data in ANIMALS.items():
        src = Image.open(os.path.join(SRC_DIR, data["src"])).convert("RGBA").resize((CANVAS, CANVAS), Image.LANCZOS)
        src.save(os.path.join(LAYERS, aid, "base.png"))
        base_mod.build_rig_json(aid, data, "base.png", [f"{p[0]}.png" for p in data["parts"]])
        print(f"[ok] {aid}: base + parts {made.get(aid, [])}")


if __name__ == "__main__":
    main()
