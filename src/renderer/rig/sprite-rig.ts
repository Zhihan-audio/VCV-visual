import type { RigDef, Transform } from './types.js';

// bump when placeholder art is regenerated so the browser refetches it
const ASSET_VERSION = '17';

function transformToCSS(t: Transform): string {
  const x = t.x ?? 0;
  const y = t.y ?? 0;
  const rotate = t.rotate ?? 0;
  const sx = t.scaleX ?? 1;
  const sy = t.scaleY ?? 1;
  return `translate(${x}%, ${y}%) rotate(${rotate}deg) scale(${sx}, ${sy})`;
}

/**
 * Renders one animal's layered PNGs as nested absolutely-positioned DOM
 * elements. Layers are nested by `parent` so a transform on a parent
 * (e.g. "body" swaying) automatically carries its children along, and each
 * child then adds its own rotation/offset on top around its own pivot.
 */
export class SpriteRig {
  readonly canvasEl: HTMLDivElement;
  private layerEls = new Map<string, HTMLDivElement>();
  private layerOffsets = new Map<string, [number, number]>();

  constructor(container: HTMLElement, private rig: RigDef) {
    const frame = document.createElement('div');
    // animal-<id> lets the stage CSS give each musician its own spot/size
    frame.className = `animal-frame animal-${rig.id}`;

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = rig.label;
    frame.appendChild(label);

    this.canvasEl = document.createElement('div');
    this.canvasEl.className = 'rig-canvas';
    frame.appendChild(this.canvasEl);

    const byId = new Map(rig.layers.map((l) => [l.id, l]));
    const els = new Map<string, HTMLDivElement>();

    for (const layer of rig.layers) {
      const el = document.createElement('div');
      el.className = 'rig-layer';
      el.style.zIndex = String(layer.z);
      el.style.transformOrigin = `${layer.pivot[0] * 100}% ${layer.pivot[1] * 100}%`;
      if (layer.offset) {
        this.layerOffsets.set(layer.id, layer.offset);
        el.style.transform = transformToCSS({ x: layer.offset[0], y: layer.offset[1] });
      }

      const img = document.createElement('img');
      // cache-bust so regenerated placeholder art always shows during dev
      img.src = `${layer.src}?v=${ASSET_VERSION}`;
      img.draggable = false;
      el.appendChild(img);

      els.set(layer.id, el);
    }

    // attach in dependency order (parents before children don't strictly
    // matter for appendChild, but resolving parent-less roots first keeps
    // z-index/layout predictable)
    for (const layer of rig.layers) {
      const el = els.get(layer.id)!;
      const parentEl = layer.parent ? els.get(layer.parent) : undefined;
      if (layer.parent && !byId.has(layer.parent)) {
        throw new Error(`rig "${rig.id}": layer "${layer.id}" has unknown parent "${layer.parent}"`);
      }
      (parentEl ?? this.canvasEl).appendChild(el);
    }

    this.layerEls = els;
    container.appendChild(frame);
  }

  setTransform(layerId: string, t: Transform): void {
    const el = this.layerEls.get(layerId);
    if (!el) return;
    // rest-pose offset rides on top of the animated transform (gain-free)
    const off = this.layerOffsets.get(layerId);
    if (off) {
      t = { ...t, x: (t.x ?? 0) + off[0], y: (t.y ?? 0) + off[1] };
    }
    el.style.transform = transformToCSS(t);
  }

  applyAll(transforms: Record<string, Transform>): void {
    for (const [id, t] of Object.entries(transforms)) {
      this.setTransform(id, t);
    }
  }

  get id(): string {
    return this.rig.id;
  }
}
