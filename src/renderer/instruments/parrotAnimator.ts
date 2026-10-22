import type { Transform } from '../rig/types.js';
import { AnimatorBase } from './base.js';

/**
 * Parrot · mic — one sung note per detected onset: head throws back and the
 * mic wing lifts toward the beak, then settles.
 */
export class ParrotAnimator extends AnimatorBase {
  protected motion(now: number): Record<string, Transform> {
    this.stepDt(now);
    const g = this.gesture(now);
    return {
      head: { rotate: -10 * g },
      micWing: { rotate: -8 * g },
    };
  }
}
