// Bulk deals, advertised via the ribbon badges on the homepage value
// tiles (see DEALS below, still live) and via priceBins.js's bin keys.
//
// computeDealDiscounts() is NOT wired into real checkout (app/cart/page.js
// + app/api/checkout) as of the 2026-08-19 Stripe cutover — it was built
// for the old email-offer flow, which computed the discount by hand into
// the offer email. Real Checkout Sessions charge each card's Asking Price
// with no bulk discount applied right now, so the homepage's "10 for 5
// free" / "20 for 10 free" badges are currently a promise checkout
// doesn't keep. Needs either a Stripe Coupon wired into
// app/api/checkout/route.js, or the badges pulled until that's done —
// flagged, not silently dropped.

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
