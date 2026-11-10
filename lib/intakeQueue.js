import 'server-only'
import {captureStore} from './captureStore.mjs'
import {captureIntake} from './captureIntake.mjs'
import {createHash} from 'node:crypto'
import {getTurso} from './db'
import {inventoryLookup} from './inventoryLookupStore'
import {intakeStage,choiceInput} from './intakeStages.mjs'
let ready
async function init(){return ready ||= getTurso().execute('CREATE TABLE IF NOT EXISTS intake_selling_choices(copy_key TEXT PRIMARY KEY,choice TEXT NOT NULL,price REAL,revision TEXT NOT NULL,updated_at INTEGER NOT NULL)').catch(e=>{ready=null;throw e})}
export async function intakeQueue(){
 // Read the mirrored copies in one query: the native mirror can advance between
 // pagination requests, making a multi-page snapshot impossible to assemble.
 await init();const first=await inventoryLookup({offset:0,limit:100000}),records=first.records
 if(first.error)throw Error(first.error)
 if(records.length<first.total)throw Error('Inventory exceeds the supported queue size.')
 const choices=new Map((await getTurso().execute('SELECT * FROM intake_selling_choices')).rows.map(r=>[r.copy_key,r]))
 const cards=records.map(c=>{const revision=createHash('sha256').update(JSON.stringify([c.player,c.season,c.brand,c.set,c.number,c.parallel,c.serial,c.images,c.intake,c.finishSourceStamp])).digest('hex'),saved=choices.get(c.key);return {...c,...intakeStage(c),revision,decision:saved?{...saved,stale:saved.revision!==revision}:null}})
 const [sessions,receipts]=await Promise.all([captureStore(getTurso()).list(),captureIntake(getTurso()).list()])
 for(const session of sessions.filter(s=>s.status!=='capturing'))for(const pair of session.cards){
  const receipt=receipts.find(r=>r.session_id===session.id&&r.card_id===pair.id)
  if(receipt?.status==='linked_existing'||receipt?.status==='imported'&&cards.some(c=>c.id===receipt.copy_id))continue
  cards.push({key:'capture:'+pair.id,id:pair.id,revision:pair.front+':'+pair.back,player:'Captured card',batch:session.name,origin:'capture',images:{front:'/api/admin/capture/image?id='+pair.front,back:'/api/admin/capture/image?id='+pair.back},stage:receipt?.status==='blocked'?'flags':'scan',reasons:[receipt?.message||'Upload received. Awaiting processing-worker handoff.']})
 }
 return {cards,syncedAt:first.syncedAt,counts:Object.fromEntries(['scan','flags','valuation','ready'].map(s=>[s,cards.filter(c=>c.stage===s).length]))}
}
export async function saveIntakeChoice(body){const input=choiceInput(body),data=await intakeQueue(),card=data.cards.find(c=>c.key===input.key);if(!card||card.revision!==input.revision)throw Error('Card changed. Refresh and review the current details.');if(card.stage!=='ready'&&input.choice!=='hold')throw Error('Resolve intake issues before choosing a listing format.');await getTurso().execute({sql:'INSERT INTO intake_selling_choices VALUES(?,?,?,?,?) ON CONFLICT(copy_key) DO UPDATE SET choice=excluded.choice,price=excluded.price,revision=excluded.revision,updated_at=excluded.updated_at',args:[input.key,input.choice,input.price,input.revision,Date.now()]});return {saved:true,published:false}}
