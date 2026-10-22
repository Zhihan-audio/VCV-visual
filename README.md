# Forest Band · 2D Animation · OSC ← VCV Rack

A 2D skeletal animation in which 7 animal musicians each play an instrument, their limbs driven by CV/Gate signals received from VCV Rack over OSC.

The images currently under `assets/layers/` are **placeholder art** (the original illustration plus semi-transparent colored blocks marking the movable parts), used to validate the animation logic. Once the final layered artwork is ready, swap it in following the rules in [docs/ASSET_GUIDE.md](docs/ASSET_GUIDE.md) — no code changes required.

## Running

```bash
npm install   # first run only
npm start     # compile + launch Electron
```

Or simply double-click `start.command`.

The lower part of the interface is a test panel: even without VCV Rack connected, you can trigger each animal's motion with its sliders and buttons.

## The 7 Animals · Instruments · Movable Parts

| Animal | Instrument | Movable parts |
|---|---|---|
| Hippo | Bass | Strumming hand, fretting hand, head |
| Bear | Snare drum | Left/right drumstick, head |
| Parrot | Microphone | Beak (opens and closes), mic-holding wing, head |
| Monkey | Electric guitar | Strumming arm, fretting hand, legs (rock-style knee bends), head |
| Owl | Drum machine | Left/right fingers tapping the pads, head |
| Cat | Keyboard | Left/right hands, tail, head |
| Rabbit | Violin | Bowing arm, fretting hand, ears, head |

## Connecting VCV Rack

The app listens on UDP port `8000`. Each animal has its own OSC address (`/hippo`, `/bear`, ...); see [docs/OSC_MAPPING.md](docs/OSC_MAPPING.md) for the full mapping table.

## Project Structure

```
src/main/            Electron main process: window + node-osc receiver + IPC forwarding
src/renderer/
  rig/               Generic 2D skeletal animation engine (pivot rotation, parent-child nesting, easing)
  instruments/       Motion logic for the 7 instruments + registry (master table of animals/parameters)
  osc/               Routing from OSC addresses to animation parameters
  testpanel/         Manual test panel (sliders + buttons)
assets/
  rigs/<animal>.json Skeleton definition for each animal (layer list, pivots, parent-child relations)
  layers/<animal>/   Layered PNGs for each animal (currently placeholder art)
scripts/generate_placeholder_layers.py   Generates the placeholder art
docs/
  OSC_MAPPING.md     OSC address scheme + steps to connect VCV Rack
  ASSET_GUIDE.md     Production guidelines for the final layered artwork
```
