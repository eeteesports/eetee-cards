import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {listCardTasks,queueCardTask,cropScanStatus} from '@/lib/cardTasksStore'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
export async function GET(){if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers});try{return Response.json({tasks:await listCardTasks(),screenings:await cropScanStatus()},{headers})}catch{return Response.json({error:'Could not load fix requests.'},{status:503,headers})}}
export async function POST(request){if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers});if(!sameReviewOrigin(request))return Response.json({error:'Refresh before saving.'},{status:403,headers});try{const text=await request.text();if(text.length>5000)throw Object.assign(Error('Request is too large.'),{status:413});return Response.json(await queueCardTask(JSON.parse(text)),{headers})}catch(e){return Response.json({error:e.status?e.message:'Could not queue this request.'},{status:e.status||503,headers})}}
