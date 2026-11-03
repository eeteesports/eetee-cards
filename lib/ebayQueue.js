import 'server-only'
import {isPersonalCollection} from './collectionScope.mjs'
import {getTurso} from './db'
import catalog from './publicCatalog'
import {cardEditMap,applyPublicEdit} from './cardEdits.mjs'
import reservations from '../data/marketplace-reservations.json'
import teams from '../data/team-bundles.json'
const closed=new Set([...reservations.bundles,...(reservations.soldBundles||[]).map(b=>b.id)])
export async function ebayQueue(){
 const db=getTurso(),tables=new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>r.name)),[copies,locks,drafts,reviews,edits]=await Promise.all([
  tables.has('inventory_lookup_copies')?db.execute('SELECT copy_id,data FROM inventory_lookup_copies'):{rows:[]},
  tables.has('storefront_copy_locks')?db.execute('SELECT copy_id,status FROM storefront_copy_locks'):{rows:[]},
  tables.has('marketplace_listing_drafts')?db.execute("SELECT card_id,status,data,updated_at,result FROM marketplace_listing_drafts WHERE marketplace='ebay'"):{rows:[]},
  tables.has('storefront_image_reviews')?db.execute("SELECT card_id,side,status FROM storefront_image_reviews WHERE status NOT IN ('done','dismissed','corrected')"):{rows:[]},cardEditMap(db)
 ])
 const byId=new Map(copies.rows.map(r=>{const c=JSON.parse(r.data);return[c.publicId,{...c,copyId:r.copy_id}]})),byDraft=new Map(drafts.rows.map(r=>[r.card_id,r])),byLock=new Map(locks.rows.map(r=>[r.copy_id,r.status])),bundled=new Map(teams.bundles.flatMap(b=>b.cards.map(c=>[c.id,b.id])))
 const cards=catalog.cards.filter(c=>(c.priceCents||c.binPriceCents||0)>500).map(original=>{
  const c=applyPublicEdit(original,edits.get(original.id)),copy=byId.get(c.id),draft=byDraft.get(c.id),data=draft?JSON.parse(draft.data):null,blockers=[],warnings=[]
  if(isPersonalCollection({...copy,...(edits.get(c.id)?.data||{})}))blockers.push('Personal collection — not for sale')
  if(copy?.ownership!=='owned')blockers.push(copy?.ownership?`Copy is ${copy.ownership}`:'Ownership not synced')
  if(closed.has(bundled.get(c.id)))blockers.push('Reserved or sold team bundle')
  const lock=byLock.get(c.id);if(lock&&draft?.status!=='published')blockers.push('Copy is reserved: '+lock)
  if(copy?.parallelSuggested)warnings.push('Confirm suggested parallel')
  if(Number(c.year)<2020&&!c.graded)warnings.push('Check older-card condition')
  if(c.graded)warnings.push('Confirm grader, grade and certification')
  if(reviews.rows.some(r=>r.card_id===c.id))warnings.push('Open image correction request')
  if(!c.front||!c.back)blockers.push('Missing front or back image')
  return {id:c.id,copyId:copy?.copyId,player:c.player,year:c.year,set:c.set,number:c.number,parallel:c.parallel,serial:c.serial,price:(c.priceCents||c.binPriceCents)/100,front:`/api/admin/cards/${c.id}/image?side=front`,back:`/api/admin/cards/${c.id}/image?side=back`,status:blockers.length?'blocked':draft?.status||'needs_review',draftStatus:draft?.status||null,reviewed:Boolean(data&&Object.values(data.checks||{}).length===5&&Object.values(data.checks).every(v=>v===true)),blockers,warnings,updatedAt:draft?.updated_at||null,result:draft?.result?JSON.parse(draft.result):null}
 }).sort((a,b)=>b.price-a.price||a.player.localeCompare(b.player))
 return {cards,rule:'Individual site asking price > $5; 0% eBay markup',asOf:new Date().toISOString()}
}
