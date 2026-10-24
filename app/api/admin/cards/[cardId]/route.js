import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {editableCard,saveEditedCard} from '@/lib/cardEditorStore'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
export async function GET(request,{params}){if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers});try{const card=await editableCard(params.cardId);return Response.json(card,{headers})}catch(e){return Response.json({error:e.status?e.message:'Could not load card.'},{status:e.status||503,headers})}}
export async function PATCH(request,{params}){
 if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers});if(!sameReviewOrigin(request))return Response.json({error:'Refresh before saving.'},{status:403,headers})
 try{const raw=await request.text();if(Buffer.byteLength(raw)>18000)return Response.json({error:'Card update is too large.'},{status:413,headers});let body;try{body=JSON.parse(raw)}catch{return Response.json({error:'Invalid card update.'},{status:400,headers})}return Response.json(await saveEditedCard(params.cardId,body),{headers})}catch(e){console.error('Card editor save failed',e.code||e.name);return Response.json({error:e.status?e.message:'Could not save. Your previous card is unchanged.'},{status:e.status||503,headers})}
}
