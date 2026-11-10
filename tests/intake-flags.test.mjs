import test from 'node:test'
import assert from 'node:assert/strict'
import {cardFlags} from '../lib/intakeFlags.mjs'
const card={player:'Known player',intake:{images:{front:true,back:true},pairing:'passed',identityComplete:true,finishConfirmed:false,questions:[]}}
test('explicit base suggestion differs from unknown finish',()=>{assert.deepEqual(cardFlags({...card,intake:{...card.intake,finishCandidate:'No parallel'}}),[{group:'base',label:'Confirm base'}]);assert.equal(cardFlags(card)[0].group,'parallel')})
test('positive image narrative is never turned into an invented defect',()=>{const flags=cardFlags({...card,intake:{...card.intake,finishConfirmed:true,imageReview:true,questions:[{field:'images',reason:'Original frames show one complete rectangular card per side, all corners visible. Back is dark but identity text is readable.'}]}});assert.deepEqual(flags,[{group:'images',label:'Check image quality'}])})
test('partial identity and total failure have different buckets; multiple concerns survive',()=>{assert(cardFlags({...card,intake:{...card.intake,identityComplete:false}}).some(f=>f.group==='attributes'));assert(cardFlags({...card,player:null,intake:{...card.intake,identityComplete:false}}).some(f=>f.group==='identity'))})
