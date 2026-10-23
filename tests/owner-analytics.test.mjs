import test from 'node:test'
import assert from 'node:assert/strict'
import {ownerAnalyticsInput,reportDays} from '../lib/ownerAnalyticsInput.mjs'
const valid={id:'12345678-1234-1234-1234-123456789abc',session:'abcdefab-1234-1234-1234-123456789abc',event:'page_view',path:'/cards',referrer:'https://example.com/private?email=secret',device:'desktop',email:'secret',items:[{email:'secret'}]}
test('owner analytics stores only approved anonymous dimensions',()=>{assert.deepEqual(ownerAnalyticsInput(valid),{id:valid.id,session:valid.session,event:'page_view',path:'/cards',detail:'',referrer:'example.com',device:'desktop'});assert.equal(ownerAnalyticsInput({...valid,event:'select_shopping_path',detail:'customer@example.com'}).detail,'');assert.equal(ownerAnalyticsInput({...valid,event:'select_shopping_path',detail:'individual_cards'}).detail,'individual_cards')})
test('rejects private pages, unapproved events and invalid identifiers',()=>{for(const bad of [{path:'/admin'},{path:'/cards?email=secret'},{event:'purchase'},{id:'arbitrary'},{session:'private-customer-email'},{id:[valid.id]}])assert.equal(ownerAnalyticsInput({...valid,...bad}),null)})
test('report periods are limited to bounded queries',()=>{assert.equal(reportDays('7'),7);assert.equal(reportDays('90'),90);assert.equal(reportDays('100000'),30);assert.equal(reportDays(null),30)})

test('browser mirrors approved events, reuses a session and honors opt-out',async()=>{
 const {trackShop}=await import('../lib/storefrontAnalytics.mjs'),{randomUUID}=await import('node:crypto');const savedWindow=globalThis.window,savedDocument=globalThis.document,storage=new Map(),sent=[];let disabled=false
 try{globalThis.document={referrer:'https://example.com/path?email=secret'};globalThis.window={location:{href:'https://eetee.cards/cards',pathname:'/cards'},navigator:{},innerWidth:1200,crypto:{randomUUID},localStorage:{getItem:()=>disabled?'true':null},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},gtag:()=>{},fetch:(url,options)=>{sent.push({url,body:JSON.parse(options.body)});return Promise.resolve()}}
 trackShop('page_view',{email:'secret'});trackShop('add_to_cart',{value:20,email:'secret'});trackShop('view_item_list',{});assert.equal(sent.length,2);assert.equal(sent[0].url,'/api/analytics/collect');assert.equal(sent[0].body.session,sent[1].body.session);assert.notEqual(sent[0].body.id,sent[1].body.id);assert.equal(sent[0].body.referrer,'https://example.com');assert(!JSON.stringify(sent).includes('secret'));assert(ownerAnalyticsInput(sent[0].body));disabled=true;trackShop('begin_checkout',{});assert.equal(sent.length,2)
 }finally{globalThis.window=savedWindow;globalThis.document=savedDocument}
})
