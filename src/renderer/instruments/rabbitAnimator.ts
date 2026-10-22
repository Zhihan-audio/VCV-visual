import type { Transform } from '../rig/types.js';
import { AnimatorBase } from './base.js';

/**
 * Rabbit · violin — sustained bowing. While a note sounds the bow sweeps in
 * long continuous strokes, reversing only at the ends of its travel (no
 * per-note flipping — legato, few alternations); silence eases the bow back
 * to rest. Sweep speed grows a little with loudness.
 */
export class RabbitAnimator extends AnimatorBase {
  private bowPos = 0; // -1..1 bow travel
  private dir = 1;

  protected motion(now: number): Record<string, Transform> {
    const dt = this.stepDt(now);
    const level = this.signalLevel();

    if (level > 0.2) {
      // slow, long strokes: one full stroke ≈ 1.7–3.3 s depending on loudness
      const speed = (0.35 + 0.85 * level) * (dt / 1000);
      this.bowPos += this.dir * speed;
      if (this.bowPos > 1) {
        this.bowPos = 1;
        this.dir = -1;
      } else if (this.bowPos < -1) {
        this.bowPos = -1;
        this.dir = 1;
      }
    } else {
      // note off: ease the bow back toward centre
      this.bowPos += (0 - this.bowPos) * (1 - Math.exp(-dt / 300));
    }

    return {
      bowArm: { rotate: this.bowPos * 12 },
      head: { rotate: -this.bowPos * 2.5 },
    };
  }
}
