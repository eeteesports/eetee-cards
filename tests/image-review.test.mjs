import test from 'node:test'
import assert from 'node:assert/strict'
import {imageReviewInput,sameReviewOrigin,reviewKey} from '../lib/imageReviewInput.mjs'
const valid={cardId:'15481c9ec2c9f845',side:'front',issues:['crop'],note:' tighter crop '}
test('normalizes requests and preserves explicit issue selection',()=>{assert.deepEqual(imageReviewInput({...valid,issues:['crop','crop','brightness']}),{...valid,issues:['crop','brightness'],note:'tighter crop'});assert.equal(reviewKey(valid.cardId,'back'),'15481c9ec2c9f845:back')})
test('rejects invalid cards, issues, sides and oversized notes',()=>{for(const bad of [{cardId:'../../x'},{issues:[]},{issues:['delete']},{side:'anything'},{note:'x'.repeat(2001)},{issues:['other'],note:' '}])assert.throws(()=>imageReviewInput({...valid,...bad}),e=>e.status===400)})
test('writes require same-origin browser requests',()=>{assert.equal(sameReviewOrigin(new Request('https://eetee.cards/api/admin/image-reviews',{headers:{origin:'https://eetee.cards'}})),true);assert.equal(sameReviewOrigin(new Request('https://eetee.cards/api/admin/image-reviews',{headers:{origin:'https://evil.example'}})),false);assert.equal(sameReviewOrigin(new Request('https://eetee.cards/api/admin/image-reviews')),false)})
