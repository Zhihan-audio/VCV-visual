import { clamp } from '../rig/motion.js';

/**
 * Stage lighting driven by its own OSC channel (`/light`). The signal fades the
 * BACKDROP brightness only (the animals sit on a layer above #stage-bg and are
 * unaffected). Signed auto-range so any VCV amplitude works: a bipolar LFO
 * fades dark<->bright, a 0..1 envelope goes normal->bright.
 */
export class StageLight {
  private target = 1;
  private cur = 1;
  private peak = 0.5;

  constructor(private el: HTMLElement) {}

  /** Feed the raw OSC value for the light channel. */
  setSignal(v: number): void {
    const a = Math.abs(v);
    this.peak = a > this.peak ? a : Math.max(0.3, this.peak * 0.9997);
    const norm = clamp(v / this.peak, -1, 1); // signed, -1..1
    this.target = clamp(1 + norm * 0.65, 0.3, 1.8); // 0.3 dim .. 1.8 bright
  }

  /** Call once per frame; smooths toward the target and applies the filter. */
  tick(dtMs: number): void {
    this.cur += (this.target - this.cur) * (1 - Math.exp(-dtMs / 90));
    this.el.style.setProperty('--bg-brightness', this.cur.toFixed(3));
  }
}
