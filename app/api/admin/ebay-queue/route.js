import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {ebayQueue} from '@/lib/ebayQueue'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
export async function GET(){if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers});try{return Response.json(await ebayQueue(),{headers})}catch(error){console.error("eBay queue failed",error.message);return Response.json({error:'Could not load the eBay queue. Saved drafts are retained.'},{status:503,headers})}}
