import { clamp } from '../rig/motion.js';

/** All spotlight tuning lives here (per spec: one config object, no scatter). */
export const spotlightConfig = {
  maskPath: 'assets/spotlight-mask.png',

  blueColor: '#001E80',
  blueOverlayOpacity: 0.75,

  warmColor: '#FFE193',
  warmLightOpacity: 0.07,

  minAlpha: 0.3,
  maxAlpha: 1.0,

  // normalization: SIGNED bipolar follow — the tracked [min..max] of the raw
  // signal maps to dark..bright, so a sine LFO swings the light through one
  // full dim/bright cycle per period (no |x| rectification). autoRange tracks
  // the signal's own min/max with a slow decay; works for ±5V LFOs, unipolar
  // envelopes and gates alike. Set autoRange:false to use inputMin/inputMax.
  inputMin: 0,
  inputMax: 1,
  autoRange: true,

  noiseGate: 0.02,
  // near-symmetric smoothing so an LFO is tracked without distortion,
  // just gently rounded (asymmetric attack/release would skew the wave)
  attackMs: 120,
  releaseMs: 180,

  // beam scaling, anchored at the cone apex (top centre). 1.3× horizontal
  // stretch is the minimum that keeps every animal's actual visible pixels
  // (≥99.5%, alpha>60, solved per-pixel — not canvas frames) inside the beam.
  maskScaleX: 1.3,
  maskScaleY: 1.0,

  // shift the whole beam down (fraction of scene height) to sit on the stage
  // front edge; baked into the softened mask once at load
  maskOffsetY: 0.025,

  // extra feather: one-time gaussian blur of the mask at load (px at the
  // 2048-wide working resolution); 0 = use the PNG's own feather only
  featherPx: 26,

  // offscreen dark-field canvas resolution (16:9 to match the scene)
  canvasW: 2048,
  canvasH: 1152,

  // how long an OSC /light value stays "fresh" before falling back to the
  // combined animal level (ms)
  oscFreshMs: 3000,
};

/**
 * Stage spotlight, composited Procreate-style over the live DOM scene:
 *   L1 live scene (existing DOM: backdrop + animals) — rendered once as-is
 *   L2 #001E80 multiply dark-field over everything
 *   L3 the provided PNG as alpha mask (feathered cone)
 *   L4 scene restored inside the cone
 *   L5 #FFE193 lighten @7% inside the cone
 *
 * DOM can't cheaply re-show the live scene inside a mask, so L2+L3+L4 are
 * fused into ONE canvas that is mathematically identical: fill blue, then
 * erase the cone with globalAlpha = A (destination-out). A multiply layer
 * with per-pixel opacity (1 − A·mask) equals "full dark outside, scene
 * restored by A inside". L5 is a separate lighten div masked by the same PNG
 * with opacity 0.07·A — so A drives restored-scene and warm glow together,
 * exactly like controlling the masked content container.
 */
export class Spotlight {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private warmEl: HTMLDivElement;
  private mask = new Image();
  private softMask: HTMLCanvasElement | null = null; // blurred+offset, built once
  private maskLoaded = false;

  // signal state
  private raw = 0;
  private rawAt = -Infinity;
  private sourceName = '(waiting)';
  private rangeMin = 0; // tracked signal minimum (signed)
  private rangeMax = 0.05; // tracked signal maximum (signed)
  private lastNorm = 0;
  private smoothed = 0;
  private alpha = spotlightConfig.minAlpha;
  private lastDrawnAlpha = -1;
  private lastWarmOpacity = -1;
  private lastVarA = -1;

  // test mode
  private testMode = false;
  private testValue = 0;

  // debug
  private debugEl: HTMLDivElement;
  private debugBody!: HTMLDivElement; // assigned in buildDebugPanel()
  private lastDebugAt = 0;
  private frames = 0;
  private fps = 0;
  private lastFpsAt = 0;

