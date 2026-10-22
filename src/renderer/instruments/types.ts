import type { Transform } from '../rig/types.js';

export interface InstrumentAnimator {
  /** Continuous CV-style value, e.g. 'gate' | 'pitch' | 'velocity' | 'bowVel' | 'amp'. */
  setContinuous(name: string, value: number): void;
  /** One-shot event, e.g. 'strum' | 'hitL' | 'hitR' | 'padA'. velocity 0-1 scales the hit. */
  trigger(name: string, velocity?: number): void;
  /** Overall motion size for this animal (gain, 1 = 100%). Scales every part. */
  setAmplitude(gain: number): void;
  /** Read-only: this animal's normalized signal energy 0..1 (for the spotlight fallback). */
  getSignalLevel(): number;
  /** Called once per animation frame; returns this frame's transform per rig layer id. */
  tick(now: number): Record<string, Transform>;
}
