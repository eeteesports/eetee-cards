import test from 'node:test'
import assert from 'node:assert/strict'
import {checkoutManifest} from '../lib/storefrontCheckout.mjs'
const cards=Array.from({length:40},(_,i)=>({id:'card'+i,priceCents:i<20?50:100,player:'Player',number:i,front:'/photo.jpg'}))
const bundle={id:'team',team:'Team',name:'Set 1',cards:[{id:'bundle-card',front:'/photo.jpg'}]}
test('mixed cards and lots have exactly one $7.50 tracked shipping charge',()=>{
 const q=checkoutManifest({cards,bundles:[bundle]},{cards:cards.map(c=>c.id),bundles:['team']})
 assert.equal(q.subtotalCents,4000);assert.equal(q.shippingCents,750);assert.equal(q.totalCents,4750);assert.equal(q.lines.reduce((s,l)=>s+l.cents,0),4000)
})
test('unknown, duplicate, overlapping, and below-minimum selections cannot be charged',()=>{
 for(const s of [{cards:['missing']},{cards:['card0','card0']},{cards:['card0']}])assert.throws(()=>checkoutManifest({cards,bundles:[]},s))
 assert.throws(()=>checkoutManifest({cards,bundles:[{...bundle,cards:[cards[0]]}]},{cards:['card0'],bundles:['team']}))
})

test('rounding a large bin purchase never overprices the final card',()=>{
 const many=Array.from({length:100},(_,i)=>({id:'half'+i,priceCents:50,player:'Player',number:i,front:'/photo.jpg'}))
 const q=checkoutManifest({cards:many,bundles:[]},{cards:many.map(c=>c.id)})
 assert.equal(q.subtotalCents,3333);assert(q.lines.every(l=>l.cents===33||l.cents===34))
})

test('a $20 team bundle totals $27.50 with shipping',()=>{
 const q=checkoutManifest({cards:[],bundles:[bundle]},{bundles:['team']})
 assert.equal(q.subtotalCents,2000);assert.equal(q.shippingCents,750);assert.equal(q.totalCents,2750)
})
