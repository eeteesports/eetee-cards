import {createHmac,timingSafeEqual} from 'node:crypto'
import {processNextTask,scanObviousCrops,queueCardTask} from '@/lib/cardTasksStore'
export const dynamic='force-dynamic'
export const maxDuration=60
export async function POST(request){
 const at=request.headers.get('x-eetee-time'),signature=request.headers.get('x-eetee-signature')||'',secret=process.env.TURSO_AUTH_TOKEN
 if(!secret||!/^\d{13}$/.test(at||'')||Math.abs(Date.now()-Number(at))>60000||!/^[a-f0-9]{64}$/.test(signature))return new Response(null,{status:401})
 const body=await request.text(),expected=createHmac('sha256',secret).update(at+'\n'+body).digest('hex')
 if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return new Response(null,{status:401})
 try{const input=JSON.parse(body);let result;if(input.action==='queue_screened'){if(!Array.isArray(input.cards)||input.cards.length>12)return new Response(null,{status:400});const tasks=[];for(const c of input.cards)tasks.push(await queueCardTask({cardId:c.cardId,side:c.side,issues:['crop'],note:'Automatic inventory screen: remove obvious empty black surround while preserving all card and holder edges.'},'automatic',c.plan||null));result={tasks}}else result=input.action==='screen'?await scanObviousCrops():await processNextTask();return Response.json(result,{headers:{'Cache-Control':'private, no-store'}})}catch{return Response.json({error:'Background processing unavailable.'},{status:503})}
}
