// Only public listing fields leave the server. No seller tokens or account data.
export const EBAY_SELLER='eetee_cards'
export const EBAY_AUCTIONS_URL='https://www.ebay.com/sch/i.html?_ssn=eetee_cards&LH_Auction=1&_sop=1'
export function selectAuctions(items,now=Date.now()){
 return items.filter(i=>i.seller?.username?.toLowerCase()===EBAY_SELLER&&i.buyingOptions?.includes('AUCTION')&&Date.parse(i.itemEndDate)>now&&i.image?.imageUrl&&i.currentBidPrice?.currency==='USD')
 .sort((a,b)=>Date.parse(a.itemEndDate)-Date.parse(b.itemEndDate)).slice(0,4).map(i=>({id:String(i.legacyItemId||i.itemId),title:i.title,image:i.thumbnailImages?.find(x=>x.imageUrl?.includes('s-l1600'))?.imageUrl||i.image.imageUrl,url:i.itemWebUrl,currentBid:Number(i.currentBidPrice.value),bidCount:Number.isInteger(i.bidCount)?i.bidCount:null,endsAt:i.itemEndDate})).filter(i=>Number.isFinite(i.currentBid)&&i.currentBid>=0&&/^https:\/\/(www\.)?ebay\.com\//.test(i.url))
}
