import { ANIMALS } from './instruments/registry.js';
import type { InstrumentAnimator } from './instruments/types.js';
import { loadRig } from './rig/rig-loader.js';
import { SpriteRig } from './rig/sprite-rig.js';
import { wireOSC } from './osc/osc-bridge.js';
import { buildOSCMonitor } from './osc/osc-monitor.js';
import { Spotlight } from './spotlight/spotlight.js';
import { addStageShading } from './spotlight/shading.js';
import { buildTestPanel } from './testpanel/test-panel.js';

async function main(): Promise<void> {
  const scene = document.getElementById('stage-scene') ?? document.getElementById('stage')!;
  const testPanel = document.getElementById('test-panel')!;

  const rigs = new Map<string, SpriteRig>();
  const animators = new Map<string, InstrumentAnimator>();

  for (const spec of ANIMALS) {
    const rigDef = await loadRig(spec.id);
    rigs.set(spec.id, new SpriteRig(scene, rigDef));
    animators.set(spec.id, spec.create());
  }

  // stage spotlight: fed by the /light OSC channel (falls back to the combined
  // animal signal level when /light is silent) — see spotlight/spotlight.ts
  const spotlight = new Spotlight(scene);

  // per-animal cast shadows + form shading, driven by the same light (--light-A)
  addStageShading(rigs).catch((err) => console.warn('[shading]', err));

  wireOSC(animators, (v) => spotlight.setSignal(v));
  const monitorHost = document.getElementById('osc-monitor-host');
  if (monitorHost) buildOSCMonitor(monitorHost);
  buildTestPanel(testPanel, animators, (v) => spotlight.setSignal(v));

  let last = performance.now();
  function loop(now: number): void {
    const dt = now - last;
    last = now;
    let maxLevel = 0;
    for (const [id, animator] of animators) {
      const rig = rigs.get(id);
      if (!rig) continue;
      rig.applyAll(animator.tick(now));
      const lv = animator.getSignalLevel();
      if (lv > maxLevel) maxLevel = lv;
    }
    spotlight.tick(dt, now, maxLevel);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#f66;padding:20px;">${String(err)}</pre>`;
});
