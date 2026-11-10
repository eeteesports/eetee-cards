// Run with the SAME env file configured by the existing inventory lookup bridge.
import {execFileSync} from 'node:child_process'
import {createClient} from '@libsql/client'
import {fileURLToPath} from 'node:url'
import {evidenceStamp} from '../lib/intakeStages.mjs'
const local=JSON.parse(execFileSync(fileURLToPath(new URL('../../venv/bin/python3',import.meta.url)),[fileURLToPath(new URL('./intake-evidence.py',import.meta.url))],{maxBuffer:40*1024*1024})),byId=new Map(local.map(c=>[c.id,c]))
const db=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN})
const norm=v=>String(v??'').trim().toLowerCase()
try{
 await db.execute('CREATE TABLE IF NOT EXISTS inventory_intake_evidence(source_id TEXT NOT NULL,copy_id TEXT NOT NULL,stamp TEXT NOT NULL,data TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(source_id,copy_id))')
 const remote=(await db.execute('SELECT source_id,copy_id,data FROM inventory_lookup_copies')).rows
 let matched=0,held=0;const updates=[]
 for(const row of remote){const c=JSON.parse(row.data),local=byId.get(row.copy_id),i=local?.identity;if(!local||[['player','player'],['season','season'],['brand','manufacturer'],['set','set'],['number','card_number'],['parallel','parallel']].some(([a,b])=>norm(c[a])!==norm(i[b]))){held++;continue}
 updates.push({sql:'INSERT INTO inventory_intake_evidence VALUES(?,?,?,?,?) ON CONFLICT(source_id,copy_id) DO UPDATE SET stamp=excluded.stamp,data=excluded.data,updated_at=excluded.updated_at',args:[row.source_id,row.copy_id,evidenceStamp(c),JSON.stringify(local.intake),Date.now()]});matched++}
 for(let i=0;i<updates.length;i+=100)await db.batch(updates.slice(i,i+100),'write')
 console.log(JSON.stringify({matched,held,total:remote.length,inventoryFactsChanged:0,imagesChanged:0}))
}finally{db.close()}
