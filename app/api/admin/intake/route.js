import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
import {intakeQueue,saveIntakeChoice} from '@/lib/intakeQueue'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
export async function GET(){if(!await getServerSession(authOptions))return Response.json({error:'Sign in required'},{status:401,headers});try{return Response.json(await intakeQueue(),{headers})}catch(e){return Response.json({error:e.message||'Could not load intake.'},{status:503,headers})}}
export async function POST(r){if(!await getServerSession(authOptions))return Response.json({error:'Sign in required'},{status:401,headers});if(!sameReviewOrigin(r))return Response.json({error:'Refresh before saving'},{status:403,headers});try{const t=await r.text();if(t.length>2000)throw Error('Request too large');return Response.json(await saveIntakeChoice(JSON.parse(t)),{headers})}catch(e){return Response.json({error:e.message||'Could not save decision'},{status:400,headers})}}
