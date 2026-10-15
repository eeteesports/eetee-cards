export const MINIMUM_CENTS = 1000
export function binCost(listedValueCents) { return Math.round(listedValueCents * 2 / 3) }
export function quoteCart(catalog, selection = {}) {
  const cards = selection.cards ?? [], bundles = selection.bundles ?? []
  if (!Array.isArray(cards) || !Array.isArray(bundles) || cards.length > 5000 || bundles.length > 100) throw Error('Invalid selection.')
  if (new Set(cards).size !== cards.length || new Set(bundles).size !== bundles.length) throw Error('Each physical card or team set can only be selected once.')
  const cardMap = new Map(catalog.cards.map(c => [c.id, c])), bundleMap = new Map(catalog.bundles.map(b => [b.id, b]))
  const chosenCards = cards.map(id => { const c = cardMap.get(id); if (!c) throw Error('A selected card is no longer available. Refresh your selection.'); return c })
  const chosenBundles = bundles.map(id => { const b = bundleMap.get(id); if (!b) throw Error('A selected team set is no longer available. Refresh your selection.'); return b })
  const physical = new Set(cards)
  for (const b of chosenBundles) for (const c of b.cards) { if (physical.has(c.id)) throw Error('A physical card appears in more than one item.'); physical.add(c.id) }
  const fiftyCount = chosenCards.filter(c => c.binPriceCents === 50).length, dollarCount = chosenCards.filter(c => c.binPriceCents === 100).length
  if (fiftyCount + dollarCount !== cards.length) throw Error('Invalid card bin.')
  const binValueCents = fiftyCount * 50 + dollarCount * 100
  const binTotalCents = binCost(binValueCents)
  const totalCents = binTotalCents + chosenBundles.length * 2000
  const retailCents = fiftyCount * 50 + dollarCount * 100 + chosenBundles.length * 2000
  return {chosenCards, chosenBundles, fiftyCount, dollarCount, binValueCents, binTotalCents, totalCents, savingsCents:retailCents-totalCents, meetsMinimum:totalCents>=MINIMUM_CENTS}
}
export function requestEmail(quote) {
  if (!quote.meetsMinimum) throw Error('Minimum $10 spend before shipping.')
  const lines = ['Hi Evan,', '', 'I would like to request these cards. Please confirm availability and shipping before payment.', '', ...quote.chosenBundles.map(b => `${b.team} ${b.name} (${b.id}) — $20`)]
  for (const [cents,label,count] of [[50,'50¢ bin',quote.fiftyCount],[100,'$1 bin',quote.dollarCount]]) if (count) {
    lines.push('', `${label}: ${count} cards (listed value $${(count*cents/100).toFixed(2)})`)
    lines.push(...quote.chosenCards.filter(c=>c.binPriceCents===cents).map(c=>`${c.player} #${c.number} [${c.id}]`))
  }
  lines.push('', `Bin listed value: $${(quote.binValueCents/100).toFixed(2)}; discounted bin price: $${(quote.binTotalCents/100).toFixed(2)}`, `Card subtotal: $${(quote.totalCents/100).toFixed(2)} + shipping`, 'My shipping ZIP code: ', '', 'Thanks!')
  return 'mailto:eeteecards@gmail.com?subject='+encodeURIComponent('eetee.cards order request — $'+(quote.totalCents/100).toFixed(2))+'&body='+encodeURIComponent(lines.join('\n'))
}
