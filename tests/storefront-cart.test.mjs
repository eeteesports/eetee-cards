import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {quoteCart,requestEmail,binCost} from '../lib/storefrontCart.mjs'
const cards=Array.from({length:45},(_,i)=>({id:'f'+i,binPriceCents:50,player:'Player',number:String(i)})).concat(Array.from({length:30},(_,i)=>({id:'d'+i,binPriceCents:100,player:'Player',number:String(i)})))
const catalog={cards,bundles:[{id:'team',team:'Example',name:'Set 1',cards:[{id:'t1'}]}]}
test('30 half-dollar cards, 15 dollar cards and a mixed $15 selection all cost $10',()=>{
 for(const ids of [cards.filter(c=>c.id.startsWith('f')).slice(0,30).map(c=>c.id),cards.filter(c=>c.id.startsWith('d')).slice(0,15).map(c=>c.id),[...cards.filter(c=>c.id.startsWith('f')).slice(0,10),...cards.filter(c=>c.id.startsWith('d')).slice(0,10)].map(c=>c.id)]){const q=quoteCart(catalog,{cards:ids});assert.equal(q.totalCents,1000);assert(q.meetsMinimum);assert.equal(q.savingsCents,500)}
})
test('minimum is checked after discount and excludes shipping',()=>{
 const q=quoteCart(catalog,{cards:cards.filter(c=>c.id.startsWith('d')).slice(0,14).map(c=>c.id)});assert.equal(q.totalCents,933);assert.equal(q.meetsMinimum,false);assert.throws(()=>requestEmail(q),/Minimum/)
})
test('team sets remain $20 and can combine with discounted bins',()=>{assert.equal(quoteCart(catalog,{bundles:['team']}).totalCents,2000);assert.equal(quoteCart(catalog,{cards:['f0','d0'],bundles:['team']}).totalCents,2100)})
test('tampered IDs, quantities, duplicate selections and overlapping physical inventory are rejected',()=>{
 assert.throws(()=>quoteCart(catalog,{cards:['missing']}));assert.throws(()=>quoteCart(catalog,{cards:['f0','f0']}));assert.throws(()=>quoteCart(catalog,{bundles:['team','team']}));assert.throws(()=>quoteCart({...catalog,bundles:[{id:'overlap',cards:[{id:'f0'}]}]},{cards:['f0'],bundles:['overlap']}));assert.equal(binCost(3000),2000)
})
test('actual published team sets and bin physical copies are disjoint',()=>{
 const teams=JSON.parse(fs.readFileSync(new URL('../data/team-bundles.json',import.meta.url))),bins=JSON.parse(fs.readFileSync(new URL('../data/bin-cards.json',import.meta.url)));const all=teams.bundles.flatMap(b=>b.cards.map(c=>c.id));assert.equal(new Set(all).size,all.length);const ids=new Set(all);for(const c of bins.cards){assert(!ids.has(c.id));ids.add(c.id);assert([50,100].includes(c.binPriceCents))}
 const q=quoteCart({cards:bins.cards,bundles:teams.bundles},{cards:bins.cards.slice(0,40).map(c=>c.id)});assert(q.meetsMinimum);assert(requestEmail(q).startsWith('mailto:eeteecards@gmail.com?'))
})
