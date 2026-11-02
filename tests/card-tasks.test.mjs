import {test} from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {cardTaskInput} from '../lib/cardTasksInput.mjs'
import {obviousBlackBorderSettings} from '../lib/cardImageProcessor.mjs'
const body={cardId:'0123456789abcdef',side:'front',issues:['crop'],note:'Remove the large black border.'}
test('requests validate cards, sides, issues and descriptive notes',()=>{
 assert.equal(cardTaskInput(body).note,body.note)
 for(const bad of [{cardId:'../x'},{side:'left'},{issues:['execute']},{note:''},{note:'x'.repeat(2001)}])assert.throws(()=>cardTaskInput({...body,...bad}))
})
test('obvious black surround receives a padded whole-card crop',async()=>{
 const card=await sharp({create:{width:160,height:224,channels:3,background:'#b0bac8'}}).png().toBuffer()
 const source=await sharp({create:{width:400,height:500,channels:3,background:'#000'}}).composite([{input:card,left:120,top:138}]).png().toBuffer()
 const plan=await obviousBlackBorderSettings(source)
 assert.ok(plan);assert.ok(plan.left<.30&&plan.right>.70);assert.ok(plan.top<.276&&plan.bottom>.724)
})
test('full cards, blank frames, edge-clipped objects and noisy surrounds are retained',async()=>{
 for(const background of ['#000','#ddd']){
  const source=await sharp({create:{width:300,height:420,channels:3,background}}).png().toBuffer();assert.equal(await obviousBlackBorderSettings(source),null)
 }
 const card=await sharp({create:{width:120,height:170,channels:3,background:'#bbb'}}).png().toBuffer()
 const clipped=await sharp({create:{width:400,height:500,channels:3,background:'#000'}}).composite([{input:card,left:0,top:100}]).png().toBuffer()
 assert.equal(await obviousBlackBorderSettings(clipped),null)
})
