// Run after npm run build. Uses only an isolated temporary SQLite database.
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {randomBytes} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createClient} from '@libsql/client'
import {evidenceStamp} from '../lib/intakeStages.mjs'
test('authenticated queues, durable choices, revision conflicts and origin protection',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'intake-api-')),url='file:'+path.join(folder,'test.db'),db=createClient({url}),base='http://localhost:3149',password=randomBytes(24).toString('hex');let child
 try{
  const card={id:'test-copy',player:'Test Player',season:'2026',brand:'Test',set:'Test Set',number:'1',parallel:null,images:{front:'revision1',back:'revision1'},ownership:'owned',created:'2026-11-10',batch:'Test Batch'}
  await db.batch(['CREATE TABLE inventory_lookup_copies(source_id TEXT,copy_id TEXT,data TEXT)','CREATE TABLE inventory_lookup_sync(source_id TEXT,synced_at INTEGER,copy_count INTEGER)','CREATE TABLE inventory_intake_evidence(source_id TEXT,copy_id TEXT,stamp TEXT,data TEXT,updated_at INTEGER)'],'write')
  const evidence={images:{front:true,back:true},pairing:'passed',identityComplete:true,finishConfirmed:true,questions:[],valuation:{status:'valued',current:true,low_usd:2,high_usd:4,basis:'Isolated test fixture'}}
  await db.batch([{sql:'INSERT INTO inventory_lookup_copies VALUES(?,?,?)',args:['test',card.id,JSON.stringify(card)]},{sql:'INSERT INTO inventory_lookup_sync VALUES(?,?,?)',args:['test',Date.now(),1]},{sql:'INSERT INTO inventory_intake_evidence VALUES(?,?,?,?,?)',args:['test',card.id,evidenceStamp(card),JSON.stringify(evidence),Date.now()]}],'write')
  child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3149'],{env:{...process.env,TURSO_DATABASE_URL:url,TURSO_AUTH_TOKEN:'local-test',ADMIN_PASSWORD:password,NEXTAUTH_SECRET:randomBytes(32).toString('hex'),NEXTAUTH_URL:base},stdio:['ignore','pipe','pipe']})
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Test server startup timed out')),10000);child.stdout.on('data',b=>{if(String(b).includes('Ready in')){clearTimeout(timer);resolve()}});child.on('exit',()=>{clearTimeout(timer);reject(Error('Test server exited'))})})
  const jar=new Map();async function request(p,options={}){const r=await fetch(base+p,{...options,redirect:'manual',headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...options.headers}});for(const value of r.headers.getSetCookie()){const part=value.split(';')[0],i=part.indexOf('=');jar.set(part.slice(0,i),part.slice(i+1))}return r}
  assert.equal((await request('/api/admin/intake')).status,401)
  const csrf=await(await request('/api/auth/csrf')).json();await request('/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:csrf.csrfToken,password,callbackUrl:base+'/admin/ready',json:'true'})})
  const initial=await(await request('/api/admin/intake')).json();assert.equal(initial.counts.ready,1);const c=initial.cards[0]
  const post=(body,origin=base)=>request('/api/admin/intake',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)})
  assert.equal((await post({key:c.key,revision:c.revision,choice:'bin',price:3},'https://example.org')).status,403)
  const saved=await post({key:c.key,revision:c.revision,choice:'bin',price:3});assert.equal(saved.status,200);assert.equal((await saved.json()).published,false)
  const again=await(await request('/api/admin/intake')).json();assert.equal(again.cards[0].decision.choice,'bin');assert.equal(again.cards[0].decision.price,3)
  card.parallel='Changed';await db.execute({sql:'UPDATE inventory_lookup_copies SET data=?',args:[JSON.stringify(card)]})
  assert.notEqual((await post({key:c.key,revision:c.revision,choice:'auction',price:1})).status,200)
  const changed=await(await request('/api/admin/intake')).json();assert.equal(changed.cards[0].stage,'flags');assert.equal(changed.cards[0].decision.stale,true)
 }finally{if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve))}db.close();await rm(folder,{recursive:true,force:true})}
})
