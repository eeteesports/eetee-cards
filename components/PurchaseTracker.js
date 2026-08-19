'use client'
import { useEffect, useRef } from 'react'
import { trackPurchase } from '@/lib/analytics'

// order/confirmation/page.js is a server component, so the GA4 'purchase'
// event fires from here on mount instead. useRef guards against firing
// twice on a re-render (React StrictMode in dev double-invokes effects) —
// a duplicate 'purchase' hit would double-count real revenue in reports,
// which matters more here than for the other, lower-stakes cart events.
export default function PurchaseTracker({ transactionId, value, shippingCost, items }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackPurchase({ transactionId, value, shippingCost, items })
  }, [transactionId, value, shippingCost, items])

  return null
}
