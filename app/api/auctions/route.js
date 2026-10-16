import {unstable_cache} from 'next/cache'
import {getToken} from '@/lib/ebay'
import {selectAuctions,EBAY_SELLER} from '@/lib/liveAuctions.mjs'
export const dynamic='force-dynamic'
const readAuctions=unstable_cache(async()=>{
 const token=await getToken()
 const params=new URLSearchParams({category_ids:'261328',filter:`sellers:{${EBAY_SELLER}},buyingOptions:{AUCTION}`,sort:'endingSoonest',limit:'20'})
 const r=await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,{headers:{Authorization:`Bearer ${token}`,'X-EBAY-C-MARKETPLACE-ID':'EBAY_US'},cache:'no-store',signal:AbortSignal.timeout(12000)})
 if(!r.ok)throw Error('Auction feed unavailable')
 const d=await r.json()
 return {items:selectAuctions(d.itemSummaries||[]),updatedAt:new Date().toISOString()}
},['public-ebay-auctions-v1'],{revalidate:60})
export async function GET(){
 try{const d=await readAuctions();if(Date.now()-Date.parse(d.updatedAt)>300000)throw Error('Auction feed stale');return Response.json({...d,items:d.items.filter(i=>Date.parse(i.endsAt)>Date.now())},{headers:{'Cache-Control':'no-store'}})}
 catch{return Response.json({items:[],unavailable:true,updatedAt:null},{status:503,headers:{'Cache-Control':'no-store'}})}
}
