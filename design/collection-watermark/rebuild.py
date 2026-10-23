import json
from PIL import Image,ImageOps
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'design/collection-watermark/source-manifest.json';m=json.load(open(p))
canvas=Image.new('RGB',(1800,1680))
for i,x in enumerate(m['images']):
 crop=x['pre_crop']
 im=ImageOps.exif_transpose(Image.open(root/'public'/x['path'].split('/public/')[1])).convert('RGB');w,h=im.size
 im=im.crop(tuple(round(n*v) for n,v in zip(crop,[w,h,w,h])))
 if x['rotate']:im=im.transpose(Image.Transpose.ROTATE_90)
 im=ImageOps.fit(im,(300,420),method=Image.Resampling.LANCZOS)
 canvas.paste(im,((i%6)*300,(i//6)*420))
m.update(gap=0,margin=0,size=1800,tile_aspect=5/7,layout_fit='Proportional cover after manual card-edge crops; landscape cards rotated 90 degrees.')
json.dump(m,open(p,'w'),indent=2);canvas.save(root/'public/collection-watermark.jpg',quality=70,optimize=True)
