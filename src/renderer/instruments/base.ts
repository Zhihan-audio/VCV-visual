import type { Transform } from '../rig/types.js';
import { ContinuousParam, TriggerPulse, SignalBeat } from '../rig/motion.js';
import type { InstrumentAnimator } from './types.js';

export abstract class AnimatorBase implements InstrumentAnimator {
  private lastNow = 0;
  private continuous = new Map<string, ContinuousParam>();
  private triggers = new Map<string, TriggerPulse>();
  private beat = new SignalBeat();
  private gain = 1; // overall motion amplitude (1 = 100%), set from the panel

  protected cparam(name: string, initial = 0, smoothing = 0.2): ContinuousParam {
    if (!this.continuous.has(name)) {
      this.continuous.set(name, new ContinuousParam(initial, smoothing));
    }
    return this.continuous.get(name)!;
  }

  protected tparam(name: string): TriggerPulse {
    if (!this.triggers.has(name)) {
      this.triggers.set(name, new TriggerPulse());
    }
    return this.triggers.get(name)!;
  }

  setContinuous(name: string, value: number): void {
    this.cparam(name).set(value);
  }

  trigger(name: string, velocity = 1): void {
    this.tparam(name).fire(velocity);
  }

  setAmplitude(gain: number): void {
    this.gain = gain;
  }

  getSignalLevel(): number {
    return this.beat.level;
  }

  /**
   * One clean "play" gesture per detected note, in [0, 1]. The raw drive signal
   * (any amplitude/shape from VCV) is fed to a SignalBeat that detects note
   * onsets and emits a smooth attack/release arc each time — so parts move
   * one-note-at-a-time instead of following the jittery waveform.
   */
  protected gesture(now: number): number {
    return this.beat.gesture(now);
  }

  /** ±1, flips on each detected note — for alternating strums / bow strokes. */
  protected beatDir(): number {
    return this.beat.dir;
  }

  /** Signal energy 0..1 — for sustained motions (e.g. violin bowing). */
  protected signalLevel(): number {
    return this.beat.level;
  }

  /** Total notes detected so far — a change means a new note just started. */
  protected onsetCount(): number {
    return this.beat.onsets;
  }

  /**
   * Call at the top of tick(): advances smoothing and feeds the raw drive
   * signal into the onset detector.
   */
  protected stepDt(now: number): number {
    const dt = this.lastNow ? now - this.lastNow : 16.67;
    this.lastNow = now;
    for (const p of this.continuous.values()) p.update(dt);
    const d = this.continuous.get('drive');
    if (d) this.beat.push(d.target, dt); // raw target, not the smoothed value
    return dt;
  }

  /** Each instrument implements its raw motion; the base scales it by `gain`. */
  protected abstract motion(now: number): Record<string, Transform>;

  tick(now: number): Record<string, Transform> {
    const m = this.motion(now);
    const g = this.gain;
    if (g === 1) return m;
    const out: Record<string, Transform> = {};
    for (const id in m) {
      const t = m[id];
      out[id] = {
        x: t.x === undefined ? undefined : t.x * g,
        y: t.y === undefined ? undefined : t.y * g,
        rotate: t.rotate === undefined ? undefined : t.rotate * g,
        // scale is around 1, so grow the deviation from 1 by the gain
        scaleX: t.scaleX === undefined ? undefined : 1 + (t.scaleX - 1) * g,
        scaleY: t.scaleY === undefined ? undefined : 1 + (t.scaleY - 1) * g,
      };
    }
    return out;
  }
}
