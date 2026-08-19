// GA4 ecommerce event helpers (2026-08-19) — thin wrapper around
// window.gtag (set up by <GoogleAnalytics> in app/layout.js) so call
// sites read as intent ("trackAddToCart(card)") instead of raw gtag(...)
// calls scattered everywhere. No-ops safely if gtag isn't loaded yet
// (ad blockers, still-loading script) — analytics should never be able
// to break the actual shopping flow.
function gtagEvent(name, params) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

// Card record ({ id, fields }) -> GA4's recommended item shape.
function toGAItem(card) {
  const f = card?.fields || {}
  return {
    item_id: card?.id,
    item_name: [f.Year, f.Brand, f.Set, f.Player].filter(Boolean).join(' ') || f.Player || 'Card',
    item_category: f.League || f.Sport || undefined,
    price: f['Asking Price'] ?? undefined,
    quantity: 1,
  }
}

export function trackViewItem(card) {
  const f = card?.fields || {}
  gtagEvent('view_item', { currency: 'USD', value: f['Asking Price'] ?? undefined, items: [toGAItem(card)] })
}

export function trackAddToCart(card) {
  const f = card?.fields || {}
  gtagEvent('add_to_cart', { currency: 'USD', value: f['Asking Price'] ?? undefined, items: [toGAItem(card)] })
}

export function trackRemoveFromCart(card) {
  const f = card?.fields || {}
  gtagEvent('remove_from_cart', { currency: 'USD', value: f['Asking Price'] ?? undefined, items: [toGAItem(card)] })
}

export function trackBeginCheckout(cards, value) {
  gtagEvent('begin_checkout', { currency: 'USD', value, items: cards.map(toGAItem) })
}

// items: array of { card, price } (matches the shape order/confirmation
// already builds for both the webhook-backed and Stripe-fallback paths).
export function trackPurchase({ transactionId, value, shippingCost, items }) {
  gtagEvent('purchase', {
    transaction_id: transactionId,
    currency: 'USD',
    value,
    shipping: shippingCost,
    items: items.map(({ card, price }) => ({ ...toGAItem(card), price })),
  })
}
