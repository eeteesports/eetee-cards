const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const baseFamilies = new Set(['', 'base', 'rookies', 'rated rookie', 'rated rookies', 'rookie class', 'rookie class ii', 'rookie class base ii', 'veteran class', 'rookie portraits', 'rookie variations', 'chrome rookie red rc logo variation', 'concourse', 'premier level', 'club level', 'field level'])
const mosaicBaseSubsets = new Set(['hall of fame', 'nfl debut', 'national pride'])

export function bundleStats(cards) {
  return cards.reduce((stats, card) => {
    const family = normalize(card.family)
    const parallel = normalize(card.parallel)
    const isBase = baseFamilies.has(family) || family.startsWith('base ') || (normalize(card.set) === 'mosaic' && mosaicBaseSubsets.has(family))
    if (card.rookie === true) stats.rookies++
    if (!isBase) stats.inserts++
    if (parallel && !['base', 'standard', 'regular', 'image variation'].includes(parallel)) stats.parallels++
    const year = Number(card.year)
    if (Number.isInteger(year) && year > 0 && year < 2000) stats.vintage++
    return stats
  }, { rookies: 0, inserts: 0, parallels: 0, vintage: 0 })
}
