import Stripe from 'stripe'

let _stripe = null
export function getStripe() {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY env var')
  _stripe = new Stripe(key)
  return _stripe
}
