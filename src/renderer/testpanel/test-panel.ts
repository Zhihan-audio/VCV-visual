import { ANIMALS } from '../instruments/registry.js';
import type { InstrumentAnimator } from '../instruments/types.js';

const DEFAULT_PCT = 100; // 100% = motion as designed
const MAX_PCT = 200;

/**
 * One slider per animal controlling that animal's overall motion amplitude
 * (0–200%). The OSC signal still decides when/how each animal plays; these
 * sliders only scale how big the movement is. Plus a stage-light test slider
 * (mirrors the `/light` OSC channel) when a light handler is provided.
 */
export function buildTestPanel(
  container: HTMLElement,
  animators: Map<string, InstrumentAnimator>,
  onLight?: (value: number) => void
): void {
  if (onLight) {
    const card = document.createElement('div');
    card.className = 'test-card';
    const h3 = document.createElement('h3');
    h3.textContent = 'Stage Light';
    card.appendChild(h3);

    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = 'Level';
    span.style.minWidth = '40px';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '-100';
    input.max = '100';
    input.value = '0';
    input.addEventListener('input', () => onLight(Number(input.value) / 100));
    label.appendChild(span);
    label.appendChild(input);
    card.appendChild(label);
    container.appendChild(card);
  }

  for (const spec of ANIMALS) {
    const animator = animators.get(spec.id);
    if (!animator) continue;

    const card = document.createElement('div');
    card.className = 'test-card';

    const h3 = document.createElement('h3');
    h3.textContent = spec.label;
    card.appendChild(h3);

    const label = document.createElement('label');

    const span = document.createElement('span');
    span.textContent = 'Motion';
    span.style.minWidth = '40px';

    const value = document.createElement('span');
    value.style.minWidth = '42px';
    value.style.textAlign = 'right';
    value.textContent = `${DEFAULT_PCT}%`;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(MAX_PCT);
    input.value = String(DEFAULT_PCT);
    animator.setAmplitude(DEFAULT_PCT / 100);
    input.addEventListener('input', () => {
      const pct = Number(input.value);
      animator.setAmplitude(pct / 100);
      value.textContent = `${pct}%`;
    });

    label.appendChild(span);
    label.appendChild(input);
    label.appendChild(value);
    card.appendChild(label);

    container.appendChild(card);
  }
}
