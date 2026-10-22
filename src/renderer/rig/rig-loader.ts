import type { RigDef } from './types.js';

const cache = new Map<string, Promise<RigDef>>();

export function loadRig(animalId: string): Promise<RigDef> {
  if (!cache.has(animalId)) {
    cache.set(
      animalId,
      fetch(`assets/rigs/${animalId}.json?t=${Date.now()}`).then((r) => {
        if (!r.ok) throw new Error(`rig not found: ${animalId}`);
        return r.json() as Promise<RigDef>;
      })
    );
  }
  return cache.get(animalId)!;
}
