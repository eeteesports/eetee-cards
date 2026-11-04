import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

// Exercise the actual server function without loading credentials, Next's
// server-only runtime, or a network database.
const source=await readFile(new URL('../lib/cardTasksStore.js',import.meta.url),'utf8')
const code=source.slice(source.indexOf('export async function scanObviousCrops(){'),source.indexOf('export async function cropScanStatus'))
function fixture({cards=[],checked=[],revisions=[],crop=null}={}){
 const queries=[],loaded=[],queued=[],written=[]
 const db={async execute(query){
  const sql=typeof query==='string'?query:query.sql;queries.push(sql)
  if(sql.startsWith('CREATE TABLE'))return {rows:[]}
  if(sql==='SELECT data FROM inventory_lookup_copies')return {rows:[]}
  if(sql==='SELECT image_key FROM owner_image_screenings')return {rows:checked.map(image_key=>({image_key}))}
  if(sql==='SELECT card_id,side,revision_id FROM storefront_image_current')return {rows:revisions}
  if(sql==='SELECT v.* FROM storefront_image_current c JOIN storefront_image_versions v ON v.id=c.revision_id WHERE c.image_key=?'){
   const revision=revisions.find(r=>r.card_id+':'+r.side===query.args[0]);return {rows:revision?[{id:revision.revision_id,source_bytes:'unneeded original bytes',output_bytes:'unneeded rendered bytes'}]:[]}
  }
  if(sql.startsWith('INSERT OR IGNORE')){written.push(query.args);return {rows:[]}}
  throw Error('Unexpected query (including forbidden per-image byte fetch): '+sql)
 }}
 const scan=new Function('initializeTasks','getTurso','catalog','teams','editableCard','editorImageBytes','obviousBlackBorderSettings','queueCardTask','currentImage',code.replace('export ','')+';return scanObviousCrops')(
  async()=>{},()=>db,{cards},{bundles:[]},async id=>({id}),async(card,side)=>{loaded.push([card.id,side]);return Buffer.from('image')},async()=>crop,async task=>queued.push(task),async(db,id,side)=>(await db.execute({sql:'SELECT v.* FROM storefront_image_current c JOIN storefront_image_versions v ON v.id=c.revision_id WHERE c.image_key=?',args:[id+':'+side]})).rows[0]||null)
 return {scan,queries,loaded,queued,written}
}
test('completed 2200-card pass uses four metadata queries and loads no image bytes',async()=>{
 const cards=Array.from({length:2200},(_,i)=>({id:String(i),front:'front',back:'back'}))
 const checked=cards.flatMap(c=>['front','back'].map(side=>`${c.id}:${side}:original`))
 const f=fixture({cards,checked});assert.deepEqual(await f.scan(),{results:[],more:false})
 assert.equal(f.queries.length,4);assert.deepEqual(f.loaded,[]);assert.deepEqual(f.queued,[])
})
test('only a changed image revision is screened and queued; absent sides stay skipped',async()=>{
 const f=fixture({cards:[{id:'a',front:'front',back:'back'},{id:'b',front:'front'}],checked:['a:front:old','a:back:original','b:front:original'],revisions:[{card_id:'a',side:'front',revision_id:'new'}],crop:{left:.1}})
 const result=await f.scan();assert.deepEqual(result,{results:[{cardId:'a',side:'front',status:'queued'}],more:false})
 assert.deepEqual(f.loaded,[['a','front']]);assert.equal(f.queued.length,1);assert.equal(f.written[0][0],'a:front:new')
})
test('unseen images retain the eight-image batch limit and continue on the next call',async()=>{
 const f=fixture({cards:Array.from({length:10},(_,i)=>({id:String(i),front:'front'}))})
 const result=await f.scan();assert.equal(result.results.length,8);assert.equal(result.more,true)
 assert.equal(f.loaded.length,8);assert.equal(f.written.length,8);assert.deepEqual(f.queued,[])
})
