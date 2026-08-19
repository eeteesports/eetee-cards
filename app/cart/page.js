'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { formatPrice } from '@/lib/format'
import { computeShipping, PACKAGING_LABELS } from '@/lib/shipping'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_400/')
}

// Shell shared by every state on this page (empty, active) — every other
// page carries the navy header + royal rail; this one used to render
// blank white with nothing above it.
function CartShell({ children }) {
  return (
    <div className="min-h-screen bg-royal-600">
      <div className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/eetee-logo.png" alt="eetee Cards" className="w-9 h-9 object-contain" />
            <span className="font-display font-semibold text-lg tracking-tight">eetee Cards</span>
          </Link>
          <Link href="/shop" className="text-sm font-semibold text-white/70 hover:text-white px-3 py-2">
            ← Continue Browsing
          </Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto bg-gray-50 min-h-[calc(100vh-72px)]">
        {children}
      </div>
    </div>
  )
}

// Real Stripe checkout (2026-08-19) — replaces the old email-offer flow.
// Every card here already has a fixed Asking Price (CartContext.add()
// refuses anything else), so this is a straight Buy Now: show the order,
// hand off to Stripe's own hosted checkout page for address + payment,
// Stripe redirects back to /order/confirmation on success. The shipping
// shown here is a client-side preview from the same lib/shipping.js the
// server uses — /api/checkout recomputes it authoritatively, so this can
// never be the thing that actually decides what gets charged.
export default function CartPage() {
  const { items, remove, clear } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const subtotal = items.reduce((s, c) => s + (c.fields?.['Asking Price'] || 0), 0)
  const shipping = useMemo(
    () => computeShipping(items.map((c) => ({ weightClass: c.fields?.['Weight Class'], price: c.fields?.['Asking Price'] || 0 }))),
    [items]
  )
  const total = subtotal + (items.length ? shipping.cost : 0)

  async function handleCheckout() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: items.map((c) => c.id) }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.unavailable?.length) {
          data.unavailable.forEach((id) => remove(id))
          setError('One or more cards in your cart just sold — they’ve been removed. Please review and try again.')
        } else {
          setError('Something went wrong starting checkout — please try again.')
        }
        setSubmitting(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Something went wrong starting checkout — please try again.')
      setSubmitting(false)
    }
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <CartShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-7xl mb-4">🛒</div>
          <h2 className="font-display font-semibold text-2xl text-gray-900">Your cart is empty</h2>
          <p className="text-gray-500 mt-2">Browse the collection and add cards you're interested in.</p>
          <Link href="/shop" className="mt-6 bg-navy-900 hover:bg-navy-800 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors">
            Browse Cards for Sale
          </Link>
        </div>
      </CartShell>
    )
  }

  return (
    <CartShell>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-semibold text-xl text-gray-900">🛒 Your Cart</h1>
          <button onClick={clear} className="text-sm text-red-400 hover:text-red-600 font-medium">
            Clear all
          </button>
        </div>

        {/* Card list */}
        <div className="space-y-3 mb-6">
          {items.map((card) => {
            const f = card.fields || {}
            return (
              <div key={card.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-center">
                <div className="flex-shrink-0 w-16">
                  {f['Front Image URL'] ? (
                    <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-2xl">🃏</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{f.Player || 'Unknown Player'}</p>
                  <p className="text-sm text-gray-500 truncate">{[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}</p>
                  {f['Parallel / Variant'] && (
                    <p className="text-xs text-navy-600 font-medium mt-0.5">{f['Parallel / Variant']}</p>
                  )}
                  <p className="font-semibold text-gray-800 mt-1.5">{formatPrice(f['Asking Price'])}</p>
                </div>

                <button onClick={() => remove(card.id)} className="text-gray-300 hover:text-red-400 text-xl self-start flex-shrink-0">
                  ×
                </button>
              </div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Shipping — {PACKAGING_LABELS[shipping.packaging]}{shipping.signatureRequired ? ' + signature' : ''}</span>
            <span>{formatPrice(shipping.cost)}</span>
          </div>
          <div className="flex justify-between font-display font-semibold text-gray-900 text-lg pt-1.5 border-t border-gray-100">
            <span>Total</span><span>{formatPrice(total)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={submitting}
          className="w-full bg-navy-900 hover:bg-navy-800 text-white py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Starting checkout…' : `Proceed to Payment — ${formatPrice(total)}`}
        </button>
        <p className="text-xs text-center text-gray-400 mt-3">
          You'll enter shipping and payment on Stripe's secure checkout page.
        </p>
      </div>
    </CartShell>
  )
}
