// General discount orchestrator for real checkout (2026-08-19) —
// combines whatever discount rules are actually configured into one
// dollar amount, so app/api/checkout can turn it into a single Stripe
// coupon and app/cart can preview the same number before paying.
//
// Currently just the bulk price-bin deals already defined in lib/deals.js
// ("buy 10 $1 cards, get 5 free"). Add a new rule type here (e.g. a
// spend-threshold %-off) the moment there's a real rule to configure —
// nothing is invented ahead of an actual number being decided; see
// THRESHOLD_DEALS below for where that goes.
import { computeDealDiscounts } from './deals'

// Spend-threshold deals ("orders over $X get Y% off") — empty until
// there's a real threshold/percent to configure. Shape ready to use:
// { id, minSubtotal, percentOff, label }
export const THRESHOLD_DEALS = []

function computeThresholdDiscount(items) {
  const subtotal = items.reduce((s, c) => s + (c.fields?.['Asking Price'] || 0), 0)
  // Best single threshold deal applies (not stacked) — highest minSubtotal met.
  const applicable = THRESHOLD_DEALS
    .filter((d) => subtotal >= d.minSubtotal)
    .sort((a, b) => b.minSubtotal - a.minSubtotal)[0]
  if (!applicable) return null
  return { ...applicable, discount: Math.round(subtotal * (applicable.percentOff / 100) * 100) / 100 }
}

// items: array of cart card records ({ fields: { 'Asking Price': n } })
// Returns { amount, labels } — amount in dollars (0 if nothing qualifies).
export function computeDiscount(items) {
  const bulkDeals = computeDealDiscounts(items)
  const threshold = computeThresholdDiscount(items)

  const labels = [
    ...bulkDeals.map((d) => `${d.label} (${d.freeCount} free)`),
    ...(threshold ? [`${threshold.label}`] : []),
  ]
  const amount = Math.round(
    (bulkDeals.reduce((s, d) => s + d.discount, 0) + (threshold?.discount || 0)) * 100
  ) / 100

  return { amount, labels }
}
