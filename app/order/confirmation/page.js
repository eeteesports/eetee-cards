import Link from 'next/link'
import { getWebOrderBySessionId, getCard } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { formatPrice } from '@/lib/format'
import PurchaseTracker from '@/components/PurchaseTracker'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_400/')
}

// Server component — Stripe redirects here with ?session_id=... after a
// successful payment. The webhook (app/api/webhooks/stripe) is what
// actually records the order, and it can land a beat after this redirect
// does, so this checks our own web_orders table first and falls back to
// asking Stripe directly for the session — rebuilt from the same real
// card records (each line item carries its cardId in metadata, set in
// app/api/checkout) so the buyer sees the cards they bought either way,
// not a "processing" placeholder.
export default async function OrderConfirmationPage({ searchParams }) {
  const sessionId = searchParams?.session_id
  if (!sessionId) {
    return (
      <Shell>
        <p className="text-gray-500">No order to show — if you just completed a purchase, check your email for confirmation.</p>
      </Shell>
    )
  }

  const order = await getWebOrderBySessionId(sessionId)
  if (order) {
    const items = order.items.map((i) => ({ card: i.card, price: i.price }))
    return (
      <Shell>
        <PurchaseTracker transactionId={sessionId} value={order.total} shippingCost={order.shipping_cost} items={items} />
        <Header email={order.buyer_email} />
        <ItemList items={items} />
        <Totals subtotal={order.subtotal} shipping={order.shipping_cost} total={order.total} />
      </Shell>
    )
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product'],
    })
    if (session.payment_status === 'paid') {
      const cardLines = session.line_items.data.filter((li) => li.price?.product?.metadata?.cardId)
      const cards = await Promise.all(cardLines.map((li) => getCard(li.price.product.metadata.cardId)))
      const items = cardLines.map((li, i) => ({ card: cards[i], price: (li.amount_total ?? 0) / 100 }))
      const itemsSubtotal = items.reduce((s, i) => s + i.price, 0)
      const shippingCost = Math.max(0, (session.amount_total ?? 0) / 100 - itemsSubtotal)

      return (
        <Shell>
          <PurchaseTracker transactionId={sessionId} value={(session.amount_total ?? 0) / 100} shippingCost={shippingCost} items={items} />
          <Header email={session.customer_details?.email} />
          <ItemList items={items} />
          <Totals subtotal={itemsSubtotal} shipping={shippingCost} total={(session.amount_total ?? 0) / 100} />
        </Shell>
      )
    }
  } catch {}

  return (
    <Shell>
      <p className="text-gray-500">We couldn't find that order. If you completed a purchase, check your email for confirmation, or reach out.</p>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-royal-600">
      <div className="bg-navy-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <img src="/eetee-logo.png" alt="eetee Cards" className="w-9 h-9 object-contain" />
            <span className="font-display font-semibold text-lg tracking-tight">eetee Cards</span>
          </Link>
        </div>
      </div>
      <div className="max-w-2xl mx-auto bg-gray-50 min-h-[calc(100vh-72px)] px-4 py-10">
        {children}
        <div className="mt-8">
          <Link href="/shop" className="text-navy-700 font-semibold text-sm hover:underline">
            ← Keep shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

function Header({ email }) {
  return (
    <div className="text-center mb-8">
      <div className="text-6xl mb-3">✅</div>
      <h1 className="font-display font-semibold text-2xl text-gray-900">Order confirmed!</h1>
      {email && <p className="text-gray-500 mt-2">A receipt is on its way to {email}.</p>}
    </div>
  )
}

function ItemList({ items }) {
  return (
    <div className="space-y-3 mb-6">
      {items.map(({ card, price }, i) => {
        const f = card?.fields || {}
        return (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-center">
            <div className="flex-shrink-0 w-14">
              {f['Front Image URL'] ? (
                <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{f.Player || 'Card'}</p>
              <p className="text-sm text-gray-500 truncate">{[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}</p>
            </div>
            <p className="font-semibold text-gray-800 flex-shrink-0">{formatPrice(price)}</p>
          </div>
        )
      })}
    </div>
  )
}

function Totals({ subtotal, shipping, total }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1.5">
      <div className="flex justify-between text-sm text-gray-500">
        <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-500">
        <span>Shipping</span><span>{formatPrice(shipping)}</span>
      </div>
      <div className="flex justify-between font-display font-semibold text-gray-900 text-lg pt-1.5 border-t border-gray-100">
        <span>Total</span><span>{formatPrice(total)}</span>
      </div>
    </div>
  )
}
