import {randomUUID} from 'node:crypto'
import {getTurso} from './db'
import teams from '../data/team-bundles.json'
import publicCards from './publicCatalog'
import reservations from '../data/marketplace-reservations.json'
import {cardEditMap,applyPublicEdit} from './cardEdits.mjs'
import {initializeImageReviews} from './imageReviewStore'
import {activeImages,correctedImageUrl} from './imageCorrections.mjs'
import {SHIPPING_METHOD} from './storefrontCheckout.mjs'
let initialized
export function initializeStorefrontOrders(){
 if(!initialized)initialized=getTurso().batch([
 `CREATE TABLE IF NOT EXISTS storefront_orders (id TEXT PRIMARY KEY,session_id TEXT UNIQUE,manifest TEXT NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,payment TEXT)`,
 `CREATE TABLE IF NOT EXISTS storefront_copy_locks (copy_id TEXT PRIMARY KEY,order_id TEXT NOT NULL,status TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS storefront_locks_order ON storefront_copy_locks(order_id)`],'write').catch(e=>{initialized=null;throw e})
 return initialized
}
export async function shopCatalog(){
 await initializeStorefrontOrders()
 const sold=await getTurso().execute("SELECT copy_id FROM storefront_copy_locks WHERE status='sold'")
 const blocked=new Set(sold.rows.map(r=>r.copy_id))
 let corrections=[];try{await initializeImageReviews();corrections=await activeImages(getTurso())}catch{}
 const corrected=new Map(corrections.map(r=>[r.card_id+':'+r.side,correctedImageUrl(r.card_id,r.side,r.revision_id)]))
 const edits=await cardEditMap(getTurso())
 const displayCard=c=>({...applyPublicEdit(c,edits.get(c.id)),front:corrected.get(c.id+':front')||c.front,back:corrected.get(c.id+':back')||c.back})
 const unavailableBundles=new Set([...reservations.bundles,...(reservations.soldBundles||[]).map(b=>b.id)])
 for(const b of teams.bundles)if(unavailableBundles.has(b.id))for(const c of b.cards)blocked.add(c.id)
 return {teams:{...teams,bundles:teams.bundles.filter(b=>!b.cards.some(c=>blocked.has(c.id))).map(b=>({...b,cards:b.cards.map(displayCard)}))},cards:{cards:publicCards.cards.filter(c=>!blocked.has(c.id)).map(displayCard)}}
}
export async function storefrontOrder(id){
 await initializeStorefrontOrders()
 const {rows}=await getTurso().execute({sql:'SELECT * FROM storefront_orders WHERE id=?',args:[id]})
 return rows[0]?{...rows[0],manifest:JSON.parse(rows[0].manifest),payment:rows[0].payment?JSON.parse(rows[0].payment):null}:null
}
export async function clearExpiredHolds(ids,stripe){
 await initializeStorefrontOrders()
 const {rows}=await getTurso().execute({sql:`SELECT DISTINCT o.id,o.session_id,o.expires_at FROM storefront_orders o JOIN storefront_copy_locks l ON l.order_id=o.id WHERE l.status='held' AND l.copy_id IN (${ids.map(()=>'?').join(',')})`,args:ids})
 for(const o of rows){if(o.expires_at>Date.now()||!o.session_id)continue;const s=await stripe.checkout.sessions.retrieve(o.session_id);if(s.payment_status==='paid')continue;if(s.status==='expired')await releaseStorefrontHold(o.id)}
}
export async function reserveStorefront(manifest){
 await initializeStorefrontOrders()
 const id=randomUUID(),expiresAt=Date.now()+30*60*1000,tx=await getTurso().transaction('write')
 try{await tx.execute({sql:'INSERT INTO storefront_orders(id,manifest,status,created_at,expires_at) VALUES(?,?,?,?,?)',args:[id,JSON.stringify(manifest),'creating',Date.now(),expiresAt]});for(const copy of manifest.physicalIds)await tx.execute({sql:"INSERT INTO storefront_copy_locks VALUES(?,?,'held')",args:[copy,id]});await tx.commit();return {id,expiresAt}}
 catch(e){await tx.rollback();if(String(e.message).includes('UNIQUE'))throw Object.assign(Error('A selected card is sold or held in another checkout. Please try again later.'),{status:409});throw e}finally{tx.close()}
}
export async function attachStorefrontSession(id,s){await getTurso().execute({sql:"UPDATE storefront_orders SET session_id=?,status='checkout',expires_at=? WHERE id=?",args:[s.id,s.expires_at*1000,id]})}
export async function releaseStorefrontHold(id){await getTurso().batch([{sql:"DELETE FROM storefront_copy_locks WHERE order_id=? AND status='held'",args:[id]},{sql:"UPDATE storefront_orders SET status='expired' WHERE id=? AND status!='paid'",args:[id]}],'write')}
export async function fulfillStorefrontOrder(s){
 if(s.payment_status!=='paid'||!s.metadata?.storefrontOrderId)return null
 const order=await storefrontOrder(s.metadata.storefrontOrderId)
 if(!order||order.session_id!==s.id)throw Error('Checkout does not match its saved order.')
 if(s.currency!=='usd'||s.amount_total!==order.manifest.totalCents)throw Error('Payment total does not match the saved order.')
 const details=s.collected_information?.shipping_details||s.shipping_details
 const payment={name:details?.name||s.customer_details?.name||'',email:s.customer_details?.email||'',address:details?.address||s.customer_details?.address||{},total:s.amount_total/100}
 const tx=await getTurso().transaction('write');let alreadyExisted=false
 try{const row=(await tx.execute({sql:'SELECT status FROM storefront_orders WHERE id=?',args:[order.id]})).rows[0];alreadyExisted=row.status==='paid';if(!alreadyExisted){const locks=(await tx.execute({sql:'SELECT copy_id FROM storefront_copy_locks WHERE order_id=?',args:[order.id]})).rows;if(locks.length!==order.manifest.physicalIds.length)throw Error('Paid inventory reservation requires attention.');await tx.execute({sql:"UPDATE storefront_copy_locks SET status='sold' WHERE order_id=?",args:[order.id]});await tx.execute({sql:"UPDATE storefront_orders SET status='paid',payment=? WHERE id=?",args:[JSON.stringify(payment),order.id]})}await tx.commit()}catch(e){await tx.rollback();throw e}finally{tx.close()}
 return {alreadyExisted,order:{...order,payment,status:'paid'}}
}
export function notificationOrder(o){return {id:o.id,total:o.manifest.totalCents/100,subtotal:o.manifest.subtotalCents/100,shipping_cost:o.manifest.shippingCents/100,shipping_method:SHIPPING_METHOD,buyer_name:o.payment.name,buyer_email:o.payment.email,shipping_address:o.payment.address,items:o.manifest.lines.map(l=>({price:l.cents/100,card:{fields:{Player:l.name,'Front Image URL':l.image}}}))}}
