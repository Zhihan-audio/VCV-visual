import type { Transform } from '../rig/types.js';
import { AnimatorBase } from './base.js';

/**
 * Bear · snare — one strike per detected note, alternating left/right stick
 * (the idle stick rests). Head nods with each hit.
 */
export class BearAnimator extends AnimatorBase {
  protected motion(now: number): Record<string, Transform> {
    this.stepDt(now);
    const g = this.gesture(now);
    const useR = this.beatDir() > 0;
    return {
      stickL: { rotate: useR ? 0 : -12 * g },
      stickR: { rotate: useR ? 12 * g : 0 },
      head: { rotate: 3 * g },
    };
  }
}
