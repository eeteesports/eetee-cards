import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {getTurso} from '@/lib/db'
import {initializeImageReviews} from '@/lib/imageReviewStore'
export const dynamic='force-dynamic'
export async function GET(request,{params}){
 if(!await getServerSession(authOptions))return new Response(null,{status:401})
 const side=new URL(request.url).searchParams.get('side');if(!['before','after'].includes(side)||!/^[a-f0-9-]{36}$/.test(params.resultId))return new Response(null,{status:400})
 await initializeImageReviews();const {rows}=await getTurso().execute({sql:`SELECT ${side==='before'?'source_bytes':'output_bytes'} AS bytes FROM storefront_image_versions WHERE id=?`,args:[params.resultId]});if(!rows[0])return new Response(null,{status:404})
 const bytes=Buffer.from(rows[0].bytes,'base64');return new Response(bytes,{headers:{'Content-Type':bytes[0]===255?'image/jpeg':bytes[0]===137?'image/png':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}
