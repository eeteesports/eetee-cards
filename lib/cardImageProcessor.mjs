import sharp from 'sharp'
import {adjustImagePixels} from './cardEditorInput.mjs'
import {createHash} from 'node:crypto'
import verifiedGeometry from '../data/verified-image-geometry.mjs'
export class ImageNeedsReview extends Error {}
export function brightnessFactor(note=''){
 if(/darken|reduce\s+(the\s+)?brightness|less\s+bright|do\s+not\s+brighten|don.t\s+brighten/i.test(note))throw new ImageNeedsReview('This lighting instruction needs a manual adjustment.')
 const range=note.match(/(\d+)\s*[–-]\s*(\d+)\s*%/),single=note.match(/(\d+)\s*%/)
 const percent=range?(Number(range[1])+Number(range[2]))/2:single?Number(single[1]):15
 if(percent<5||percent>20)throw new ImageNeedsReview('Brightness adjustments outside 5–20% need a manual review.')
 return 1+percent/100
}
const visible=(r,g,b)=>r+g+b>135&&Math.max(r,g,b)>55
async function foreground(buffer){
 const {data,info}=await sharp(buffer).rotate().resize({width:420,height:600,fit:'inside',withoutEnlargement:true}).removeAlpha().raw().toBuffer({resolveWithObject:true})
 const {width:w,height:h,channels:c}=info,points=[],rows=new Uint32Array(h),cols=new Uint32Array(w)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*c,r=data[i],g=data[i+1],b=data[i+2];if(visible(r,g,b)){rows[y]++;cols[x]++}}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*c;if(rows[y]>=w*.12&&cols[x]>=h*.10&&visible(data[i],data[i+1],data[i+2]))points.push([x,y])}
 if(points.length<w*h*.08)throw new ImageNeedsReview('The card boundary is too dark or ambiguous for a confident automatic crop.')
 return {points,w,h}
}
function bounds(points,angle=0){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const [x,y] of points){const u=x*c-y*s,v=x*s+y*c;left=Math.min(left,u);right=Math.max(right,u);top=Math.min(top,v);bottom=Math.max(bottom,v)}return {left,top,right,bottom,area:(right-left)*(bottom-top)}}
export async function correctCardImage(source,{issues,note=''}){
 if(issues.includes('other'))throw new ImageNeedsReview('Your custom request is saved for manual review; the current image has been kept.')
 if(!issues.length)throw new ImageNeedsReview('Select an image adjustment.')
 const original=await sharp(source).rotate().toBuffer(),meta=await sharp(original).metadata();let output=original;const changes=[]
 if(meta.width>6000||meta.height>6000)throw new ImageNeedsReview('This source is too large for the automatic processor.')
 const verified=verifiedGeometry[createHash('sha256').update(source).digest('hex')]
 if(verified&&(issues.includes('crop')||issues.includes('skew'))){
  const [left,top,right,bottom]=verified.crop;output=await sharp(original).extract({left,top,width:right-left,height:bottom-top}).rotate(verified.rotate,{background:{r:3,g:12,b:12}}).toBuffer();changes.push('Applied visually verified crop preserving all card and holder edges'+(verified.rotate?`; straightened ${verified.rotate}°`:''))
 }else if(issues.includes('crop')||issues.includes('skew')){
  const {points}=await foreground(original),base=bounds(points);let best={angle:0,area:base.area}
  if(issues.includes('skew'))for(let step=-30;step<=30;step++){const angle=step/10,box=bounds(points,angle);if(box.area<best.area)best={angle,area:box.area}}
  let angle=issues.includes('skew')&&best.area<base.area*.992?best.angle:0
  if(Math.abs(angle)>=2.9)throw new ImageNeedsReview('The tilt is beyond the confident automatic range; a manual geometry review is needed.')
  if(angle){output=await sharp(output).rotate(angle,{background:{r:3,g:12,b:12}}).toBuffer();changes.push(`Deskewed ${angle.toFixed(1)}°`)}
  if(issues.includes('crop')||angle){
   const {points,w,h}=await foreground(output),b=bounds(points),m=await sharp(output).metadata(),sx=m.width/w,sy=m.height/h
   // Extra margin keeps dark card borders and rounded corners intact.
   const padx=(b.right-b.left)*.075+2,pady=(b.bottom-b.top)*.10+2
   const left=Math.max(0,Math.floor((b.left-padx)*sx)),top=Math.max(0,Math.floor((b.top-pady)*sy)),right=Math.min(m.width,Math.ceil((b.right+padx)*sx)),bottom=Math.min(m.height,Math.ceil((b.bottom+pady)*sy)),width=right-left,height=bottom-top,ratio=width/height
   if(!((ratio>.56&&ratio<.92)||(ratio>1.1&&ratio<1.85))||width*height<m.width*m.height*.18)throw new ImageNeedsReview('The detected boundary does not confidently enclose a complete card. The original has been kept.')
   if(width<m.width*.985||height<m.height*.985){output=await sharp(output).extract({left,top,width,height}).toBuffer();changes.push('Removed empty scan background with a protective edge margin')}
  }
  if(!changes.length)throw new ImageNeedsReview('No confident geometry improvement was found. The image is waiting for a manual crop review.')
 }
 if(issues.includes('brightness')){const factor=brightnessFactor(note);output=await sharp(output).modulate({brightness:factor}).toBuffer();changes.push(`Brightness increased ${Math.round((factor-1)*100)}%; original colors and image content retained`)}
 const result=await sharp(output).webp({quality:95}).toBuffer(),after=await sharp(result).metadata()
 return {bytes:result,summary:changes.join('. ')+'.',width:after.width,height:after.height,processor:'card-image-fix-v1'}
}

export async function renderManualImage(source,settings){
 const input=await sharp(source,{limitInputPixels:24000000}).rotate().toBuffer(),m=await sharp(input).metadata(),left=Math.floor(settings.left*m.width),top=Math.floor(settings.top*m.height),right=Math.ceil(settings.right*m.width),bottom=Math.ceil(settings.bottom*m.height)
 let image=sharp(input).extract({left,top,width:Math.min(m.width,right)-left,height:Math.min(m.height,bottom)-top}).rotate(settings.rotation,{background:{r:3,g:12,b:12}})
 const {data,info}=await image.toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true})
 adjustImagePixels(data,info.channels,settings)
 return sharp(data,{raw:{width:info.width,height:info.height,channels:info.channels}}).webp({quality:95}).toBuffer()
}
