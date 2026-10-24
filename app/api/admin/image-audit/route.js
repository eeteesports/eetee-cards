import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
import {imageAuditStatus,applyReviewedImageBatch} from '@/lib/imageAuditStore'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
const reply=(body,status=200)=>Response.json(body,{status,headers})
export async function GET(){if(!await getServerSession(authOptions))return reply({error:'Sign in as the owner.'},401);try{return reply(await imageAuditStatus())}catch{return reply({error:'Could not load the audit.'},503)}}
export async function POST(request){if(!await getServerSession(authOptions))return reply({error:'Sign in as the owner.'},401);if(!sameReviewOrigin(request))return reply({error:'Refresh before saving.'},403);try{return reply(await applyReviewedImageBatch())}catch{return reply({error:'The reviewed pass stopped. Existing images are retained.'},503)}}
