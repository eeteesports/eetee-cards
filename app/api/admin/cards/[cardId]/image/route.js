import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {editableCard,editorImageBytes} from '@/lib/cardEditorStore'
export const dynamic='force-dynamic'
export async function GET(request,{params}){if(!await getServerSession(authOptions))return new Response(null,{status:401});try{const card=await editableCard(params.cardId),side=new URL(request.url).searchParams.get('side');const bytes=await editorImageBytes(card,side);return new Response(bytes,{headers:{'Content-Type':bytes[0]===255?'image/jpeg':bytes[0]===137?'image/png':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}catch(e){return new Response(null,{status:e.status||503})}}
