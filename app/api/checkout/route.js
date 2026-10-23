import {checkoutBranding} from '@/lib/checkoutBranding.mjs'
import {getStripe} from '@/lib/stripe'
import {checkoutManifest,SHIPPING_CENTS,SHIPPING_METHOD} from '@/lib/storefrontCheckout.mjs'
import {shopCatalog,clearExpiredHolds,reserveStorefront,attachStorefrontSession,releaseStorefrontHold} from '@/lib/storefrontOrders'
export async function POST(request){
 let order
 try{
  if(Number(request.headers.get('content-length')||0)>30000)return Response.json({error:'Selection too large.'},{status:413})
  const selection=await request.json(),catalog=await shopCatalog()
  let manifest
  try{manifest=checkoutManifest({cards:catalog.cards.cards,bundles:catalog.teams.bundles},selection)}catch(e){return Response.json({error:e.message},{status:400})}
  const stripe=getStripe()
  await clearExpiredHolds(manifest.physicalIds,stripe)
  order=await reserveStorefront(manifest)
  const origin=new URL(request.url).origin
  const session=await stripe.checkout.sessions.create({mode:'payment',branding_settings:checkoutBranding,payment_method_types:['card'],line_items:manifest.lines.map(l=>({quantity:1,price_data:{currency:'usd',unit_amount:l.cents,product_data:{name:l.name,images:[new URL(l.image,origin).href]}}})),shipping_address_collection:{allowed_countries:['US']},shipping_options:[{shipping_rate_data:{type:'fixed_amount',fixed_amount:{amount:SHIPPING_CENTS,currency:'usd'},display_name:SHIPPING_METHOD}}],expires_at:Math.floor(order.expiresAt/1000)+60,success_url:`${origin}/order/confirmation?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/cards`,metadata:{storefrontOrderId:order.id,shippingMethod:'USPS Ground Advantage'}},{idempotencyKey:order.id})
  await attachStorefrontSession(order.id,session)
  return Response.json({url:session.url})
 }catch(e){
  // A timeout can still create a session: retain its hold rather than oversell.
  if(order&&['StripeInvalidRequestError','StripeAuthenticationError'].includes(e.type))await releaseStorefrontHold(order.id)
  console.error('Storefront checkout failed',e.type||e.code||'internal')
  return Response.json({error:e.status===409?e.message:'Checkout could not start. Please try again shortly.'},{status:e.status||503})
 }
}
