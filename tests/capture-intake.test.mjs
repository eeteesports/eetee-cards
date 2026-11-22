import test from 'node:test'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createClient} from '@libsql/client'
import {captureIntake} from '../lib/captureIntake.mjs'
test('handoff receipts require exact finished pair and preserve physical-copy linkage',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'intake-test-'));const db=createClient({url:'file:'+path.join(folder,'test.db')})
 try{
  await db.execute('CREATE TABLE capture_sessions(id TEXT,status TEXT,manifest TEXT)')
  await db.execute({sql:'INSERT INTO capture_sessions VALUES(?,?,?)',args:['s','ready',JSON.stringify([{id:'c',front:'f',back:'b'}])]})
  const q=captureIntake(db),r={sessionId:'s',cardId:'c',front:'f',back:'b'}
  await assert.rejects(q.record({...r,front:'other',status:'staged'}),/changed/)
  await assert.rejects(q.record({...r,status:'imported'}),/receipt required/)
  await q.record({...r,status:'staged'});await q.record({...r,status:'linked_existing',copyId:'old'})
  await q.record({...r,status:'linked_existing',copyId:'old'})
  await assert.rejects(q.record({...r,status:'imported',copyId:'new'}),/reassigned/)
  assert.equal((await q.list()).length,1)
 }finally{db.close();await rm(folder,{recursive:true,force:true})}
})
