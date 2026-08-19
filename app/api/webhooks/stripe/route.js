// Stripe calls this when something actually happens to a payment — this
// is the ONLY place a card gets marked sold. Not the checkout click (the
// buyer might abandon or the card might decline), not the redirect back
// to /order/confirmation (that page can be reloaded, revisited, or never
// hit at all if the buyer closes the tab) — only a verified webhook event
// from Stripe itself.
//
// Needs the RAW request body for signature verification, so this can't
// use `request.json()` like every other route here — Stripe's signature
// is computed over the exact bytes it sent, and re-serializing a parsed
// object won't match.
import { getStripe } from '@/lib/stripe'
import { createWebOrder } from '@/lib/db'

export async function POST(request) {
  const stripe = getStripe()
  const signature = request.headers.get('stripe-signature')
  const rawBody = await request.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const cardIds = (session.metadata?.cardIds || '').split(',').filter(Boolean)

    if (cardIds.length) {
      await createWebOrder({
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent,
        buyerName: session.customer_details?.name,
        buyerEmail: session.customer_details?.email,
        shippingAddress: session.shipping_details?.address || session.customer_details?.address,
        subtotal: (session.amount_subtotal ?? 0) / 100,
        shippingCost: (session.total_details?.amount_shipping ?? 0) / 100,
        shippingMethod: session.metadata?.shippingMethod || '',
        total: (session.amount_total ?? 0) / 100,
        cardIds,
      })
    }
  }

  return Response.json({ received: true })
}
