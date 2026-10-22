import type { Transform } from '../rig/types.js';
import { AnimatorBase } from './base.js';

/**
 * Hippo · bass — one pluck per detected note; the plucking hand alternates
 * up/down strokes, the head nods with each note.
 */
export class HippoAnimator extends AnimatorBase {
  protected motion(now: number): Record<string, Transform> {
    this.stepDt(now);
    const g = this.gesture(now);
    return {
      strumHand: { rotate: 14 * g * this.beatDir() },
      head: { rotate: 3 * g },
    };
  }
}
