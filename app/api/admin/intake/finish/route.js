import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
import {getTurso} from '@/lib/db'
import {intakeQueue} from '@/lib/intakeQueue'
export const dynamic='force-dynamic'
export const maxDuration=60
export async function POST(request){
 const headers={'Cache-Control':'private, no-store'}
 if(!await getServerSession(authOptions))return Response.json({error:'Sign in required'},{status:401,headers})
 if(!sameReviewOrigin(request))return Response.json({error:'Refresh before saving'},{status:403,headers})
 try{
  const text=await request.text();if(text.length>2000)throw Error('Request too large')
  const b=JSON.parse(text);if(typeof b.parallel!=='string'||b.parallel.length>180)throw Error('Enter a short parallel name')
  const c=(await intakeQueue()).cards.find(c=>c.key===b.key);if(!c||c.revision!==b.revision)throw Error('Card changed. Refresh before confirming.')
  if(!c.intake||!c.publicId)throw Error('Identify this card before confirming its finish.')
  const db=getTurso();await db.execute('CREATE TABLE IF NOT EXISTS inventory_finish_confirmations(copy_key TEXT PRIMARY KEY,source_stamp TEXT NOT NULL,parallel TEXT,confirmed_at INTEGER NOT NULL)')
  await db.execute('CREATE TABLE IF NOT EXISTS inventory_finish_history(copy_key TEXT,source_stamp TEXT,parallel TEXT,confirmed_at INTEGER)')
  const args=[c.key,c.finishSourceStamp,b.parallel.trim()||null,Date.now()]
  if(!args[1])throw Error('Refresh to load confirmation evidence.')
  await db.batch([{sql:'INSERT INTO inventory_finish_confirmations VALUES(?,?,?,?) ON CONFLICT(copy_key) DO UPDATE SET source_stamp=excluded.source_stamp,parallel=excluded.parallel,confirmed_at=excluded.confirmed_at',args},{sql:'INSERT INTO inventory_finish_history VALUES(?,?,?,?)',args}],'write')
  return Response.json({saved:true,published:false},{headers})
 }catch(e){return Response.json({error:e.message||'Could not confirm finish'},{status:400,headers})}
}
