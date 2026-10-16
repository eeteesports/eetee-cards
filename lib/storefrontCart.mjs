export const MINIMUM_CENTS = 1000
export function binCost(listedValueCents) { return Math.round(listedValueCents * 2 / 3) }
export const cardListPrice = c => c.priceCents ?? c.binPriceCents
export const isBargainCard = c => [50,100].includes(cardListPrice(c))
export const cardSalePrice = c => isBargainCard(c) ? cardListPrice(c)*2/3 : cardListPrice(c)
export function quoteCart(catalog, selection = {}) {
  const cards = selection.cards ?? [], bundles = selection.bundles ?? []
  if (!Array.isArray(cards) || !Array.isArray(bundles) || cards.length > 5000 || bundles.length > 100) throw Error('Invalid selection.')
  if (new Set(cards).size !== cards.length || new Set(bundles).size !== bundles.length) throw Error('Each physical card or team set can only be selected once.')
  const cardMap = new Map(catalog.cards.map(c => [c.id, c])), bundleMap = new Map(catalog.bundles.map(b => [b.id, b]))
  const chosenCards = cards.map(id => { const c = cardMap.get(id); if (!c) throw Error('A selected card is no longer available. Refresh your selection.'); return c })
  const chosenBundles = bundles.map(id => { const b = bundleMap.get(id); if (!b) throw Error('A selected team set is no longer available. Refresh your selection.'); return b })
  const physical = new Set(cards)
  for (const b of chosenBundles) for (const c of b.cards) { if (physical.has(c.id)) throw Error('A physical card appears in more than one item.'); physical.add(c.id) }
  const fiftyCount = chosenCards.filter(c => cardListPrice(c) === 50).length, dollarCount = chosenCards.filter(c => cardListPrice(c) === 100).length
  for(const c of chosenCards) if(!Number.isSafeInteger(cardListPrice(c))||cardListPrice(c)<=0) throw Error('Invalid card price.')
  const individualCards=chosenCards.filter(c=>!isBargainCard(c)),individualTotalCents=individualCards.reduce((sum,c)=>sum+cardListPrice(c),0)
  const binValueCents = fiftyCount * 50 + dollarCount * 100
  const binTotalCents = binCost(binValueCents)
  const totalCents = binTotalCents + individualTotalCents + chosenBundles.length * 2000
  const retailCents = binValueCents + individualTotalCents + chosenBundles.length * 2000
  return {chosenCards, chosenBundles, individualCards, individualTotalCents, fiftyCount, dollarCount, binValueCents, binTotalCents, totalCents, savingsCents:retailCents-totalCents, meetsMinimum:totalCents>=MINIMUM_CENTS}
}
export function requestEmail(quote) {
  if (!quote.meetsMinimum) throw Error('Minimum $10 spend before shipping.')
  const teamNames = quote.chosenBundles.map(b => `${b.team} — ${b.name}`)
  const requested = [...teamNames, ...(quote.chosenCards.length ? ['the individual cards listed below'] : [])].join('; ')
  const subject = 'Request: ' + (teamNames.length ? teamNames.join('; ') : 'Individual cards')
  const lines = [
    `Hi - I would like to request ${requested}. Please confirm it is still available and what shipping would cost.`,
    '', "The address I'd like it shipped to is:", '', '', '',
    'Thank you', '', '-[Name]',
    '[Reddit/IG name if interested in communicating there instead of email]'
  ]
  if (quote.chosenCards.length) {
    lines.push('', 'Selected individual cards:')
    for (const c of quote.chosenCards) lines.push(`${c.year||''} ${c.brand||''} ${c.set||''} ${c.player} #${c.number} ${c.parallel||c.family||''} ${c.serial||''} [${c.id}]`.trim())
    if(quote.binValueCents)lines.push('', `Bargain bins after discount: $${(quote.binTotalCents/100).toFixed(2)}`)
    if(quote.individualTotalCents)lines.push(`Other individual cards: $${(quote.individualTotalCents/100).toFixed(2)}`)
    lines.push(`Order subtotal: $${(quote.totalCents/100).toFixed(2)} + shipping`)
  }
  return 'mailto:eeteecards@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n'))
}
