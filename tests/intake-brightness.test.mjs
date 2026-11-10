import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {safeBrightnessSettings,renderManualImage} from '../lib/cardImageProcessor.mjs'
test('automatic exposure is mild, preserves dimensions, and skips normal or near-black images',async()=>{
 for(const [value,expected] of [[70,true],[210,false],[5,false]]){const source=await sharp({create:{width:80,height:110,channels:3,background:{r:value,g:value,b:value}}}).png().toBuffer(),settings=await safeBrightnessSettings(source);assert.equal(!!settings,expected);if(settings){assert.equal(settings.brightness,1.12);const output=await renderManualImage(source,settings),m=await sharp(output).metadata();assert.equal(m.width,80);assert.equal(m.height,110);assert((await sharp(output).stats()).channels[0].mean>value)}}
})
