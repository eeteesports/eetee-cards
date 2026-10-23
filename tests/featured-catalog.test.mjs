import test from 'node:test'
import assert from 'node:assert/strict'
import {featuredCatalog} from '../lib/featuredCatalog.mjs'
const card=(id,priceCents,player=id)=>({id,listingId:id,priceCents,player,year:'2026'})
test('opening rows mix price bands with just two value cards in eight slots',()=>{
 const input=[card('bin1',50),card('bin2',100),card('two',200),card('five1',500),card('five2',500),card('ten1',1000),card('ten2',1000),card('fifty',5000),card('thousand',100000)]
 const ordered=featuredCatalog(input)
 assert.deepEqual(ordered.slice(0,8).map(c=>c.priceCents),[500,1000,5000,100,200,500,1000,50])
 assert.deepEqual(new Set(ordered.map(c=>c.id)),new Set(input.map(c=>c.id)))
 assert.deepEqual(featuredCatalog([...input].reverse()),ordered)
 assert.equal(input[0].id,'bin1')
})
test('copies of the same player are separated when alternatives exist',()=>{
 const result=featuredCatalog([card('a',500,'Player A'),card('b',500,'Player A'),card('c',500,'Player B')])
 assert.deepEqual(result.map(c=>c.player),['Player A','Player B','Player A'])
})
test('narrow price filters and empty results retain every matching card',()=>{
 assert.deepEqual(featuredCatalog([]),[])
 const input=[card('a',50),card('b',50),card('c',50)]
 assert.equal(featuredCatalog(input).length,3)
 assert.equal(featuredCatalog([card('solo',5000)])[0].id,'solo')
})
