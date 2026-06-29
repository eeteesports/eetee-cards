import { fetchEbayComps } from '@/lib/ebay'

export async function POST(request) {
  try {
    const { player, year, brand, set, parallel, condition, printRun } = await request.json()
    if (!player) return Response.json({ error: 'Player required' }, { status: 400 })

    const { keywords, items, dataType, error } = await fetchEbayComps(
      player, year, set, brand, parallel, condition, printRun
    )

    const prices = items.map((s) => s.price)
    const avg    = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null

    return Response.json({
      keywords,
      dataType,
      totalFound: items.length,
      items,
      stats: prices.length ? {
        avg:   Math.round(avg * 100) / 100,
        low:   Math.min(...prices),
        high:  Math.max(...prices),
        count: prices.length,
      } : null,
      error: error || null,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
