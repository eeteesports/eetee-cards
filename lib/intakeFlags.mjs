export const FLAG_GROUPS=[['base','Confirm Base'],['parallel','Confirm Parallel'],['attributes','Attribute Concern'],['images','Image Quality Concern'],['identity','Unknown Identity'],['system','Processing / Evidence']]
const fieldNames={season:'Year',manufacturer:'Manufacturer',card_number:'Card number',card_name:'Insert',serial:'Serial number',player:'Player',sport:'Sport',league:'League',team:'Team',rookie:'Rookie',autograph:'Autograph',memorabilia:'Relic',condition:'Condition'}
export const baseCandidate=v=>typeof v==='string'&&/^(base|none|no parallel|base card|no parallel finish)$/i.test(v.trim())
export function finishSuggestion(c){return c.intake?.finishCandidate??c.intake?.questions?.find(q=>q.field==='parallel')?.candidate??c.parallel??null}
export function cardFlags(c){
 const p=c.intake,flags=[]
 const add=(group,label)=>{if(!flags.some(f=>f.group===group&&f.label===label))flags.push({group,label})}
 if(!p){add('system',c.origin==='capture'?'Capture needs attention':'Processing evidence missing');return flags}
 const qs=p.questions||[],unknown=!p.identityComplete&&(!c.player||/^(unknown|unidentified|captured card)/i.test(c.player))
 if(unknown)add('identity','Identify card')
 if(!unknown&&(!p.finishConfirmed||qs.some(q=>q.field==='parallel'))){const v=finishSuggestion(c);add(baseCandidate(v)?'base':'parallel',baseCandidate(v)?'Confirm base':'Confirm finish')}
 if(!p.images?.front)add('images','Missing front')
 if(!p.images?.back)add('images','Missing back')
 if(p.pairing!=='passed')add('images','Check front/back match')
 if(p.imageReview||qs.some(q=>['images','capture'].includes(q.field)))add('images','Check image quality')
 if(!p.identityComplete&&!unknown)add('attributes','Complete card details')
 for(const q of qs){if(['parallel','pairing','images','capture'].includes(q.field))continue;if(q.field==='processing')add('system','Retry identification');else add('attributes','Confirm '+(fieldNames[q.field]||q.label||'attribute').toLowerCase())}
 if(c.ownership==='pending')add('system','Inventory admission pending')
 if(!flags.length)add('system','Reconcile processing evidence')
 return flags
}
