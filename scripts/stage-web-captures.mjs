// Receives originals into the existing card library. Does not admit inventory,
// confirm pairing, invoke AI, publish listings, or start a second library worker.
import {createClient} from '@libsql/client'
import {createHash} from 'node:crypto'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {captureStore} from '../lib/captureStore.mjs'
import {captureIntake} from '../lib/captureIntake.mjs'
const project=fileURLToPath(new URL('../../',import.meta.url))
const root=JSON.parse(await readFile(path.join(project,'intake/scanner-library-location.json'),'utf8')).path
const db=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN})
const hash=b=>createHash('sha256').update(b).digest('hex')
async function immutable(file,data){try{await writeFile(file,data,{flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e;if(hash(await readFile(file))!==hash(data))throw Error('Saved original differs from its receipt; inspection required')}}
try{
 const capture=captureStore(db),receipts=captureIntake(db),prior=await receipts.list(),sessions=await capture.list();let staged=0,skipped=0,blocked=0
 for(const s of sessions.filter(s=>s.status==='ready')){
  const recorded=(await db.execute({sql:'SELECT clips FROM capture_recordings WHERE session_id=?',args:[s.id]})).rows[0]
  if(recorded){
   const folder=path.join(root,'web-captures',s.id);await mkdir(folder,{recursive:true})
   const clips=JSON.parse(recorded.clips)
   for(const clip of clips){
    const chunks=[]
    for(let part=0;part<clip.parts;part++){
     const rows=(await db.execute({sql:'SELECT data FROM capture_voice WHERE session_id=? AND clip=? AND part=? ORDER BY offset',args:[s.id,clip.id,part]})).rows
     if(!rows.length)throw Error('Missing verified audio')
     chunks.push(...rows.map(r=>Buffer.from(r.data)))
    }
    clip.file=clip.id+(clip.mime.startsWith('audio/mp4')?'.m4a':clip.mime.startsWith('audio/ogg')?'.ogg':'.webm')
    await immutable(path.join(folder,clip.file),Buffer.concat(chunks))
   }
   await immutable(path.join(folder,'voice-timeline.json'),Buffer.from(JSON.stringify({clips,cards:s.cards},null,2)))
  }
  for(const card of s.cards){
  if(prior.some(r=>r.session_id===s.id&&r.card_id===card.id&&['imported','linked_existing'].includes(r.status))){skipped++;continue}
  const receipt={sessionId:s.id,cardId:card.id,front:card.front,back:card.back}
  try{
   const folder=path.join(root,'web-captures',s.id,card.id);await mkdir(folder,{recursive:true})
   const files={}
   for(const side of ['front','back']){const image=await capture.image(card[side]);if(hash(image.data)!==image.sha256)throw Error('Cloud original checksum mismatch');const file=path.join(folder,side+(image.mime==='image/png'?'.png':'.jpg'));await immutable(file,image.data);files[side]={path:file,sha256:image.sha256}}
   await immutable(path.join(folder,'manifest.json'),Buffer.from(JSON.stringify({version:1,sessionId:s.id,cardId:card.id,name:s.name,hints:s.hints,files},null,2)))
   await receipts.record({...receipt,status:'staged',message:'Originals verified in the card library. Awaiting the processing-worker handoff.'});staged++
  }catch(e){await receipts.record({...receipt,status:'blocked',message:e.message});blocked++}
 }
 }
 console.log(JSON.stringify({staged,skipped,blocked,inventoryCopiesCreated:0}))
}finally{db.close()}
