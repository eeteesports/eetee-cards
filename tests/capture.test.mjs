import test from 'node:test'
import assert from 'node:assert/strict'
import {createClient} from '@libsql/client'
import {createHash,randomUUID,randomBytes} from 'node:crypto'
import sharp from 'sharp'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {captureStore} from '../lib/captureStore.mjs'
import {CHUNK_BYTES,manifestInput} from '../lib/captureProtocol.mjs'
test('receipts, retries, incomplete uploads, retakes, and immutable completion',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'eetee-capture-test-')),db=createClient({url:'file:'+join(dir,'test.db')}),store=captureStore(db),sid=randomUUID()
 try{
 await store.create({id:sid,name:'Test session',hints:''})
 const png=await sharp(randomBytes(600*900*3),{raw:{width:600,height:900,channels:3}}).png().toBuffer()
 async function upload(){const id=randomUUID(),a={id,sessionId:sid,bytes:png.length,sha256:createHash('sha256').update(png).digest('hex'),mime:'image/png'};await store.start(a);await store.chunk({id,part:0,data:png.subarray(0,CHUNK_BYTES).toString('base64')});assert.deepEqual((await store.start(a)).parts,[0]);await assert.rejects(store.verify({id}),/incomplete/);for(let part=1;part<Math.ceil(png.length/CHUNK_BYTES);part++)await store.chunk({id,part,data:png.subarray(part*CHUNK_BYTES,(part+1)*CHUNK_BYTES).toString('base64')});const receipt=await store.verify({id});assert.equal(receipt.sha256,a.sha256);assert.equal(receipt.bytes,png.length);assert.equal(receipt.received,true);return a}
 const front=await upload(),back=await upload(),card={id:randomUUID(),front:front.id,back:back.id}
 assert.deepEqual((await store.image(front.id)).data,png)
 await assert.rejects(store.finish({id:sid,cards:[{...card,back:randomUUID()}]}),/every front/)
 assert.equal((await store.start(front)).verified,true)
 await store.chunk({id:front.id,part:0,data:png.subarray(0,CHUNK_BYTES).toString('base64')})
 await assert.rejects(store.start({...front,sha256:'0'.repeat(64)}),/different image/)
 const bad=Buffer.from(png.subarray(0,CHUNK_BYTES));bad[50]^=1
 await assert.rejects(store.chunk({id:front.id,part:0,data:bad.toString('base64')}),/conflicts/)
 const replacement=await upload(),manifest=[{...card,front:replacement.id}]
 assert.equal((await store.finish({id:sid,cards:manifest})).images,2)
 assert.equal((await store.finish({id:sid,cards:manifest})).status,'ready')
 await assert.rejects(store.finish({id:sid,cards:[card]}),/different cards/)
 const rows=await store.list();assert.equal(rows.length,1);assert.equal(rows[0].cards[0].front,replacement.id)
 assert.deepEqual((await store.image(front.id)).data,png,'retaken original preserved')
 await assert.rejects(upload(),/not found/)
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
})
test('reject duplicate sides and malformed manifests',()=>{const a=randomUUID(),b=randomUUID();assert.throws(()=>manifestInput([{id:randomUUID(),front:a,back:a}]),/own capture/);assert.throws(()=>manifestInput([{id:randomUUID(),front:a,back:b},{id:randomUUID(),front:a,back:randomUUID()}]),/own capture/);assert.throws(()=>manifestInput([]),/complete cards/)})
