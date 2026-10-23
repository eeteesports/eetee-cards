import {cardListPrice} from './storefrontCart.mjs'

// A stable browse order: accessible singles, standout cards, and one bin card
// per four slots. Explicit price/year sorts bypass this merchandising order.
export function featuredCatalog(cards){
 const targets=[200,500,1000,5000,100]
 const buckets=targets.map(()=>[])
 const band=c=>{const p=cardListPrice(c);return p<=100?4:p<500?0:p<1000?1:p<2500?2:3}
 const quality=c=>Number(Boolean(c.autograph||c.autographed))*4+Number(Boolean(c.graded))*3+Number(Boolean(c.serial||c.printRun))*2+Number(Boolean(c.parallel))
 for(const card of cards)buckets[band(card)].push(card)
 for(let i=0;i<buckets.length;i++)buckets[i].sort((a,b)=>Math.abs(cardListPrice(a)-targets[i])-Math.abs(cardListPrice(b)-targets[i])||quality(b)-quality(a)||String(b.year).localeCompare(String(a.year))||a.player.localeCompare(b.player)||a.id.localeCompare(b.id))
 const pattern=[1,2,3,4,0,1,2,4],fallback=[1,2,0,3,4],result=[],players=new Set(),listings=new Set()
 while(result.length<cards.length){
  const wanted=pattern[result.length%pattern.length]
  const index=buckets[wanted].length?wanted:fallback.find(i=>buckets[i].length)
  const bucket=buckets[index]
  let pick=bucket.findIndex(c=>!players.has(c.player))
  if(pick<0)pick=bucket.findIndex(c=>!listings.has(c.listingId||c.id))
  const [card]=bucket.splice(pick<0?0:pick,1)
  result.push(card);players.add(card.player);listings.add(card.listingId||card.id)
 }
 return result
}
