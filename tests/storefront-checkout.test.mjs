import test from 'node:test'
import assert from 'node:assert/strict'
import {checkoutManifest} from '../lib/storefrontCheckout.mjs'
const cards=Array.from({length:40},(_,i)=>({id:'card'+i,priceCents:i<20?50:100,player:'Player',number:i,front:'/photo.jpg'}))
const bundle={id:'team',team:'Team',name:'Set 1',cards:[{id:'bundle-card',front:'/photo.jpg'}]}
test('mixed cards and lots have exactly one $7 tracked shipping charge',()=>{
 const q=checkoutManifest({cards,bundles:[bundle]},{cards:cards.map(c=>c.id),bundles:['team']})
 assert.equal(q.subtotalCents,4000);assert.equal(q.shippingCents,700);assert.equal(q.totalCents,4700);assert.equal(q.lines.reduce((s,l)=>s+l.cents,0),4000)
})
test('unknown, duplicate, overlapping, and below-minimum selections cannot be charged',()=>{
 for(const s of [{cards:['missing']},{cards:['card0','card0']},{cards:['card0']}])assert.throws(()=>checkoutManifest({cards,bundles:[]},s))
 assert.throws(()=>checkoutManifest({cards,bundles:[{...bundle,cards:[cards[0]]}]},{cards:['card0'],bundles:['team']}))
})
