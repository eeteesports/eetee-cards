const array=x=>x==null?[]:Array.isArray(x)?x:[x]
const money=value=>{const n=Number(value?.['#text']??value);return value!==undefined&&value!==null&&Number.isFinite(n)?n:null}
export function listingFeeReport(response,phase='validation'){
 const entries=array(response?.Fees?.Fee).map(f=>({name:String(f.Name||''),amount:money(f.Fee),currency:f.Fee?.['@_currencyID']||'USD',promotionalDiscount:money(f.PromotionalDiscount)})).filter(f=>f.name&&f.amount!==null)
 // ListingFee is the total; InsertionFee and upgrade entries are components.
 // Never add the total to those components or treat an absent response as zero.
 const total=entries.find(f=>f.name==='ListingFee')
 return {phase,provided:entries.length>0,total:total?.amount??null,currency:total?.currency||entries[0]?.currency||'USD',entries,discountReasons:array(response?.DiscountReason),estimate:phase==='validation'}
}
