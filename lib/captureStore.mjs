import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {id,assetInput,manifestInput,CHUNK_BYTES,fail} from './captureProtocol.mjs'
export function captureStore(db) {
 let ready
 const init=()=>ready ||= db.batch([
  `CREATE TABLE IF NOT EXISTS capture_sessions(id TEXT PRIMARY KEY,name TEXT NOT NULL,hints TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'capturing',manifest TEXT,created_at INTEGER NOT NULL,finished_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS capture_assets(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,sha256 TEXT NOT NULL,bytes INTEGER NOT NULL,mime TEXT NOT NULL,chunks INTEGER NOT NULL,verified_at INTEGER,width INTEGER,height INTEGER)`,
  `CREATE TABLE IF NOT EXISTS capture_chunks(asset_id TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(asset_id,part))`,
  `CREATE INDEX IF NOT EXISTS capture_assets_session ON capture_assets(session_id)`
 ],'write').catch(e=>{ready=null;throw e})
 const session=async(sid)=>{id(sid);const s=(await db.execute({sql:'SELECT * FROM capture_sessions WHERE id=?',args:[sid]})).rows[0];if(!s)throw fail('Session not found.',404);return s}
 const asset=async(aid)=>{id(aid);const a=(await db.execute({sql:'SELECT * FROM capture_assets WHERE id=?',args:[aid]})).rows[0];if(!a)throw fail('Image not found.',404);return a}
 const bytes=async(aid)=>(await db.execute({sql:'SELECT data FROM capture_chunks WHERE asset_id=? ORDER BY part',args:[aid]})).rows.map(r=>Buffer.from(r.data))
 return {
  async list(){await init();return (await db.execute('SELECT s.*, (SELECT COUNT(*) FROM capture_assets a WHERE a.session_id=s.id AND a.verified_at IS NOT NULL) AS received FROM capture_sessions s ORDER BY created_at DESC LIMIT 100')).rows.map(s=>({...s,cards:s.manifest?JSON.parse(s.manifest):[]}))},
  async create(body){await init();id(body.id);if(typeof body.name!=='string'||body.name.length>120||typeof body.hints!=='string'||body.hints.length>2000)throw fail('Use a short session name and hints.');await db.execute({sql:'INSERT OR IGNORE INTO capture_sessions(id,name,hints,created_at) VALUES(?,?,?,?)',args:[body.id,body.name.trim()||'iPad capture',body.hints,Date.now()]});return session(body.id)},
  async start(body){await init();const a=assetInput(body);await session(a.sessionId)
   await db.execute({sql:"INSERT OR IGNORE INTO capture_assets(id,session_id,sha256,bytes,mime,chunks) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM capture_sessions WHERE id=? AND status='capturing')",args:[a.id,a.sessionId,a.sha256,a.bytes,a.mime,a.chunks,a.sessionId]})
   const saved=await asset(a.id);if(saved.sha256!==a.sha256||saved.session_id!==a.sessionId||Number(saved.bytes)!==a.bytes||saved.mime!==a.mime)throw fail('Capture identifier already belongs to a different image.',409)
   return {verified:!!saved.verified_at,parts:(await db.execute({sql:'SELECT part FROM capture_chunks WHERE asset_id=?',args:[a.id]})).rows.map(r=>Number(r.part))}
  },
  async chunk(body){await init();const a=await asset(body.id),part=body.part
   if(!Number.isSafeInteger(part)||part<0||part>=a.chunks||typeof body.data!=='string'||body.data.length>CHUNK_BYTES*1.4||! /^[A-Za-z0-9+/]+={0,2}$/.test(body.data))throw fail('Invalid image chunk.')
   const b=Buffer.from(body.data,'base64'),expected=Math.min(CHUNK_BYTES,Number(a.bytes)-part*CHUNK_BYTES);if(b.length!==expected)throw fail('Incomplete image chunk.')
   await db.execute({sql:"INSERT OR IGNORE INTO capture_chunks(asset_id,part,data) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM capture_sessions WHERE id=? AND status='capturing') AND EXISTS(SELECT 1 FROM capture_assets WHERE id=? AND verified_at IS NULL)",args:[a.id,part,b,a.session_id,a.id]})
   const old=(await db.execute({sql:'SELECT data FROM capture_chunks WHERE asset_id=? AND part=?',args:[a.id,part]})).rows[0]
   if(!old||!Buffer.from(old.data).equals(b))throw fail('Image chunk conflicts with a previous capture.',409)
   return {saved:true,part}
  },
  async verify(body){await init();const a=await asset(body.id);if(a.verified_at)return {id:a.id,sha256:a.sha256,bytes:Number(a.bytes),width:a.width,height:a.height,received:true}
   const parts=await bytes(a.id),b=Buffer.concat(parts)
   if(parts.length!==Number(a.chunks)||b.length!==Number(a.bytes)||createHash('sha256').update(b).digest('hex')!==a.sha256)throw fail('Upload is incomplete. Retry this image.',409)
   const m=await sharp(b,{limitInputPixels:50000000}).metadata();if(!['jpeg','png'].includes(m.format)||m.width<300||m.height<300)throw fail('Image is too small or not a supported photo.')
   await db.execute({sql:'UPDATE capture_assets SET verified_at=?,width=?,height=? WHERE id=?',args:[Date.now(),m.width,m.height,a.id]})
   return {id:a.id,sha256:a.sha256,bytes:b.length,width:m.width,height:m.height,received:true}
  },
  async finish(body){await init();id(body.id);const cards=manifestInput(body.cards),manifest=JSON.stringify(cards),tx=await db.transaction('write')
   try{const s=(await tx.execute({sql:'SELECT * FROM capture_sessions WHERE id=?',args:[body.id]})).rows[0];if(!s)throw fail('Session not found.',404)
    if(s.status!=='capturing'){if(s.manifest!==manifest)throw fail('Session already finished with different cards.',409);return {status:s.status,cards:cards.length,images:cards.length*2}}
    const received=new Set((await tx.execute({sql:'SELECT id FROM capture_assets WHERE session_id=? AND verified_at IS NOT NULL',args:[body.id]})).rows.map(a=>a.id))
    if(cards.some(c=>!received.has(c.front)||!received.has(c.back)))throw fail('Wait until every front and back is received.',409)
    await tx.execute({sql:"UPDATE capture_sessions SET status='ready',manifest=?,finished_at=? WHERE id=?",args:[manifest,Date.now(),body.id]});await tx.commit()
    return {status:'ready',cards:cards.length,images:cards.length*2}
   }catch(e){await tx.rollback();throw e}finally{tx.close()}
  },
  async image(aid){await init();const a=await asset(aid);if(!a.verified_at)throw fail('Image not received yet.',409);return {data:Buffer.concat(await bytes(aid)),mime:a.mime,sha256:a.sha256}}
 }
}
