import test from 'node:test'
import assert from 'node:assert/strict'
import {finishGroups,finishRequests} from '../lib/finishGroups.mjs'
test('recommendations never merge different sets; unknown is not base',()=>{const c={season:'2025',brand:'Topps',set:'Chrome',intake:{finishCandidate:'Touchdown Refractor'}};assert.equal(finishGroups([c,c,{...c,set:'Finest'}]).length,2);assert.equal(finishGroups([{...c,intake:{}},{...c,intake:{finishCandidate:'No parallel'}}]).length,2)})
test('bulk confirms exact entered finish and rejects duplicate or empty selections',()=>{assert.equal(finishRequests({items:[{key:'a',revision:'1',parallel:' Red Rookie Badge Refractor '} ]})[0].parallel,'Red Rookie Badge Refractor');assert.throws(()=>finishRequests({items:[]}));assert.throws(()=>finishRequests({items:[{key:'a',revision:'1',parallel:''},{key:'a',revision:'1',parallel:''}]}))})
