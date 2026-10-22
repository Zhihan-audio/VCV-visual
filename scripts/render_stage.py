#!/usr/bin/env python3
"""Offline-render the stage exactly as the CSS lays it out, so layout can be
verified/tuned without the flaky browser preview.

Frame model (matches main.css):
  scene: 16:9, width SCENE_W px.
  each .animal-frame: square, width = size% * SCENE_W; centered at left=x%;
  bottom = y% of scene HEIGHT. The rig canvas (square PNG) fills the frame.
"""
import sys, numpy as np
from PIL import Image, ImageDraw

APP="/Users/yilao/Desktop/音画交互程序开发/2D动画交互/app"
LAYERS={"hippo":["base","strumHand","head"],"bear":["base","stickL","stickR","head"],
        "parrot":["base","micWing","head"],"monkey":["base","strumArm","head"],
        "owl":["base","fingerL","fingerR","head"],"cat":["base","handL","handR","head"],
        "rabbit":["base","bowArm","head"]}
Z={"bear":1,"hippo":2,"cat":3,"owl":4,"monkey":5,"parrot":6,"rabbit":7}

# (x, y, size)  -- edit these to tune
POS = {
 "monkey":(21.2, 9.2,16.9),
 "cat":   (32.6,12.5,14.4),
 "bear":  (42.2,15.7,14.3),
 "parrot":(50.1, 8.4,16.5),
 "owl":   (62.2, 6.0,18.0),
 "hippo": (72.7,17.4,13.4),
 "rabbit":(82.5, 8.9,16.0),
}

SCENE_W=1600; SCENE_H=SCENE_W*9//16

def composite_animal(a):
    canvas=None
    for n in LAYERS[a]:
        im=Image.open(f"{APP}/assets/layers/{a}/{n}.png").convert("RGBA")
        if canvas is None: canvas=Image.new("RGBA",im.size,(0,0,0,0))
        if im.size!=canvas.size: im=im.resize(canvas.size)
        canvas.alpha_composite(im)
    return canvas

def content_bbox_frac(a):
    im=composite_animal(a); W,H=im.size
    aA=np.array(im)[:,:,3]
    ys,xs=np.where(aA>60)
    return xs.min()/W,xs.max()/W,ys.min()/H,ys.max()/H,im

def main():
    bg=Image.open(f"{APP}/assets/bg/stage.png").convert("RGBA").resize((SCENE_W,SCENE_H))
    scene=bg.copy()
    spans={}
    for a in sorted(POS, key=lambda k:Z[k]):
        x,y,size=POS[a]
        cx0,cx1,cy0,cy1,im=content_bbox_frac(a)
        fw=int(size/100*SCENE_W)                       # frame px (square)
        left=int(x/100*SCENE_W - fw/2)
        top=int(SCENE_H - y/100*SCENE_H - fw)
        rim=im.resize((fw,fw))
        scene.alpha_composite(rim,(left,top))
        spans[a]=( (left+cx0*fw)/SCENE_W*100, (left+cx1*fw)/SCENE_W*100 )
    # overlap report (order by left)
    order=sorted(spans,key=lambda k:spans[k][0])
    print("content spans (% scene width):")
    for a in order: print(f"  {a:7s} [{spans[a][0]:5.1f},{spans[a][1]:5.1f}]  w={spans[a][1]-spans[a][0]:4.1f}")
    print("adjacent overlaps:")
    worst=0
    for i in range(len(order)-1):
        a,b=order[i],order[i+1]
        ov=max(0,spans[a][1]-spans[b][0])
        wa=spans[a][1]-spans[a][0]; wb=spans[b][1]-spans[b][0]
        pa,pb=ov/wa*100,ov/wb*100; worst=max(worst,pa,pb)
        flag=" <== >1/5" if max(pa,pb)>20 else ""
        print(f"  {a:7s}/{b:7s}: ov={ov:4.1f}  {pa:4.0f}%/{pb:4.0f}%{flag}")
    print(f"worst overlap ratio: {worst:.0f}%")
    scene.convert("RGB").save("/private/tmp/claude-501/-Users-yilao-Desktop---------/7bd72c28-334e-42f5-a7aa-27cbbb0934c5/scratchpad/stage_render.jpg",quality=90)
    print("saved stage_render.jpg")

if __name__=="__main__": main()
