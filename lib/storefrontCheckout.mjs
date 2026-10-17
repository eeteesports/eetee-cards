import {quoteCart, cardListPrice, isBargainCard} from './storefrontCart.mjs'
export const SHIPPING_CENTS = 700
export const SHIPPING_METHOD = 'USPS Ground Advantage · tracked bubble mailer'
export function checkoutManifest(catalog, selection) {
 const q=quoteCart(catalog,selection)
 if(!q.meetsMinimum)throw Error('Minimum $10 spend before shipping.')
 const physicalIds=[...q.chosenCards.map(c=>c.id),...q.chosenBundles.flatMap(b=>b.cards.map(c=>c.id))]
 const lines=q.chosenBundles.map(b=>({id:b.id,name:`${b.team} · ${b.name} (${b.cards.length} cards)`,image:b.cards[0].front,cents:2000,cardIds:b.cards.map(c=>c.id)}))
 let allocated=0,index=0
 for(const c of q.chosenCards){let cents=cardListPrice(c);if(isBargainCard(c)){index++;cents=index===q.fiftyCount+q.dollarCount?q.binTotalCents-allocated:Math.floor(cents*2/3);allocated+=cents}lines.push({id:c.id,name:[c.year,c.brand,c.set,c.player,'#'+c.number,c.parallel||c.family].filter(Boolean).join(' ').slice(0,250),image:c.front,cents,cardIds:[c.id]})}
 if(lines.length>100)throw Error('Please check out with no more than 100 individual cards and team sets at a time.')
 if(lines.reduce((sum,l)=>sum+l.cents,0)!==q.totalCents)throw Error('Cart total could not be verified.')
 return {lines,physicalIds,subtotalCents:q.totalCents,shippingCents:SHIPPING_CENTS,totalCents:q.totalCents+SHIPPING_CENTS}
}
