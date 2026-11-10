import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {getTurso} from '@/lib/db'
import {captureStore} from '@/lib/captureStore.mjs'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
export const dynamic='force-dynamic'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
let store
const getStore=()=>store ||= captureStore(getTurso())
export async function GET(){if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers});try{return Response.json({sessions:await getStore().list()},{headers})}catch{return Response.json({error:'Capture inbox is temporarily unavailable.'},{status:503,headers})}}
export async function POST(request){
 if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers})
 if(!sameReviewOrigin(request))return Response.json({error:'Refresh before uploading.'},{status:403,headers})
 try{const text=await request.text();if(text.length>280000)return Response.json({error:'Upload chunk too large.'},{status:413,headers});const body=JSON.parse(text)
  if(!['create','start','chunk','verify','finish'].includes(body.action))return Response.json({error:'Unknown capture action.'},{status:400,headers})
  return Response.json(await getStore()[body.action](body),{headers})
 }catch(e){return Response.json({error:e.status?e.message:'Could not save capture. Your local copy is retained; retry the upload.'},{status:e.status||503,headers})}
}
