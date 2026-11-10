import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
import {getTurso} from '@/lib/db'
import {intakeQueue} from '@/lib/intakeQueue'
import {finishRequests} from '@/lib/finishGroups.mjs'
export const dynamic='force-dynamic'
export const maxDuration=60
export async function POST(request){
 const headers={'Cache-Control':'private, no-store'}
 if(!await getServerSession(authOptions))return Response.json({error:'Sign in required'},{status:401,headers})
 if(!sameReviewOrigin(request))return Response.json({error:'Refresh before saving'},{status:403,headers})
 try{
  const text=await request.text();if(text.length>100000)throw Error('Request too large')
  const items=finishRequests(JSON.parse(text)),cards=new Map((await intakeQueue()).cards.map(c=>[c.key,c]))
  const confirmed=items.map(b=>{const c=cards.get(b.key);if(!c||c.revision!==b.revision)throw Error('A selected card changed. Nothing was saved; refresh and review the selection.')
   if(!c.intake||!c.publicId||!c.finishSourceStamp)throw Error('A selected card is not ready for finish confirmation.')
   return {c,b}
  })
  const db=getTurso();await db.execute('CREATE TABLE IF NOT EXISTS inventory_finish_confirmations(copy_key TEXT PRIMARY KEY,source_stamp TEXT NOT NULL,parallel TEXT,confirmed_at INTEGER NOT NULL)')
  await db.execute('CREATE TABLE IF NOT EXISTS inventory_finish_history(copy_key TEXT,source_stamp TEXT,parallel TEXT,confirmed_at INTEGER)')
  const at=Date.now(),statements=confirmed.flatMap(({c,b})=>{const args=[c.key,c.finishSourceStamp,b.parallel||null,at];return [{sql:'INSERT INTO inventory_finish_confirmations VALUES(?,?,?,?) ON CONFLICT(copy_key) DO UPDATE SET source_stamp=excluded.source_stamp,parallel=excluded.parallel,confirmed_at=excluded.confirmed_at',args},{sql:'INSERT INTO inventory_finish_history VALUES(?,?,?,?)',args}]})
  await db.batch(statements,'write')
  return Response.json({saved:true,count:confirmed.length,keys:confirmed.map(({c})=>c.key),published:false},{headers})
 }catch(e){return Response.json({error:e.message||'Could not confirm finish'},{status:400,headers})}
}
