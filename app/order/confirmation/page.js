import Link from 'next/link'
import {getStripe} from '@/lib/stripe'
import {fulfillStorefrontOrder,notificationOrder} from '@/lib/storefrontOrders'
import {sendOrderNotification} from '@/lib/notify'
import ClearPurchasedCart from '@/components/ClearPurchasedCart'
export const dynamic='force-dynamic'
export default async function Confirmation({searchParams}){
 let order
 try{
  const session=await getStripe().checkout.sessions.retrieve(searchParams?.session_id||'')
  const result=await fulfillStorefrontOrder(session)
  if(result){order=result.order;if(!result.alreadyExisted)await sendOrderNotification(notificationOrder(order))}
 }catch(e){console.error('Order confirmation unavailable',e.type||'lookup')}
 const money=n=>'$'+(n/100).toFixed(2)
 return <main style={{maxWidth:720,margin:'40px auto',padding:24,color:'#eee',background:'#142138',borderRadius:16}}><Link href="/">eetee.cards</Link><h1>{order?'Thank you—your order is confirmed!':'Checking your order'}</h1>{order?<><ClearPurchasedCart ids={order.manifest.physicalIds} bundleIds={order.manifest.lines.filter(l=>l.cardIds.length>1).map(l=>l.id)}/><p>Your cards are reserved for you. They will ship by USPS Ground Advantage in protective packaging.</p><ul>{order.manifest.lines.map(l=><li key={l.id}>{l.name} — {money(l.cents)}</li>)}</ul><p>Cards: {money(order.manifest.subtotalCents)}</p><p>Tracked shipping: {money(order.manifest.shippingCents)}</p><strong>Total: {money(order.manifest.totalCents)}</strong></>:<p>If you completed payment, your order is being processed. Refresh in a moment or contact eeteecards@gmail.com with your receipt.</p>}<p><Link href="/cards">Keep shopping →</Link></p></main>
}
