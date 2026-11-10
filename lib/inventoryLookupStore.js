import 'server-only'
import {createHash} from 'node:crypto'
import {getTurso} from './db'
import catalog from './publicCatalog'
import teams from '../data/team-bundles.json'
import reservations from '../data/marketplace-reservations.json'
import {cardEditMap,applyPublicEdit} from './cardEdits.mjs'
import {listingState} from './inventoryLookup.mjs'
import {evidenceStamp} from './intakeStages.mjs'
export const privateHeaders={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
export async function inventoryLookup({offset=0,limit=1000}={}){
 const db=getTurso()
 const tables=new Set((await db.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>r.name))
 if(!tables.has('inventory_lookup_sync'))return {records:[],syncedAt:null,error:'The scanner library has not synced yet. This is not an empty collection.'}
 const [copies,sync,locks,drafts,count]=await Promise.all([
  db.execute({sql:'SELECT source_id,copy_id,data FROM inventory_lookup_copies ORDER BY source_id,copy_id LIMIT ? OFFSET ?',args:[limit,offset]}),
  db.execute('SELECT source_id,synced_at,copy_count FROM inventory_lookup_sync ORDER BY synced_at DESC'),
  tables.has('storefront_copy_locks')?db.execute('SELECT copy_id,status FROM storefront_copy_locks'):{rows:[]},
  tables.has('marketplace_listing_drafts')?db.execute('SELECT card_id,status FROM marketplace_listing_drafts'):{rows:[]},
  db.execute('SELECT COUNT(*) AS total FROM inventory_lookup_copies')
 ])
 const singles=new Set(catalog.cards.map(c=>c.id)),bundles=new Map(teams.bundles.flatMap(b=>b.cards.map(c=>[c.id,{id:b.id,name:b.team+' · '+b.name}])))
 const state={singles,bundles,locks:new Map(locks.rows.map(r=>[r.copy_id,r.status])),drafts:new Map(),reservedBundles:new Set(reservations.bundles),soldBundles:new Set((reservations.soldBundles||[]).map(b=>b.id))}
 // Pending/uncertain submissions take priority over ordinary drafts.
 const priority={draft:1,verified:2,published:3,publishing:4,uncertain:5}
 for(const d of drafts.rows)if((priority[d.status]||0)>(priority[state.drafts.get(d.card_id)]||0))state.drafts.set(d.card_id,d.status)
 const evidence=tables.has('inventory_intake_evidence')?new Map((await db.execute('SELECT source_id,copy_id,stamp,data FROM inventory_intake_evidence')).rows.map(r=>[r.source_id+':'+r.copy_id,r])):new Map()
 const edits=await cardEditMap(db)
 const records=copies.rows.map(row=>{
  const c=JSON.parse(row.data),publicId=createHash('sha256').update(row.copy_id).digest('hex').slice(0,16)
  const receipt=evidence.get(row.source_id+':'+row.copy_id);if(receipt&&receipt.stamp===evidenceStamp(c))c.intake=JSON.parse(receipt.data)
  const edit=edits.get(publicId);const edited={...c,...(edit?.data||{})};edited.season=edit?.data?.year??c.season;if(edit?.data?.parallel!==undefined)edited.parallelSuggested=false
  if(c.intake&&edit?.data&&Object.keys(edit.data).some(k=>!['cost','value','notes','collection','location'].includes(k)&&JSON.stringify(edit.data[k])!==JSON.stringify(c[k==='year'?'season':k])))edited.intake={...c.intake,identityComplete:false,questions:[...(c.intake.questions||[]),{reason:'Web card details changed; processing evidence needs reconciliation.'}],valuation:{...c.intake.valuation,current:false}}
  return {...edited,publicId,sourceId:row.source_id,key:row.source_id+':'+row.copy_id,listing:listingState({...state,ownership:c.ownership,publicId}),images:Object.fromEntries(['front','back'].map(side=>[side,c.images?.[side]?'/api/admin/inventory/image?'+new URLSearchParams({source:row.source_id,id:row.copy_id,side,v:c.images[side]}):null]))}
 }).sort((a,b)=>String(b.created).localeCompare(String(a.created))||a.id.localeCompare(b.id))
 return {records,total:Number(count.rows[0].total),syncedAt:sync.rows[0]?.synced_at||null,sources:sync.rows}
}
export async function lookupCard(id){
 const row=(await getTurso().execute({sql:"SELECT source_id,copy_id,data FROM inventory_lookup_copies WHERE json_extract(data,'$.publicId')=? LIMIT 1",args:[id]})).rows[0]
 return row?{...JSON.parse(row.data),sourceId:row.source_id}:null
}
export async function inventoryImage(source,id,side){
 if(!source||!id||!['front','back'].includes(side))return null
 const publicId=createHash('sha256').update(id).digest('hex').slice(0,16)
 const tables=await getTurso().execute("SELECT name FROM sqlite_master WHERE name='storefront_image_current'")
 if(tables.rows.length){const current=await getTurso().execute({sql:'SELECT v.output_bytes FROM storefront_image_current c JOIN storefront_image_versions v ON v.id=c.revision_id WHERE c.image_key=?',args:[publicId+':'+side]});if(current.rows[0])return Buffer.from(current.rows[0].output_bytes,'base64')}
 const result=await getTurso().execute({sql:'SELECT data FROM inventory_lookup_images WHERE source_id=? AND copy_id=? AND side=?',args:[source,id,side]})
 return result.rows[0]?Buffer.from(result.rows[0].data,'base64'):null
}
