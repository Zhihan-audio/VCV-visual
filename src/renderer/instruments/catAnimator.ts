import type { Transform } from '../rig/types.js';
import { AnimatorBase } from './base.js';

/**
 * Cat · keyboard — one key press per detected note, alternating left/right
 * hand. Head bobs with each note.
 */
export class CatAnimator extends AnimatorBase {
  protected motion(now: number): Record<string, Transform> {
    this.stepDt(now);
    const g = this.gesture(now);
    const useR = this.beatDir() > 0;
    return {
      handL: { y: useR ? 0 : 3 * g, scaleY: 1 - (useR ? 0 : g) * 0.06 },
      handR: { y: useR ? 3 * g : 0, scaleY: 1 - (useR ? g : 0) * 0.06 },
      head: { rotate: 1 * g },
    };
  }
}
