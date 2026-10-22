import { ANIMALS } from '../instruments/registry.js';
import type { InstrumentAnimator } from '../instruments/types.js';

export interface OSCMessage {
  address: string;
  args: number[];
}

export interface OSCStatus {
  bound: boolean;
  host: string;
  port: number;
  packetCount: number;
  lastAddress: string | null;
  lastArgs: number[] | null;
  lastTime: number | null;
  lastError: string | null;
}

declare global {
  interface Window {
    oscBridge?: {
      onMessage(cb: (msg: OSCMessage) => void): void;
      onStatus(cb: (status: OSCStatus) => void): void;
    };
  }
}

/** The single continuous signal that drives every animal's motion. */
export const DRIVE = 'drive';

/** Addresses accepted for the stage-light channel (backdrop brightness). */
const LIGHT_IDS = new Set(['light', 'stage', 'brightness']);

/**
 * OSC routing:
 *  - one channel per animal by name: `/hippo` `/bear` `/parrot` `/monkey`
 *    `/owl` `/cat` `/rabbit` — first float is that animal's drive signal.
 *  - `/light` (or `/stage`, `/brightness`) — first float drives the backdrop
 *    brightness (stage lighting).
 * A legacy `/animal/<id>/...` address still routes (parts[0] skipped).
 */
export function wireOSC(
  animators: Map<string, InstrumentAnimator>,
  onLight?: (value: number) => void
): void {
  if (!window.oscBridge) {
    console.warn('[osc] oscBridge not available (not running inside Electron?)');
    return;
  }

  const ids = new Set(ANIMALS.map((a) => a.id));

  window.oscBridge.onMessage(({ address, args }) => {
    const parts = address.split('/').filter(Boolean);
    if (parts.length === 0) return;
    const id = parts[0] === 'animal' ? parts[1] : parts[0];
    const value = args.length > 0 ? args[0] : 0;

    if (LIGHT_IDS.has(id)) {
      onLight?.(value);
      return;
    }

    if (!ids.has(id)) return;
    animators.get(id)?.setContinuous(DRIVE, value);
  });
}
