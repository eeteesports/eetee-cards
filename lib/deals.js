// Bulk deals, auto-applied in the cart based on how many qualifying cards
// (by price bin, see priceBins.js) are in it. These are advertised at the
// top of the site via <DealsBanner> and enforced here so the numbers never
// drift apart. Checkout is currently an email/offer flow, not real payment,
// so "applied" means: reflected in the cart total and included in the offer
// email so Evan (or a future Stripe integration) honors it.

export const DEALS = [
  {
    id: 'dollar-bin-10-for-5-free',
    binKey: 'one-dollar',
    label: 'Dollar Bin Discount',
    description: 'Buy 10 $1 cards, get 5 free',
    buyQty: 10,
    freeQty: 5,
    unitPrice: 1.00,
  },
  {
    id: 'fifty-cent-20-for-10-free',
    binKey: 'fifty-cent',
    label: '50¢ Bin Special',
    description: 'Buy 20 50¢ cards, get 10 free',
    buyQty: 20,
    freeQty: 10,
    unitPrice: 0.50,
  },
]

import { binForPrice } from './priceBins'

// items: array of cart card records (Airtable shape: { fields: { 'Asking Price': n } })
export function computeDealDiscounts(items) {
  return DEALS.map((deal) => {
    const qualifying = items.filter((c) => binForPrice(c.fields?.['Asking Price'])?.key === deal.binKey)
    const sets = Math.floor(qualifying.length / deal.buyQty)
    const freeCount = sets * deal.freeQty
    const discount = Math.round(freeCount * deal.unitPrice * 100) / 100
    return { ...deal, qualifyingCount: qualifying.length, sets, freeCount, discount }
  }).filter((d) => d.sets > 0)
}
