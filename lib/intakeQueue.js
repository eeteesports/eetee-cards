import 'server-only'
import {createHash} from 'node:crypto'
import {getTurso} from './db'
import {inventoryLookup} from './inventoryLookupStore'
import {intakeStage,choiceInput} from './intakeStages.mjs'
let ready
async function init(){return ready ||= getTurso().execute('CREATE TABLE IF NOT EXISTS intake_selling_choices(copy_key TEXT PRIMARY KEY,choice TEXT NOT NULL,price REAL,revision TEXT NOT NULL,updated_at INTEGER NOT NULL)').catch(e=>{ready=null;throw e})}
export async function intakeQueue(){
 await init();let records=[],first=await inventoryLookup({offset:0,limit:1000});records.push(...first.records)
 if(first.error)throw Error(first.error)
 for(let offset=1000;offset<first.total;offset+=1000){const next=await inventoryLookup({offset,limit:1000});if(next.syncedAt!==first.syncedAt)throw Error('Inventory changed during loading. Refresh to try again.');records.push(...next.records)}
 const choices=new Map((await getTurso().execute('SELECT * FROM intake_selling_choices')).rows.map(r=>[r.copy_key,r]))
 const cards=records.map(c=>{const revision=createHash('sha256').update(JSON.stringify([c.player,c.season,c.brand,c.set,c.number,c.parallel,c.serial,c.images,c.intake])).digest('hex'),saved=choices.get(c.key);return {...c,...intakeStage(c),revision,decision:saved?{...saved,stale:saved.revision!==revision}:null}})
 return {cards,syncedAt:first.syncedAt,counts:Object.fromEntries(['scan','flags','valuation','ready'].map(s=>[s,cards.filter(c=>c.stage===s).length]))}
}
export async function saveIntakeChoice(body){const input=choiceInput(body),data=await intakeQueue(),card=data.cards.find(c=>c.key===input.key);if(!card||card.revision!==input.revision)throw Error('Card changed. Refresh and review the current details.');if(card.stage!=='ready'&&input.choice!=='hold')throw Error('Resolve intake issues before choosing a listing format.');await getTurso().execute({sql:'INSERT INTO intake_selling_choices VALUES(?,?,?,?,?) ON CONFLICT(copy_key) DO UPDATE SET choice=excluded.choice,price=excluded.price,revision=excluded.revision,updated_at=excluded.updated_at',args:[input.key,input.choice,input.price,input.revision,Date.now()]});return {saved:true,published:false}}
