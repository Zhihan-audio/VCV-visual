import type { OSCMessage, OSCStatus } from './osc-bridge.js';
import { ANIMALS } from '../instruments/registry.js';

/**
 * Small always-on panel that shows the live OSC ingest: whether the UDP
 * receiver is bound, how many packets arrived, the last address/value, and a
 * per-animal "last seen" indicator. This is the thing you watch while wiring
 * up VCV Rack to confirm signals are actually arriving and on which address.
 */
export function buildOSCMonitor(container: HTMLElement): void {
  const el = document.createElement('div');
  el.className = 'osc-monitor';
  el.innerHTML = `
    <div class="osc-head">
      <span class="osc-dot" id="osc-dot"></span>
      <span id="osc-title">OSC waiting…</span>
      <span class="osc-count" id="osc-count">0 pkts</span>
    </div>
    <div class="osc-grid" id="osc-grid"></div>
  `;
  container.appendChild(el);

  const dot = el.querySelector('#osc-dot') as HTMLElement;
  const title = el.querySelector('#osc-title') as HTMLElement;
  const count = el.querySelector('#osc-count') as HTMLElement;
  const grid = el.querySelector('#osc-grid') as HTMLElement;

  // per-animal chip + last-hit timestamp for the activity fade
  const chips = new Map<string, { chip: HTMLElement; lastHit: number }>();
  const entries = [...ANIMALS.map((a) => ({ id: a.id, label: a.label })), { id: 'light', label: 'Stage Light' }];
  for (const a of entries) {
    const chip = document.createElement('div');
    chip.className = 'osc-chip';
    chip.textContent = a.id;
    chip.title = a.label;
    grid.appendChild(chip);
    chips.set(a.id, { chip, lastHit: 0 });
  }

  if (!window.oscBridge) {
    title.textContent = 'OSC unavailable (not in Electron)';
    return;
  }

  window.oscBridge.onStatus((s: OSCStatus) => {
    dot.classList.toggle('on', s.bound);
    title.textContent = s.bound ? `OSC listening ${s.host}:${s.port}` : 'OSC not bound';
    count.textContent = `${s.packetCount} pkts`;
    if (s.lastError) title.textContent = `OSC error: ${s.lastError}`;
  });

  window.oscBridge.onMessage((m: OSCMessage) => {
    const parts = m.address.split('/').filter(Boolean);
    // `/hippo` (new) or `/animal/hippo/...` (legacy)
    const id = parts[0] === 'animal' ? parts[1] : parts[0];
    const rec = chips.get(id);
    if (rec) rec.lastHit = performance.now();
  });

  // fade chips based on recent activity
  function tick(now: number): void {
    for (const { chip, lastHit } of chips.values()) {
      const age = now - lastHit;
      chip.classList.toggle('active', age < 250);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
