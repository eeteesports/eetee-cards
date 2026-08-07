// Price "bins" for the storefront — mirrors how Evan physically organizes
// cheap cards (a literal 50-cent box, a literal $1 box, etc). Used by the
// homepage quick-filter chips, the team pages' carousels, and the cart's
// bulk-deal discount logic — keep all three in sync by editing only here.

export const PRICE_BINS = [
  { key: 'fifty-cent', label: '50¢ Bin', shortLabel: '50¢', min: 0,     max: 0.50 },
  { key: 'one-dollar',  label: '$1 Bin',       shortLabel: '$1',      min: 0.51,  max: 1.00 },
  { key: 'one-five',    label: '$1 – $5', shortLabel: '$1-$5',   min: 1.01,  max: 5.00 },
  { key: 'six-ten',     label: '$6 – $10',shortLabel: '$6-$10',  min: 5.01,  max: 10.00 },
  { key: 'ten-25',      label: '$10 – $25', shortLabel: '$10-$25', min: 10.01, max: 25.00 },
  { key: 'twentyfive-up', label: '$25+',       shortLabel: '$25+',    min: 25.01, max: Infinity },
]

export function binForPrice(price) {
  if (price == null || isNaN(price)) return null
  return PRICE_BINS.find((b) => price >= b.min && price <= b.max) || null
}

export function binByKey(key) {
  return PRICE_BINS.find((b) => b.key === key) || null
}
