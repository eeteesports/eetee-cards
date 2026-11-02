import {test} from 'node:test'
import assert from 'node:assert/strict'
import {matches,searchText,listingState} from '../lib/inventoryLookup.mjs'
const tuten={id:'copy-one',player:'Bhayshul Tuten',season:'2025',brand:'Panini',set:'Donruss Optic',number:'272',family:'Base',parallel:'Purple Shock',teams:['Jacksonville Jaguars'],rookie:true}
test('combined terms find Tuten variant in any order',()=>{
 const text=searchText(tuten)
 for(const q of ['Tuten Optic Purple Shock','Tuten 2025 #272','purple shock tuten rc','  TUTEN  272 '])assert.ok(matches(text,q),q)
 assert.ok(!matches(text,'Tuten silver'));assert.ok(!matches(text,'Tuten #273'))
})
test('unpriced unreviewed copies are not implicitly listed',()=>{
 assert.equal(listingState({ownership:'owned',publicId:'one'}).key,'not_listed')
 assert.equal(listingState({ownership:'owned',publicId:'one',drafts:new Map([['one','verified']])}).key,'draft')
})
test('sold reserved and uncertain status take priority',()=>{
 const common={ownership:'owned',publicId:'one',singles:new Set(['one'])}
 assert.equal(listingState(common).label,'Listed on eetee.cards')
 assert.equal(listingState({...common,locks:new Map([['one','sold']])}).key,'sold')
 assert.equal(listingState({...common,locks:new Map([['one','held']])}).key,'reserved')
 assert.equal(listingState({...common,drafts:new Map([['one','uncertain']])}).key,'check')
 const bundles=new Map([['one',{id:'bundle',name:'Jaguars'}]])
 assert.equal(listingState({...common,bundles}).label,'Listed in team bundle')
 assert.equal(listingState({...common,bundles,reservedBundles:new Set(['bundle'])}).key,'reserved')
})
