// Bulk deals, advertised via the ribbon badges on the homepage value
// tiles and applied automatically at real Stripe checkout as a dynamic
// coupon — see lib/discounts.js, which combines this with any other
// discount rules (e.g. a spend-threshold %-off) into the one number
// app/api/checkout and app/cart both use.

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
