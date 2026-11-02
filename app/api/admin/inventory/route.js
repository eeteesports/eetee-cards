import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {inventoryLookup,privateHeaders} from '@/lib/inventoryLookupStore'
export const dynamic='force-dynamic'
export async function GET(request){
 if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers:privateHeaders})
 try{const p=new URL(request.url).searchParams;const offset=Math.max(0,Math.min(1000000,Number.parseInt(p.get('offset')||'0')||0));return Response.json(await inventoryLookup({offset,limit:1000}),{headers:privateHeaders})}
 catch{return Response.json({error:'Inventory could not load. Refresh to try again.'},{status:503,headers:privateHeaders})}
}
