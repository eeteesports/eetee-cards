// A queue is derived from evidence; a price alone never proves intake complete.
export function intakeStage(card) {
 const p=card.intake, reasons=[]
 if(card.ownership&&!['owned','pending'].includes(card.ownership))return {stage:'excluded',reasons:['No longer owned']}
 if(['listed','sold','reserved'].includes(card.listing?.key))return {stage:'excluded',reasons:[card.listing.label]}
 if(!p)return {stage:'flags',reasons:['Processing evidence has not synced yet; readiness is unknown.']}
 if(p.processing===true)return {stage:'scan',reasons:['Processing in progress']}
 if(card.ownership==='pending')reasons.push('Not yet admitted to inventory')
 if(!p.images?.front||!p.images?.back)reasons.push('Missing front or back image')
 if(p.pairing!=='passed')reasons.push(p.pairing==='pending'?'Front/back verification pending':'Front/back pair needs attention')
 if(!p.identityComplete)reasons.push('Identity is incomplete or uncertain')
 if(!p.finishConfirmed)reasons.push('Parallel / base finish needs confirmation')
 for(const q of p.questions||[])reasons.push(q.reason||q.prompt||q.field||'Attribute needs review')
 if(p.imageReview)reasons.push('Image quality needs review')
 if(reasons.length)return {stage:'flags',reasons:[...new Set(reasons)]}
 const v=p.valuation
 if(!v||v.status!=='valued'||!Number.isFinite(v.low_usd)||!Number.isFinite(v.high_usd)||v.low_usd<0||v.high_usd<v.low_usd||!v.current)return {stage:'valuation',reasons:[v?.basis||'No current supported valuation.'],valuationStatus:v?.status||'not_researched'}
 return {stage:'ready',reasons:[],valuation:v}
}
export const CHOICES=['bin','auction','bundle','hold']
export function choiceInput(body){if(!body||typeof body.key!=='string'||body.key.length>250||!CHOICES.includes(body.choice)||typeof body.revision!=='string')throw Error('Choose a card and a valid selling decision.');const price=body.price===''||body.price==null?null:Number(body.price);if(price!==null&&(!Number.isFinite(price)||price<=0||price>10000000))throw Error('Enter a positive price.');return {key:body.key,choice:body.choice,price,revision:body.revision}}
export function evidenceStamp(c){return JSON.stringify([c.player,c.season,c.brand,c.set,c.number,c.parallel,c.serial,c.images])}
