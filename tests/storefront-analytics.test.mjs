import test from 'node:test'
import assert from 'node:assert/strict'
import {isPublicLocation,cleanAnalyticsUrl,sanitizeEvent,analyticsItem,cartEventData,trackShop,OPT_OUT_KEY} from '../lib/storefrontAnalytics.mjs'
import {quoteCart} from '../lib/storefrontCart.mjs'
test('analytics only runs on public production storefront pages',()=>{
 for(const url of ['http://127.0.0.1:17425/','http://localhost:17426/bins','https://preview.vercel.app/','https://eetee.cards/inventory-admin','https://eetee.cards/api/order-request','https://eetee.cards/dashboard'])assert.equal(isPublicLocation(url),false)
 for(const url of ['https://eetee.cards/','https://eetee.cards/bins?tier=50','https://eetee.cards/privacy'])assert(isPublicLocation(url))
})
test('URLs retain safe campaign tags and bin selection while removing private or arbitrary query data',()=>{
 assert.equal(cleanAnalyticsUrl('https://eetee.cards/bins?tier=50&utm_source=reddit&utm_campaign=nfl_launch&email=buyer@example.com&search=private#secret'),'https://eetee.cards/bins?utm_source=reddit&utm_campaign=nfl_launch&tier=50')
 assert.equal(cleanAnalyticsUrl('https://eetee.cards/?utm_source=buyer@example.com&address=secret'),'https://eetee.cards/')
})
test('unapproved events and customer data never enter funnel payloads',()=>{
 assert.equal(sanitizeEvent('purchase',{}),null)
 const result=sanitizeEvent('order_email_opened',{currency:'USD',value:20,email:'buyer@example.com',address:'private',mailto:'secret',message:'secret',items:[{item_id:'team',price:20,quantity:1,email:'secret'}]})
 assert.deepEqual(result,{value:20,currency:'USD',items:[{item_id:'team',price:20,quantity:1}]})
})
test('mixed-bin cart analytics use discounted totals and grouped public product IDs',()=>{
 const cards=Array.from({length:30},(_,i)=>({id:String(i),listingId:'same-card',binPriceCents:50,player:'Player',year:'2025',number:'1',set:'Set'}));const q=quoteCart({cards,bundles:[]},{cards:cards.map(c=>c.id)});const payload=cartEventData(q)
 assert.equal(payload.value,10);assert.equal(payload.funnel_type,'bins');assert.equal(payload.items.length,1);assert.equal(payload.items[0].quantity,30);assert.equal(payload.items[0].item_id,'same-card');assert.equal(payload.meets_minimum,'yes');assert.equal(analyticsItem({id:'team',team:'Lions',name:'Team set 1'},'bundle').price,20)
})
test('analytics failures, privacy signals and opt-outs cannot interrupt shopping',()=>{
 const savedWindow=globalThis.window,savedDocument=globalThis.document
 try{
  let called=0;globalThis.document={referrer:''};globalThis.window={location:{href:'https://eetee.cards/'},navigator:{globalPrivacyControl:true},localStorage:{getItem:()=>null},gtag:()=>called++};trackShop('add_to_cart',{value:20});assert.equal(called,0)
  window.navigator={};window.localStorage={getItem:key=>key===OPT_OUT_KEY?'true':null};trackShop('add_to_cart',{});assert.equal(called,0)
  window.localStorage={getItem:()=>null};window.gtag=()=>{throw Error('blocked')};assert.doesNotThrow(()=>trackShop('add_to_cart',{}))
 }finally{globalThis.window=savedWindow;globalThis.document=savedDocument}
})

test('individual cards are measured at full price and the all-cards page is included',()=>{
 const c={id:'high',listingId:'high-listing',priceCents:3000,player:'Player',year:'2025',number:'1',set:'Set'}
 const quote=quoteCart({cards:[c],bundles:[]},{cards:['high']})
 assert(isPublicLocation('https://eetee.cards/cards'));assert.equal(analyticsItem(c).price,30);assert.equal(analyticsItem(c).item_category,'individual_card');assert.equal(cartEventData(quote).bin_count,0);assert.equal(cartEventData(quote).funnel_type,'individual_cards')
})
