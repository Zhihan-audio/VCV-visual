import type { Transform } from '../rig/types.js';
import { AnimatorBase } from './base.js';

/**
 * Monkey · guitar — one strum per detected note, alternating down/up strokes;
 * headbang on each note.
 */
export class MonkeyAnimator extends AnimatorBase {
  protected motion(now: number): Record<string, Transform> {
    this.stepDt(now);
    const g = this.gesture(now);
    return {
      strumArm: { rotate: 16 * g * this.beatDir() },
      head: { rotate: 4 * g },
    };
  }
}
