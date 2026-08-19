// Packaging + protection shipping logic, per the Checkout & Postage Plan
// (Evan's answers, 2026-08-19). Two independent axes:
//   PACKAGING  — what physically fits, driven by card bulk/rigidity.
//   PROTECTION — signature/insurance, driven by dollar value only.
// A graded slab always needs at least a mailer regardless of value (a
// hard plastic case doesn't bend into an envelope); a $500 raw card still
// ships in an envelope if it's alone, but gets Signature Confirmation
// because of its price. The two never override each other.

// Flat blended rates, NOT live carrier rates — the plan's deliberate v1
// simplification (a rate-API integration is a later enhancement if
// volume justifies it). VERIFY THESE against usps.com and your own
// postage scale before relying on them for real charges: envelope
// depends on which weight bracket your actual packed envelope lands in,
// and the mailer rate isn't zone-adjusted.
export const SHIPPING_RATES = {
  envelope: 1.75, // USPS First-Class Mail, non-machinable (toploader) — flat nationwide
  mailer: 5.50,   // USPS Ground Advantage, small bubble mailer — flat placeholder, not zone-adjusted
  box: 13.65,     // USPS Priority Mail small flat-rate box — confirmed flat nationwide (Jul 2026)
}

export const PACKAGING_LABELS = {
  envelope: 'Standard Envelope',
  mailer: 'Bubble Mailer (USPS Ground Advantage)',
  box: 'Small Box (USPS Priority Mail)',
}

const ENVELOPE_MAX_EQUIVALENTS = 4
// Starting cutoff, not derived from real packing — Evan's own test of how
// many cards fit safely in one mailer should confirm or move this.
const MAILER_MAX_EQUIVALENTS = 20

const SIGNATURE_THRESHOLD = 200
export const SIGNATURE_COST = 4.15

// standard = 1, thick (patch/relic) = 3, graded_slab = 3 (comparable
// bulk for mailer/box sizing purposes — its envelope-blocking effect is
// handled separately below, not through this count).
function cardEquivalent(weightClass) {
  if (weightClass === 'thick' || weightClass === 'graded_slab') return 3
  return 1
}

// cards: array of { weightClass, price }
export function computeShipping(cards) {
  const hasSlab = cards.some((c) => c.weightClass === 'graded_slab')
  const cardEquivalents = cards.reduce((sum, c) => sum + cardEquivalent(c.weightClass), 0)
  const totalValue = cards.reduce((sum, c) => sum + (c.price || 0), 0)

  let packaging
  if (!hasSlab && cardEquivalents <= ENVELOPE_MAX_EQUIVALENTS) {
    packaging = 'envelope'
  } else if (cardEquivalents <= MAILER_MAX_EQUIVALENTS) {
    packaging = 'mailer'
  } else {
    packaging = 'box'
  }

  const signatureRequired = totalValue > SIGNATURE_THRESHOLD
  const cost = Math.round((SHIPPING_RATES[packaging] + (signatureRequired ? SIGNATURE_COST : 0)) * 100) / 100

  return { packaging, cost, signatureRequired, cardEquivalents, totalValue }
}
