// Search every term across attributes; word order and punctuation do not matter.
export const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
export const searchText = c => normalize([c.player,c.season,c.brand,c.set,c.number,c.family,c.parallel,c.serial,...(c.teams||[]),c.rookie?'rookie rc':'',c.autograph?'autograph auto':'',c.batch,c.id].join(' '))
export const matches = (text, query) => normalize(query).split(' ').filter(Boolean).every(term=>text.includes(term))
export function listingState({ownership,publicId,singles=new Set(),bundles=new Map(),locks=new Map(),drafts=new Map(),reservedBundles=new Set(),soldBundles=new Set()}) {
 const lock=locks.get(publicId),draft=drafts.get(publicId),bundle=bundles.get(publicId)
 if(ownership==='sold'||lock==='sold'||(bundle&&soldBundles.has(bundle.id)))return {key:'sold',label:'Sold'}
 if(ownership!=='owned')return {key:'departed',label:ownership==='traded'?'Traded':ownership==='removed'?'Removed':'Awaiting identification'}
 if(lock==='held'||(bundle&&reservedBundles.has(bundle.id)))return {key:'reserved',label:'Reserved'}
 if(['publishing','uncertain'].includes(draft)||lock==='marketplace'&&draft!=='published')return {key:'check',label:'Check marketplace status'}
 if(draft==='published')return {key:'listed',label:'Listed on eBay'}
 if(bundle)return {key:'listed',label:'Listed in team bundle',bundle:bundle.name||bundle.id}
 if(singles.has(publicId))return {key:'listed',label:'Listed on eetee.cards'}
 if(['draft','verified'].includes(draft))return {key:'draft',label:'Listing draft'}
 return {key:'not_listed',label:'Not listed'}
}
