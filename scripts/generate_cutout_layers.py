#!/usr/bin/env python3
"""Higher-fidelity placeholder rigs: REAL pixel cutouts (not colored blocks).

For each moving part we cut the actual illustration pixels out of the flat
source (feathered ellipse mask) into that part's layer, then approximately
fill the hole left in the base with a blurred copy so no transparent gap
shows through when the limb rotates. This lets us judge the true 2D-cutout
animation feel using the original artwork, before hand-drawn layered art
(docs/ASSET_GUIDE.md) replaces it.

Reuses the part definitions (regions + pivots) from generate_placeholder_layers.py.
"""
import json
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

import generate_placeholder_layers as base_mod

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = base_mod.SRC_DIR
LAYERS_DIR = base_mod.LAYERS_DIR
RIGS_DIR = base_mod.RIGS_DIR
CANVAS = base_mod.CANVAS
ANIMALS = base_mod.ANIMALS


def load_source(src_name):
    img = Image.open(os.path.join(SRC_DIR, src_name)).convert("RGBA")
    return img.resize((CANVAS, CANVAS), Image.LANCZOS)


def subject_mask(src):
    """A silhouette of the character, excluding the illustration's baked
    background AND its soft drop-shadow ring. Uses the real alpha channel for
    die-cut art; otherwise colour-keys against the background sampled from the
    image corners. Cutting parts to this mask keeps the shadow ring out of the
    moving layers, so a bobbing head doesn't drag a halo with it."""
    alpha = src.getchannel("A")
    amin, amax = alpha.getextrema()
    if amin < 250:  # genuinely transparent background (sticker cut-outs)
        return alpha.point(lambda a: 255 if a > 128 else 0)

    rgb = src.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))  # median-ish

    # distance from background colour, thresholded, then cleaned up
    mask = Image.new("L", (w, h), 0)
    mpx = mask.load()
    thr = 46
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            mpx[x, y] = 255 if d > thr else 0
    # close small holes and drop the faint shadow fringe
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(9))
    return mask.filter(ImageFilter.GaussianBlur(2)).point(lambda a: 255 if a > 140 else 0)


def ellipse_mask(cx, cy, w, h, feather):
    """Feathered white ellipse (grayscale L) over the region, 0 outside."""
    mask = Image.new("L", (CANVAS, CANVAS), 0)
    d = ImageDraw.Draw(mask)
    x0, y0 = (cx - w / 2) * CANVAS, (cy - h / 2) * CANVAS
    x1, y1 = (cx + w / 2) * CANVAS, (cy + h / 2) * CANVAS
    d.ellipse([x0, y0, x1, y1], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def main():
    for animal_id, data in ANIMALS.items():
        src = load_source(data["src"])
        out_dir = os.path.join(LAYERS_DIR, animal_id)
        os.makedirs(out_dir, exist_ok=True)

        parts = data["parts"]
        silhouette = subject_mask(src)

        for part in parts:
            part_id, cx, cy, w, h, px, py, color, z = part
            feather = min(w, h) * CANVAS * 0.06
            m = ellipse_mask(cx, cy, w, h, feather)
            # clip the ellipse to the subject silhouette so the layer carries
            # only solid body pixels — excludes the background AND the baked
            # drop-shadow ring, which is what caused a halo on the moving head
            m = ImageChops.multiply(m, silhouette)

            # part layer = source pixels masked by the clipped ellipse
            layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
            layer.paste(src, (0, 0), m)
            layer.save(os.path.join(out_dir, f"{part_id}.png"))

        # NOTE: these source illustrations have baked-in (opaque) backgrounds,
        # so the subject isn't separated from its background — any blur-based
        # inpaint of the hole smears the silhouette edge into a halo. For a
        # motion-logic placeholder we instead keep the base as the intact
        # original and just overlay the real limb pixels on top: perfectly
        # aligned at rest (invisible seam), only revealing itself while moving.
        # Real halo-free separation is what the hand-drawn layered art provides
        # (see docs/ASSET_GUIDE.md).
        src.save(os.path.join(out_dir, "base.png"))

        # rig JSON is identical structure to the block version
        base_mod.build_rig_json(animal_id, data, "base.png", [f"{p[0]}.png" for p in parts])
        print(f"[ok] {animal_id}: cutout base + {len(parts)} real-pixel parts")


if __name__ == "__main__":
    main()
