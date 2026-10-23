import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {ownerAnalyticsInput} from '@/lib/ownerAnalyticsInput.mjs'
import {saveAnalyticsEvent} from '@/lib/ownerAnalytics'
export const dynamic='force-dynamic'
const empty=status=>new Response(null,{status,headers:{'Cache-Control':'no-store'}})
export async function POST(request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return empty(403)
 if(request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return empty(204)
 if(!request.headers.get('content-type')?.startsWith('application/json'))return empty(415)
 try{const raw=await request.text();if(Buffer.byteLength(raw)>1500)return empty(413);let body;try{body=JSON.parse(raw)}catch{return empty(400)}const data=ownerAnalyticsInput(body);if(!data)return empty(400);if(await getServerSession(authOptions))return empty(204);await saveAnalyticsEvent(data);return empty(204)}catch(e){console.error('Storefront analytics unavailable',e.code||'internal');return empty(503)}
}