  constructor(private scene: HTMLElement) {
    const cfg = spotlightConfig;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'spotlight-dark';
    this.canvas.width = cfg.canvasW;
    this.canvas.height = cfg.canvasH;
    this.canvas.style.opacity = String(cfg.blueOverlayOpacity);
    scene.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.warmEl = document.createElement('div');
    this.warmEl.className = 'spotlight-warm';
    this.warmEl.style.background = cfg.warmColor;
    this.warmEl.style.opacity = '0';
    scene.appendChild(this.warmEl);

    // mask loads exactly once; the softened working mask (extra feather +
    // downward offset baked in) is built once here and reused every redraw
    this.mask.onload = () => {
      this.buildSoftMask();
      this.maskLoaded = true;
      this.draw(true);
    };
    this.mask.src = cfg.maskPath;

    this.debugEl = this.buildDebugPanel();
    document.body.appendChild(this.debugEl);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        this.debugEl.style.display = this.debugEl.style.display === 'block' ? 'none' : 'block';
      }
    });

    this.draw(true); // initial dark-field even before the mask arrives
  }

  /** Feed the raw OSC light value (any range; sign ignored). */
  setSignal(v: number): void {
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    this.raw = v;
    this.rawAt = performance.now();
  }

  /**
   * Once per frame. `fallbackLevel` is the combined animal level (0..1) used
   * when no fresh /light OSC value exists; animals' own logic is untouched.
   */
  tick(dtMs: number, now: number, fallbackLevel: number): void {
    const cfg = spotlightConfig;
    const dt = clamp(dtMs, 1, 100);

    // fps
    this.frames++;
    if (now - this.lastFpsAt >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastFpsAt = now;
    }

    // 1. pick input
    let input: number;
    if (this.testMode) {
      input = this.testValue;
      this.sourceName = 'test slider';
    } else if (now - this.rawAt < cfg.oscFreshMs) {
      input = this.raw; // SIGNED — an LFO's trough maps to dark, crest to bright
      this.sourceName = '/light (OSC)';
    } else {
      input = clamp(fallbackLevel, 0, 1);
      this.sourceName = 'max(animal level)';
    }
    if (!Number.isFinite(input)) input = 0;

    // 2. normalize to 0..1: signed bipolar follow. autoRange tracks the raw
    // signal's own [min..max] (slow decay pulls them back together, so the
    // window re-adapts if the LFO amplitude changes); trough→0, crest→1.
    let norm: number;
    if (cfg.autoRange) {
      const spanNow = this.rangeMax - this.rangeMin;
      this.rangeMax = Math.max(input, this.rangeMax - (spanNow * dt) / 10000);
      this.rangeMin = Math.min(input, this.rangeMin + (spanNow * dt) / 10000);
      const span = this.rangeMax - this.rangeMin;
      norm = span > 0.02 ? (input - this.rangeMin) / span : 0;
    } else {
      const span = cfg.inputMax - cfg.inputMin;
      norm = span > 1e-6 ? (input - cfg.inputMin) / span : 0;
    }
    norm = clamp(norm, 0, 1);
    this.lastNorm = norm;

    // 3. noise gate
    if (norm < cfg.noiseGate) norm = 0;

    // 4. dt-based attack/release smoothing
    const tau = norm > this.smoothed ? cfg.attackMs : cfg.releaseMs;
    this.smoothed += (norm - this.smoothed) * (1 - Math.exp(-dt / tau));

    // 5. map to spotlight alpha
    this.alpha = clamp(cfg.minAlpha + this.smoothed * (cfg.maxAlpha - cfg.minAlpha), cfg.minAlpha, cfg.maxAlpha);

    this.draw(false);

    // publish light strength for the per-animal shading layers (cheap CSS var)
    if (Math.abs(this.alpha - this.lastVarA) > 0.005) {
      this.scene.style.setProperty('--light-A', this.alpha.toFixed(3));
      this.lastVarA = this.alpha;
    }

    // warm layer follows the same A (0.07 × A)
    const warm = +(cfg.warmLightOpacity * this.alpha).toFixed(4);
    if (warm !== this.lastWarmOpacity) {
      this.warmEl.style.opacity = String(warm);
      this.lastWarmOpacity = warm;
    }

    if (this.debugEl.style.display === 'block' && now - this.lastDebugAt > 250) {
      this.lastDebugAt = now;
      this.updateDebug();
    }
  }

  /**
   * Build the working mask ONCE: the provided PNG, gaussian-blurred by
   * featherPx for a wider/softer edge, shifted down by maskOffsetY. Used by
   * the dark-field eraser and (as a data URL) by the warm layer's CSS mask,
   * so both layers stay pixel-identical.
   */
  private buildSoftMask(): void {
    const cfg = spotlightConfig;
    const c = document.createElement('canvas');
    c.width = cfg.canvasW;
    c.height = cfg.canvasH;
    const g = c.getContext('2d')!;
    if (cfg.featherPx > 0) g.filter = `blur(${cfg.featherPx}px)`;
    g.drawImage(this.mask, 0, cfg.maskOffsetY * c.height, c.width, c.height);
    g.filter = 'none';
    this.softMask = c;

    const url = c.toDataURL('image/png');
    const maskCSS = `url('${url}') 50% 0 / ${cfg.maskScaleX * 100}% ${cfg.maskScaleY * 100}% no-repeat`;
    this.warmEl.style.webkitMaskImage = `url('${url}')`;
    (this.warmEl.style as any).webkitMask = maskCSS;
    (this.warmEl.style as any).mask = maskCSS;
  }

  /** Redraw the fused dark-field+hole canvas (only when A moved visibly). */
  private draw(force: boolean): void {
    if (!force && Math.abs(this.alpha - this.lastDrawnAlpha) < 0.002) return;
    const { ctx, canvas } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = spotlightConfig.blueColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.maskLoaded) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = this.alpha;
      // apex-anchored beam scaling (horizontal stretch centred, top pinned);
      // feather + vertical offset are already baked into softMask
      const src = this.softMask ?? this.mask;
      const w = canvas.width * spotlightConfig.maskScaleX;
      const h = canvas.height * spotlightConfig.maskScaleY;
      ctx.drawImage(src, (canvas.width - w) / 2, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    this.lastDrawnAlpha = this.alpha;
  }

  private buildDebugPanel(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'spotlight-debug';
    el.style.display = 'none';

    const head = document.createElement('div');
    head.textContent = 'Spotlight debug (press D to hide)';
    head.style.fontWeight = '600';
    head.style.marginBottom = '6px';
    el.appendChild(head);

    const testRow = document.createElement('label');
    testRow.style.display = 'flex';
    testRow.style.gap = '6px';
    testRow.style.alignItems = 'center';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => (this.testMode = cb.checked));
    const cbText = document.createElement('span');
    cbText.textContent = 'Test mode';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = '0';
    slider.style.flex = '1';
    slider.addEventListener('input', () => (this.testValue = Number(slider.value)));
    testRow.appendChild(cb);
    testRow.appendChild(cbText);
    testRow.appendChild(slider);
    el.appendChild(testRow);

    this.debugBody = document.createElement('div');
    this.debugBody.style.marginTop = '6px';
    el.appendChild(this.debugBody);
    return el;
  }

  private updateDebug(): void {
    const cfg = spotlightConfig;
    const sceneR = this.scene.getBoundingClientRect();
    const lines = [
      `source          ${this.sourceName}`,
      `raw OSC value   ${this.raw.toFixed(4)}`,
      `input range     [${cfg.inputMin}, ${cfg.inputMax}] autoRange=${cfg.autoRange} tracked=[${this.rangeMin.toFixed(2)}, ${this.rangeMax.toFixed(2)}]`,
      `normalized      ${this.lastNorm.toFixed(3)}`,
      `smoothed        ${this.smoothed.toFixed(3)}`,
      `spotlight alpha ${this.alpha.toFixed(3)}  (range ${cfg.minAlpha}–${cfg.maxAlpha})`,
      `blue overlay    ${cfg.blueOverlayOpacity}`,
      `warm opacity    ${(cfg.warmLightOpacity * this.alpha).toFixed(4)} (${cfg.warmColor} lighten)`,
      `FPS            ${this.fps}`,
      `mask loaded     ${this.maskLoaded} (${this.mask.naturalWidth}x${this.mask.naturalHeight})`,
      `canvas size     ${this.canvas.width}x${this.canvas.height} (display ${Math.round(sceneR.width)}x${Math.round(sceneR.height)})`,
      `mask scaled to  ${this.canvas.width}x${this.canvas.height} / CSS 100%x100%`,
    ];
    this.debugBody.textContent = lines.join('\n');
  }
}
