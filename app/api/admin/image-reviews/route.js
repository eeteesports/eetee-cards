import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {listImageReviews,saveImageReview,setImageReviewStatus} from '@/lib/imageReviewStore'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
const reply=(body,status=200)=>Response.json(body,{status,headers})
async function authenticated(){return Boolean(await getServerSession(authOptions))}
async function input(request){const raw=await request.text();if(Buffer.byteLength(raw)>9000)throw Object.assign(Error('Request is too large.'),{status:413});try{return JSON.parse(raw)}catch{throw Object.assign(Error('Enter a valid review request.'),{status:400})}}
export async function GET(){
 if(!await authenticated())return reply({error:'Sign in as the owner to view image requests.'},401)
 try{return reply({reviews:await listImageReviews()})}catch(e){console.error('Image review read failed',e.code||'internal');return reply({error:'Image review is temporarily unavailable. Please retry.'},503)}
}
async function write(request,operation){
 if(!await authenticated())return reply({error:'Sign in as the owner before saving.'},401)
 if(!sameReviewOrigin(request))return reply({error:'Refresh this page before saving.'},403)
 try{const body=await input(request);const result=await operation(body);return reply({ok:true,...result})}catch(e){if([400,409,413].includes(e.status))return reply({error:e.message},e.status);console.error('Image review save failed',e.code||'internal');return reply({error:'Could not save the request. Please retry.'},503)}
}
export async function POST(request){return write(request,saveImageReview)}
export async function PATCH(request){return write(request,setImageReviewStatus)}
