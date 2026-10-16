import {cardListPrice,isBargainCard} from './storefrontCart.mjs'
const yes=v=>v===true||v==='Yes'
export const CARD_TYPES=[['graded','Graded'],['autograph','Autograph'],['numbered','Serial numbered'],['rookie','Rookie'],['memorabilia','Patch / memorabilia'],['insert','Insert'],['parallel','Parallel'],['vintage','Vintage (pre-2000)']]
export const sportOf=c=>c.sport||'Football'
export function hasCardType(c,type){
 const serial=String(c.serial||'')
 switch(type){
 case 'graded':return yes(c.graded)||Boolean(c.grader&&c.grade)
 case 'autograph':return yes(c.autograph)||yes(c.autographed)
 case 'numbered':return Boolean(c.printRun>0||/\d\s*\/\s*\d|1\s*of\s*1/i.test(serial))
 case 'rookie':return yes(c.rookie)
 case 'memorabilia':return yes(c.memorabilia)
 case 'insert':return Boolean(c.family&&!/^(base|base card|none)$/i.test(c.family))
 case 'parallel':return Boolean(c.parallel&&!/^(base|none|standard)$/i.test(c.parallel))
 case 'vintage':return Number(c.year)>0&&Number(c.year)<2000
 default:return false
 }
}
export function matchesCard(c,f){
 const price=cardListPrice(c)
 if(f.tier&&f.tier!=='all'&&!(f.tier==='bins'?isBargainCard(c):f.tier==='higher'?!isBargainCard(c):price===Number(f.tier)))return false
 if(f.min!==''&&f.min!=null&&price<Math.round(Number(f.min)*100))return false
 if(f.max!==''&&f.max!=null&&price>Math.round(Number(f.max)*100))return false
 if(f.sport&&sportOf(c)!==f.sport)return false
 if(f.team&&!(c.teams||[]).includes(f.team))return false
 if(f.set&&c.set!==f.set)return false
 if(f.year&&String(c.year)!==f.year)return false
 if(f.types?.some(t=>!hasCardType(c,t)))return false
 const text=[c.player,c.year,c.brand,c.set,c.family,c.parallel,c.number,c.serial,c.grader,c.grade,sportOf(c),...(c.teams||[])].join(' ').toLowerCase()
 return String(f.query||'').toLowerCase().trim().split(/\s+/).every(word=>text.includes(word))
}
