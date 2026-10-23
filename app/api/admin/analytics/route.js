import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {ownerAnalytics} from '@/lib/ownerAnalytics'
import {reportDays} from '@/lib/ownerAnalyticsInput.mjs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
export async function GET(request){if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers});try{return Response.json(await ownerAnalytics(reportDays(new URL(request.url).searchParams.get('days'))),{headers})}catch(e){console.error('Owner analytics unavailable',e.code||'internal');return Response.json({error:'Analytics are temporarily unavailable. Please retry.'},{status:503,headers})}}
