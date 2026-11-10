import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {getTurso} from '@/lib/db'
import {captureStore} from '@/lib/captureStore.mjs'
export const dynamic='force-dynamic'
export async function GET(request){const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};if(!await getServerSession(authOptions))return new Response('Owner login required',{status:401,headers});try{const a=await captureStore(getTurso()).image(new URL(request.url).searchParams.get('id'));return new Response(a.data,{headers:{...headers,'Content-Type':a.mime,'X-Content-SHA256':a.sha256}})}catch(e){return new Response('Image unavailable',{status:e.status||503,headers})}}
