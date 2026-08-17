import { promises as fs } from 'fs'
import path from 'path'
import { fetchEbayComps } from '@/lib/ebay'
import { listCardsForRainbowMatch } from '@/lib/db'

// Turso-backed replacement for the old direct-Airtable fetchOwnedCards()
// (2026-08-14) — same match criteria (player contains / exact year / set
// contains / exact card number), same returned field shape, so everything
// below this point (matchParallel, the enrichment loop, the response
// shape) is unchanged from before.
async function fetchOwnedCards(criteria) {
  return listCardsForRainbowMatch({
    playerContains: criteria.playerContains,
    year: criteria.year,
    setContains: criteria.setContains,
    cardNumber: criteria.cardNumber,
  })
}

function normalizeParallelName(name) {
  if (!name) return 'base'
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

function matchParallel(ownedCards, parallelDef) {
  const defName = normalizeParallelName(parallelDef.name)
  return ownedCards.find(card => {
    const cardParallel = normalizeParallelName(card['Parallel / Variant'])
    // Exact match
    if (cardParallel === defName) return true
    // Base card — no parallel / variant set
    if (parallelDef.id === 'base' && (!card['Parallel / Variant'] || cardParallel === 'base')) return true
    // Partial match (e.g. "green refractor" contains "green")
    if (cardParallel && defName && cardParallel.includes(defName.split(' ')[0]) &&
        defName.includes(cardParallel.split(' ')[0])) return true
    return false
  }) || null
}

export async function GET(request, { params }) {
  const { id } = params

  // Load rainbow definition
  let rainbow
  try {
    const filePath = path.join(process.cwd(), 'data', 'rainbows', `${id}.json`)
    const raw = await fs.readFile(filePath, 'utf-8')
    rainbow = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'Rainbow not found' }, { status: 404 })
  }

  // Fetch owned cards from Turso
  const ownedCards = await fetchOwnedCards(rainbow.matchCriteria)

  // Check eBay prices? Only if ?ebay=1 is in query
  const url = new URL(request.url)
  const fetchEbay = url.searchParams.get('ebay') === '1'

  // Build enriched parallel list
  const enrichedParallels = await Promise.all(
    rainbow.parallels.map(async (p) => {
      const owned = matchParallel(ownedCards, p)

      let ebayPrice = null
      let ebayUrl   = null
      if (fetchEbay && !owned) {
        try {
          const query = `${rainbow.year} Topps Chrome ${rainbow.player} #${rainbow.cardNumber} ${p.name}`
          const result = await fetchEbayComps(rainbow.player, String(rainbow.year), 'Chrome', 'Topps', p.name, null, p.printRun)
          if (result.items.length > 0) {
            const sorted = [...result.items].sort((a, b) => a.price - b.price)
            ebayPrice = sorted[0].price
            ebayUrl   = sorted[0].url
          }
        } catch { /* non-fatal */ }
      }

      return {
        ...p,
        owned:     !!owned,
        imageUrl:  owned?.['Front Image URL'] || null,
        condition: owned?.['Condition'] || null,
        serialNum: owned?.['Serial Number'] || null,
        ebayPrice,
        ebayUrl,
      }
    })
  )

  const owned   = enrichedParallels.filter(p => p.owned).length
  const total   = enrichedParallels.length
  const missing = total - owned

  return Response.json({
    ...rainbow,
    parallels:    enrichedParallels,
    stats: { owned, total, missing, pct: Math.round((owned / total) * 100) },
  })
}
