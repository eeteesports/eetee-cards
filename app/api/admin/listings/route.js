import {getServerSession} from 'next-auth'
import {authOptions} from '@/lib/auth'
import {sameReviewOrigin} from '@/lib/imageReviewInput.mjs'
import {loadListing,saveListing,verifyListing,publishListing} from '@/lib/listingStore'
import {sellerPolicies,conditionPolicies} from '@/lib/listingEbay'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}
export async function GET(request){
 if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers})
 try{const q=new URL(request.url).searchParams;return Response.json(q.get('conditions')==='1'?await conditionPolicies():q.get('policies')==='1'?await sellerPolicies():await loadListing(q.get('cardId'),q.get('marketplace')||'ebay'),{headers})}catch(e){return Response.json({error:e.status?e.message:'Could not load listing tools.'},{status:e.status||503,headers})}
}
export async function POST(request){
 if(!await getServerSession(authOptions))return Response.json({error:'Owner login required.'},{status:401,headers})
 if(!sameReviewOrigin(request))return Response.json({error:'Refresh before saving.'},{status:403,headers})
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>22000)return Response.json({error:'Listing is too large.'},{status:413,headers})
  let body;try{body=JSON.parse(raw)}catch{return Response.json({error:'Invalid listing.'},{status:400,headers})}
  const actions={save:saveListing,verify:verifyListing,publish:publishListing},action=body&&Object.hasOwn(actions,body.action)?actions[body.action]:null
  if(!action)return Response.json({error:'Choose a listing action.'},{status:400,headers})
  return Response.json(await action(body),{headers})
 }catch(e){console.error('Listing action failed',e.name);return Response.json({error:e.status?e.message:'Could not complete this listing action. Reopen the draft to check its saved status.',...(e.status&&e.duplicates?{duplicates:e.duplicates}:{})},{status:e.status||503,headers})}
}
