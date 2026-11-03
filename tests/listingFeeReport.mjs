import assert from 'node:assert/strict'
import {listingFeeReport} from '../lib/listingFeeReport.mjs'
const f=(name,amount,discount)=>({Name:name,Fee:{'#text':String(amount),'@_currencyID':'USD'},...(discount===undefined?{}:{PromotionalDiscount:{'#text':String(discount)}})})
const quote=listingFeeReport({Fees:{Fee:[f('InsertionFee',.25),f('ListingFee',.25)]}})
assert.equal(quote.total,.25);assert.equal(quote.entries.length,2);assert.equal(quote.estimate,true)
const actual=listingFeeReport({Fees:{Fee:[f('InsertionFee',0,.25),f('ListingFee',0,.25)]},DiscountReason:'SpecialOffer'},'publication')
assert.equal(actual.total,0);assert.equal(actual.entries[0].promotionalDiscount,.25);assert.equal(actual.estimate,false);assert.deepEqual(actual.discountReasons,['SpecialOffer'])
assert.equal(listingFeeReport({}).total,null);assert.equal(listingFeeReport({}).provided,false)
assert.equal(listingFeeReport({Fees:{Fee:[f('InsertionFee',.25)]}}).total,null)
console.log('Fee reports preserve actual zero fees, missing totals, discounts and phase; total and components are not double-counted.')
