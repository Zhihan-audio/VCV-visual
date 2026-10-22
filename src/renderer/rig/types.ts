export interface RigLayerDef {
  id: string;
  src: string;
  pivot: [number, number];
  parent: string | null;
  z: number;
  /** constant rest-pose offset [x%, y%] of the frame — repositions the cut
   *  art without touching the animation (not scaled by the motion gain) */
  offset?: [number, number];
}

export interface RigDef {
  id: string;
  label: string;
  canvas: { width: number; height: number };
  layers: RigLayerDef[];
}

export interface Transform {
  x?: number; // translate, in % of canvas width
  y?: number; // translate, in % of canvas height
  rotate?: number; // degrees
  scaleX?: number;
  scaleY?: number;
}
