import type { Transform } from '../rig/types.js';
import { AnimatorBase } from './base.js';

/**
 * Owl · drum pad — one tap per detected note, alternating left/right wing
 * (finger drumming). Head bobs with each tap.
 */
export class OwlAnimator extends AnimatorBase {
  protected motion(now: number): Record<string, Transform> {
    this.stepDt(now);
    const g = this.gesture(now);
    const useR = this.beatDir() > 0;
    return {
      fingerL: { y: useR ? 0 : 4 * g, scaleY: 1 - (useR ? 0 : g) * 0.08 },
      fingerR: { y: useR ? 4 * g : 0, scaleY: 1 - (useR ? g : 0) * 0.08 },
      head: { rotate: 1.5 * g },
    };
  }
}
