# Layered Asset Production Guide (Approach A · Manual Photoshop Cutouts)

Goal: split each animal into a few **aligned transparent PNG layers** that replace the placeholder color blocks currently under `assets/layers/<animal>/`. When a layer is done, overwrite the file with the same name — no code changes required.

## ★ The single most important rule: cut on the original canvas

**Work every layer on the same source image's canvas, and keep the canvas size unchanged when exporting.**
That way each part is naturally in its correct position on the body and needs no re-alignment afterwards — exactly where Approach A beats AI-generated loose parts.

Concretely: open the source image in Photoshop → copy each part to its own layer and cut it out → on the base layer, erase the cut-out part and patch the hole → **export every layer as its own transparent PNG with canvas size = source size; do not crop, scale, or move anything.**

## Five Hard Requirements

1. **Same-canvas alignment**: all layers of one animal must have identical dimensions (= the source image's) and align exactly. Different animals may use different sizes; I configure each animal separately.
2. **Transparent background**, exported as PNG-32 (with alpha channel).
3. **One part per layer**, everything else fully transparent; the same pixels must never appear in two layers.
4. **Patch the base** `base.png`: after cutting out the movable parts (arms, head, ...), rebuild the body that was hidden behind them using the clone stamp / healing brush (the shoulders, clothing, instrument that become visible). This is the most labor-intensive step.
5. **White-outline collage style**: match the white sticker outline on the bear reference. Either add a "Stroke (white, outside)" or "Outer Glow (white)" layer style to each part in Photoshop, **or skip it and I'll add a uniform white outline in code** — pick one; I suggest leaving it to me so the thickness stays consistent.

## Source Image ↔ Animal Mapping (the new high-res images in the `图片/` folder next to this app)

| Animal | Instrument | Source image |
|---|---|---|
| Hippo (`hippo`) | Bass | Weixin Image_20260702125932_17_868.jpg |
| Bear (`bear`) | Snare drum | Weixin Image_20260702125957_22_868.jpg |
| Parrot (`parrot`) | Microphone | Weixin Image_20260702125951_21_868.jpg |
| Monkey (`monkey`) | Electric guitar | Weixin Image_20260702125928_16_868.jpg |
| Owl (`owl`) | Drum machine | Weixin Image_20260702131744_29_868.jpg |
| Cat (`cat`) | Keyboard | Weixin Image_20260702125944_20_868.jpg |
| Rabbit (`rabbit`) | Violin | Weixin Image_20260702130004_23_868.jpg |

## Layers to Export per Animal (file names must match exactly)

Save them under `assets/layers/<animal>/`, overwriting the existing placeholder files of the same names.

| Animal | PNGs to export |
|---|---|
| hippo | `base.png` · `strumHand.png` (strumming hand) · `fretHand.png` (fretting hand) · `head.png` (head) |
| bear | `base.png` · `stickL.png` (left stick + paw) · `stickR.png` (right stick + paw) · `head.png` |
| parrot | `base.png` · `beak.png` (lower beak, separate so the mouth can open) · `micWing.png` (mic-holding wing) · `head.png` |
| monkey | `base.png` · `strumArm.png` (strumming arm) · `fretHand.png` (fretting hand) · `legs.png` (lower body / legs) · `head.png` |
| owl | `base.png` · `fingerL.png` (left talon) · `fingerR.png` (right talon) · `head.png` |
| cat | `base.png` · `handL.png` (left hand) · `handR.png` (right hand) · `tail.png` (tail) · `head.png` |
| rabbit | `base.png` · `bowArm.png` (bowing arm + bow) · `fretHand.png` (fretting hand) · `ears.png` (ears) · `head.png` |

> Leave a little overlap at the joints (e.g. an extra ring of pixels at the root of an arm) so no gap shows when a part rotates.
> Adding or removing movable parts is fine too (e.g. giving the owl several fingers for several pads) — add the layers and tell me, and I'll add the configuration.

## Things You Don't Need to Worry About (I'll Handle Them)

- **Rotation pivots**: which point each part rotates around — I set and fine-tune these in `assets/rigs/<animal>.json`; you only need to cut and align the layers.
- **White outlines** (if you don't add them in Photoshop, I'll add a uniform one in code).
- **Canvas size configuration**: export at the source image's original size, tell me the dimensions, and I'll set them in the rig config.

## Delivery

Finish one animal first so we can test the pipeline (**start with the bear**: it's already a white-outlined sticker style, has a clean background, and its symmetrical drumsticks make it the easiest to cut). Two ways to hand it off:

- Overwrite the PNGs directly under `assets/layers/<animal>/` and let me know; or
- Send me one folder per animal, and I'll drop them in, set the pivots, add the white outlines, and verify the animation.
