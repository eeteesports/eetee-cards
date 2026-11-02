import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {inventoryImage,privateHeaders} from '@/lib/inventoryLookupStore'
export const dynamic='force-dynamic'
export async function GET(request){
 if(!await getServerSession(authOptions))return new Response(null,{status:401,headers:privateHeaders})
 const p=new URL(request.url).searchParams
 try{const bytes=await inventoryImage(p.get('source'),p.get('id'),p.get('side'));return new Response(bytes,{status:bytes?200:404,headers:{...privateHeaders,'Content-Type':bytes?.[0]===255?'image/jpeg':'image/webp','X-Content-Type-Options':'nosniff'}})}catch{return new Response(null,{status:503,headers:privateHeaders})}
}
