import type { SpriteRig } from '../rig/sprite-rig.js';

/**
 * Per-animal light & shadow, derived from the spotlight geometry (apex at the
 * top centre of the stage):
 *
 *  1. cast shadow on the floor — the animal's silhouette flipped/squashed at
 *     its foot line, skewed AWAY from the light centre (longer further out),
 *     blurred and faded with distance;
 *  2. form shade — a soft multiply gradient over the animal's lower body
 *     (ambient occlusion toward the floor);
 *  3. rim light — a warm lighten gradient on the side facing the light.
 *
 * Everything is built ONCE per animal (silhouette composited from its own
 * layer PNGs into a small canvas); at runtime only cheap CSS vars change:
 * all three layers breathe with the spotlight via `--light-A` (set by
 * Spotlight.tick), so brighter light = stronger shadows/rim.
 */
export const shadingConfig = {
  silhouetteRes: 512,
  shadowColor: '#0d1638',
  shadowBlurPx: 5,
  // TOP light: shadows are short puddles at the feet, only slightly biased
  // away from the light centre — not long back-lit streaks
  shadowSkewMaxDeg: 10, // at the stage edges
  shadowLenMin: 0.09, // squash factor under the light centre…
  shadowLenMax: 0.18, // …to this at the edges
  shadowWiden: 1.15, // puddles spread a little sideways
  shadowTuckPct: 0.6, // lift (% of frame) so the puddle tucks under the feet
  shadowOpacity: 'calc(0.12 + var(--light-A, 0.4) * 0.34)',
  shadeColor: 'rgba(13, 22, 56, 0.55)',
  shadeOpacity: 'calc(0.25 + var(--light-A, 0.4) * 0.35)',
  rimColor: 'rgba(255, 235, 170, 0.55)',
  rimOpacity: 'calc(0.12 + var(--light-A, 0.4) * 0.38)',
};

export async function addStageShading(rigs: Map<string, SpriteRig>): Promise<void> {
  for (const rig of rigs.values()) {
    try {
      await shadeOne(rig);
    } catch (err) {
      console.warn('[shading] skipped', rig.id, err);
    }
  }
}

async function shadeOne(rig: SpriteRig): Promise<void> {
  const cfg = shadingConfig;
  const canvasEl = rig.canvasEl;
  const frame = canvasEl.parentElement as HTMLElement;
  if (!frame) return;

  const imgs = Array.from(canvasEl.querySelectorAll<HTMLImageElement>('.rig-layer img'));
  await Promise.all(imgs.map((im) => im.decode().catch(() => undefined)));

  const cs = getComputedStyle(frame);
  const x = parseFloat(cs.getPropertyValue('--x')) || 50; // stage position %
  const footGap = parseFloat(cs.getPropertyValue('--footGap')) || 0; // % of frame height
  const lean = Math.max(-1, Math.min(1, (x - 50) / 50)); // -1 left … +1 right

  // ── one-time silhouette (all layers, rest pose) ──
  const N = cfg.silhouetteRes;
  const sil = document.createElement('canvas');
  sil.width = N;
  sil.height = N;
  const g = sil.getContext('2d')!;
  for (const im of imgs) g.drawImage(im, 0, 0, N, N);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000';
  g.fillRect(0, 0, N, N);
  const silURL = sil.toDataURL('image/png');

  // shadow texture = silhouette with a distance fade (weak at the head end,
  // which becomes the far tail of the cast shadow after the flip)
  // top-lit puddle: fades out fast away from the feet
  const footY = (1 - footGap / 100) * N;
  g.globalCompositeOperation = 'destination-in';
  const grad = g.createLinearGradient(0, 0, 0, footY);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, N, N);
  const shadURL = sil.toDataURL('image/png');

  const maskStyle = (el: HTMLElement, url: string) => {
    el.style.webkitMaskImage = `url('${url}')`;
    (el.style as any).webkitMask = `url('${url}') 0 0 / 100% 100% no-repeat`;
    (el.style as any).mask = `url('${url}') 0 0 / 100% 100% no-repeat`;
  };

  // ── 1. directional cast shadow on the floor ──
  const shadow = document.createElement('div');
  shadow.className = 'cast-shadow';
  maskStyle(shadow, shadURL);
  shadow.style.background = cfg.shadowColor;
  const len = cfg.shadowLenMin + (cfg.shadowLenMax - cfg.shadowLenMin) * Math.abs(lean);
  const skew = (cfg.shadowSkewMaxDeg * lean).toFixed(1);
  shadow.style.transformOrigin = `50% ${(100 - footGap).toFixed(1)}%`;
  shadow.style.transform =
    `translateY(${-cfg.shadowTuckPct}%) skewX(${skew}deg) scaleY(${-len.toFixed(3)}) scaleX(${cfg.shadowWiden})`;
  shadow.style.filter = `blur(${cfg.shadowBlurPx}px)`;
  shadow.style.opacity = cfg.shadowOpacity;
  frame.insertBefore(shadow, canvasEl);

  // ── 2. form shade (multiply, lower body) ──
  const shade = document.createElement('div');
  shade.className = 'form-shade';
  maskStyle(shade, silURL);
  shade.style.background = `linear-gradient(180deg, rgba(13,22,56,0) 55%, ${cfg.shadeColor} 100%)`;
  shade.style.opacity = cfg.shadeOpacity;
  canvasEl.appendChild(shade);

  // ── 3. warm rim toward the light ──
  const rim = document.createElement('div');
  rim.className = 'form-rim';
  maskStyle(rim, silURL);
  const rimAngle = (180 - lean * 22).toFixed(1); // tilt toward stage centre
  rim.style.background = `linear-gradient(${rimAngle}deg, ${cfg.rimColor}, rgba(255,235,170,0) 34%)`;
  rim.style.opacity = cfg.rimOpacity;
  canvasEl.appendChild(rim);
}
