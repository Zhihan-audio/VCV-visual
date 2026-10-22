# OSC Transport · Address Scheme (One Signal per Animal)

## Connection Parameters

| Item | Value |
|---|---|
| Protocol | OSC over UDP |
| Listening port | **8000** |
| Listening address | `0.0.0.0` (with VCV Rack on the same machine, send to `127.0.0.1:8000`) |
| Supports | Single messages and bundles (cvOSCcv sends bundles by default) |

## Address Scheme

**One channel per animal — the address is simply the animal's name.** The first float argument is that animal's drive signal:

| VCV channel | OSC address | Animal |
|---|---|---|
| 01 | `/hippo` | Hippo · Bass |
| 02 | `/bear` | Bear · Snare drum |
| 03 | `/parrot` | Parrot · Microphone |
| 04 | `/monkey` | Monkey · Electric guitar |
| 05 | `/owl` | Owl · Drum machine |
| 06 | `/cat` | Cat · Keyboard |
| 07 | `/rabbit` | Rabbit · Violin |

- Each address carries one float; the app reads the **first argument** as that animal's drive signal.
- **No need to scale the signal yourself**: the app has built-in **auto-ranging normalization** — it tracks each signal's recent peak and maps it to ±1, so whether VCV sends ±1, ±5, or ±10 you get the full range of motion. Set cvOSCcv's output range to whatever you like.
- The signal is bipolar: positive and negative values push the movable parts in opposite directions (e.g. the bowing arm pushes forward / pulls back). Send a signal that swings back and forth (an LFO, audio, or an envelope) and the animal "plays". At 0 the animal rests.

## Each Animal's Single Motion (One Signal Drives All Movable Parts)

| Animal | Motion (all movable parts follow the `/<animal>` signal together) |
|---|---|
| Hippo | Strumming hand swings + head sways gently |
| Bear | Both drumsticks strike toward the drumhead + head sways gently |
| Parrot | Head tilts back to sing + wing brings up the mic |
| Monkey | Strumming arm swings + head whips |
| Owl | Both wings (hands) press the pads together + head sways gently |
| Cat | Both hands press the keys together + head sways gently |
| Rabbit | Bowing arm bows + head leans along with it |

## Connecting VCV Rack

1. Add a **trowaSoft cvOSCcv** module, targeting `127.0.0.1:8000`.
2. Bind the 7 CV channels to the addresses `/hippo` `/bear` `/parrot` `/monkey` `/owl` `/cat` `/rabbit`.
3. Any CV voltage range works (auto-ranging takes care of it). For the back-and-forth "playing" feel, the signal itself must move (LFO, envelope follower, audio, etc.).

## Verifying Inside the App (OSC Monitor Panel, Top Right)

- Green dot = bound to port 8000; `N pkts` = total number of OSC packets received.
- The middle row shows the last received address and values.
- One small cell per animal: it **flashes green** when the matching `/<animal>` address arrives, so you can confirm which signal reached which animal.

## Testing Without VCV Rack

The test panel below the stage gives every animal its own slider that calls the exact same entry point as incoming OSC — drag it to see that animal's motion.
