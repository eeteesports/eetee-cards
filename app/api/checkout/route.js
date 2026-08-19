// Creates a Stripe Checkout Session for the cart and hands back its
// hosted-page URL — the browser redirects there directly (Stripe's own
// page, not ours), then Stripe redirects back to /order/confirmation on
// success. Nothing here marks a card sold; that only happens once Stripe
// confirms payment, via the webhook (see app/api/webhooks/stripe).
import { getCard } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { computeShipping, PACKAGING_LABELS } from '@/lib/shipping'

export async function POST(request) {
  const { cardIds } = await request.json()
  if (!Array.isArray(cardIds) || !cardIds.length) {
    return Response.json({ error: 'cardIds is required' }, { status: 400 })
  }

  // Re-verify against Turso right now, not whatever the browser's cart
  // (localStorage) thought was true when the page loaded — closes the
  // race where a card sold between being added to the cart and checkout.
  const cards = await Promise.all(cardIds.map((id) => getCard(id)))
  const unavailable = []
  const available = []
  cards.forEach((card, i) => {
    const f = card?.fields
    if (!card || !f?.['For Sale'] || f['Asking Price'] == null) {
      unavailable.push(cardIds[i])
    } else {
      available.push(card)
    }
  })

  if (!available.length) {
    return Response.json({ error: 'None of these cards are still available.', unavailable }, { status: 409 })
  }

  const shipping = computeShipping(
    available.map((c) => ({ weightClass: c.fields['Weight Class'], price: c.fields['Asking Price'] }))
  )

  const stripe = getStripe()
  const origin = new URL(request.url).origin

  const lineItems = available.map((card) => {
    const f = card.fields
    const name = [f.Year, f.Brand, f.Set, f.Player].filter(Boolean).join(' ') || f.Player || 'Card'
    return {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(f['Asking Price'] * 100),
        product_data: {
          name,
          images: f['Front Image URL'] ? [f['Front Image URL']] : undefined,
          metadata: { cardId: card.id },
        },
      },
    }
  })

  const shippingLabel = PACKAGING_LABELS[shipping.packaging] + (shipping.signatureRequired ? ' + Signature Confirmation' : '')
  lineItems.push({
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: Math.round(shipping.cost * 100),
      product_data: { name: `Shipping — ${shippingLabel}` },
    },
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: ['US'] },
    success_url: `${origin}/order/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    metadata: {
      cardIds: available.map((c) => c.id).join(','),
      shippingMethod: shipping.packaging,
    },
  })

  return Response.json({ url: session.url, unavailable })
}
