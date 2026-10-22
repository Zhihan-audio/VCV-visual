export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Cartoon-ish overshoot easing, good for the rebound after a hit/strum. */
export function easeOutBack(t: number, overshoot = 1.7): number {
  const c = overshoot;
  const x = t - 1;
  return 1 + c * x * x * x + c * x * x;
}

/** Smoothly-tracked continuous value (e.g. a CV signal), framerate independent. */
export class ContinuousParam {
  value = 0;
  target = 0;
  constructor(initial = 0, public smoothing = 0.2) {
    this.value = initial;
    this.target = initial;
  }
  set(v: number): void {
    this.target = v;
  }
  update(dtMs: number): number {
    const k = 1 - Math.pow(1 - this.smoothing, dtMs / 16.67);
    this.value += (this.target - this.value) * k;
    return this.value;
  }
}

interface Hit {
  time: number;
  velocity: number;
}

/**
 * One-shot impulse events (drum hit, strum stroke, finger tap...).
 * envelope() gives an attack->release curve per hit so a repeated animator
 * tick loop can read "how active is this hit right now" every frame.
 */
export class TriggerPulse {
  private hits: Hit[] = [];

  fire(velocity = 1): void {
    this.hits.push({ time: performance.now(), velocity: clamp(velocity, 0, 1) });
  }

  envelope(now: number, attackMs: number, releaseMs: number): number {
    let v = 0;
    for (const h of this.hits) {
      const t = now - h.time;
      if (t < 0) continue;
      let e: number;
      if (t < attackMs) {
        e = t / attackMs;
      } else {
        e = Math.max(0, 1 - (t - attackMs) / releaseMs);
      }
      v = Math.max(v, e * h.velocity);
    }
    const maxAge = attackMs + releaseMs + 50;
    this.hits = this.hits.filter((h) => now - h.time < maxAge);
    return v;
  }

  /** ms since the most recent hit fired, or Infinity if none yet. */
  age(now: number): number {
    if (this.hits.length === 0) return Infinity;
    return now - this.hits[this.hits.length - 1].time;
  }
}

/** Continuous idle sway, always present so a character never looks frozen. */
export function idleSine(now: number, periodMs: number, amplitude: number, phase = 0): number {
  return Math.sin((now / periodMs) * Math.PI * 2 + phase) * amplitude;
}

/**
 * Turns a raw, jittery drive signal into clean discrete "play" gestures.
 *
 * 1. amplitude envelope of |signal| (fast attack, slow release) — smooths audio
 *    and follows gate/envelope inputs alike.
 * 2. auto-range that envelope against a slowly-decaying peak -> level in 0..1.
 * 3. Schmitt trigger on the level detects note onsets (rise past 0.5, re-armed
 *    below 0.25) — robust to raw-waveform jitter, so it fires ~once per note.
 * 4. each onset fires a one-shot attack/release gesture and flips a direction
 *    flag (for alternating strums / bow strokes).
 *
 * gesture() returns 0..1 — a single smooth motion arc per detected note.
 */
export class SignalBeat {
  private fast = 0; // fast |signal| follower (catches attacks)
  private slow = 0; // slow follower (running baseline)
  private peak = 0.05; // slowly-decaying full-scale reference
  private open = false; // schmitt gate state
  private pulse = new TriggerPulse();
  dir = 1; // flips each onset (alternating strums / bow strokes)
  level = 0; // last energy 0..1 (fast/peak) — for sustained motions
  onsets = 0; // total notes detected — bump = a new note started

  /** Feed the latest raw signal value once per frame. */
  push(v: number, dtMs: number): void {
    const a = Math.abs(v);
    this.fast += (a - this.fast) * (a > this.fast ? 1 - Math.exp(-dtMs / 5) : 1 - Math.exp(-dtMs / 60));
    this.slow += (a - this.slow) * (a > this.slow ? 1 - Math.exp(-dtMs / 120) : 1 - Math.exp(-dtMs / 400));

    if (this.fast > this.peak) this.peak = this.fast;
    else this.peak = Math.max(0.05, this.peak * (1 - dtMs / 8000));

    const ratio = this.fast / Math.max(this.slow, 0.04); // transient (sharp attack)
    const level = this.fast / this.peak; // absolute swell (smooth notes)
    this.level = level;

    if (!this.open && (ratio > 1.6 || level > 0.55) && this.fast > 0.1 * this.peak) {
      this.open = true;
      this.dir = -this.dir;
      this.onsets++;
      this.pulse.fire(clamp(level, 0, 1)); // velocity = how loud
    } else if (this.open && ratio < 1.2 && level < 0.35) {
      this.open = false;
    }
  }

  /** Current gesture value 0..1 (one smooth attack/release arc per note). */
  gesture(now: number, attackMs = 55, releaseMs = 260): number {
    return this.pulse.envelope(now, attackMs, releaseMs);
  }
}
