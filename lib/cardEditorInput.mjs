export const TEXT_FIELDS=['player','cardName','year','brand','set','number','family','parallel','serial','sport','league','grader','grade','condition','collection','location','notes']
export const FLAG_FIELDS=['rookie','autograph','memorabilia','graded']
export const PUBLIC_FIELDS=[...TEXT_FIELDS.filter(k=>!['collection','location','notes'].includes(k)),...FLAG_FIELDS,'teams','printRun']
const bad=message=>Object.assign(Error(message),{status:400})
export const validCardId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id)
export function editorMetadata(body){if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Enter card attributes.');const data={}
 for(const k of TEXT_FIELDS){if(typeof body[k]!=='string'||body[k].length>(k==='notes'?2000:180))throw bad(`Check ${k}.`);data[k]=body[k].trim()}
 if(!data.player)throw bad('Player / subject is required.')
 for(const k of FLAG_FIELDS){if(body[k]!==null&&typeof body[k]!=='boolean')throw bad(`Check ${k}.`);data[k]=body[k]}
 if(!Array.isArray(body.teams)||body.teams.length>6||body.teams.some(x=>typeof x!=='string'||x.length>100))throw bad('Enter up to six teams.');data.teams=[...new Set(body.teams.map(x=>x.trim()).filter(Boolean))]
 for(const k of ['cost','value','printRun']){const v=body[k];if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000000))throw bad(`Check ${k}.`);if(k==='printRun'&&v!==null&&!Number.isSafeInteger(v))throw bad('Print run must be a whole number.');data[k]=v}
 return data
}
export function imageSettings(value){if(!value||typeof value!=='object')throw bad('Enter image settings.');const d={};for(const [key,min,max]of[['left',0,1],['top',0,1],['right',0,1],['bottom',0,1],['rotation',-180,180],['brightness',.5,1.5],['contrast',.5,1.5],['saturation',0,1.5],['gamma',.5,2]]){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw bad(`Check image ${key}.`);d[key]=n}if(d.right-d.left<.05||d.bottom-d.top<.05)throw bad('Keep at least 5% of the image in each direction.');return d}
export const DEFAULT_IMAGE_SETTINGS={left:0,top:0,right:1,bottom:1,rotation:0,brightness:1,contrast:1,saturation:1,gamma:1}
export function publicMetadata(data){return Object.fromEntries(Object.entries(data||{}).filter(([key])=>PUBLIC_FIELDS.includes(key)))}
export const LEGACY_FIELDS={player:'Player',cardName:'Card Name',year:'Year',brand:'Brand',set:'Set',number:'Card Number',parallel:'Parallel / Variant',serial:'Serial Number',sport:'Sport',league:'League',rookie:'Rookie',graded:'Graded',grader:'Grader',grade:'Grade',printRun:'Print Run',condition:'Condition',cost:'Cost Paid',value:'Estimated Value',notes:'Notes'}

export function adjustImagePixels(data,channels,s){
 for(let i=0;i<data.length;i+=channels){let r=data[i],g=data[i+1],b=data[i+2];if(s.gamma!==1){r=255*Math.pow(r/255,1/s.gamma);g=255*Math.pow(g/255,1/s.gamma);b=255*Math.pow(b/255,1/s.gamma)}r=(r*s.brightness-128)*s.contrast+128;g=(g*s.brightness-128)*s.contrast+128;b=(b*s.brightness-128)*s.contrast+128;const l=.2126*r+.7152*g+.0722*b;data[i]=Math.round(Math.max(0,Math.min(255,l+(r-l)*s.saturation)));data[i+1]=Math.round(Math.max(0,Math.min(255,l+(g-l)*s.saturation)));data[i+2]=Math.round(Math.max(0,Math.min(255,l+(b-l)*s.saturation)))}return data
}
