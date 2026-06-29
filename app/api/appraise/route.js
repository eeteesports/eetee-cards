import Anthropic from '@anthropic-ai/sdk'
import { fetchEbayComps, buildEbayContext, buildSourceLabel } from '@/lib/ebay'

export async function POST(request) {
  try {
    const body = await request.json()
    const { frontImageUrl, backImageUrl, query } = body

    // ── TEXT SEARCH MODE ──────────────────────────────────────────────
    if (query && !frontImageUrl) {
      const ebayResult  = await fetchEbayComps(query)
      const ebayContext = buildEbayContext(ebayResult)

      const prices = ebayResult.items.map((s) => s.price)
      const avg    = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null

      let aiEstimate = null
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
          const resp = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            system: 'Sports card market expert. Return ONLY valid JSON, no markdown.',
            messages: [{
              role: 'user',
              content: `Card: "${query}"\n\n${ebayContext}\n\nReturn ONLY: {"estimatedValue":<number or null>,"low":<number or null>,"high":<number or null>,"confidence":"high"|"medium"|"low","trend":"rising"|"stable"|"falling"|"unknown","notes":"<1-2 sentences>"}`,
            }],
          })
          aiEstimate = JSON.parse(resp.content[0].text.trim())
        } catch { /* non-fatal */ }
      }

      return Response.json({
        mode:         'search',
        query,
        ebayKeywords: ebayResult.keywords,
        ebayDataType: ebayResult.dataType,
        sales:        ebayResult.items,
        stats:        prices.length ? {
          avg:   Math.round(avg * 100) / 100,
          low:   Math.min(...prices),
          high:  Math.max(...prices),
          count: prices.length,
        } : null,
        ...aiEstimate,
        sourceLabel: buildSourceLabel(ebayResult.dataType, ebayResult.items.length),
      })
    }

    // ── PHOTO MODE ────────────────────────────────────────────────────
    if (!frontImageUrl) {
      return Response.json({ error: 'frontImageUrl or query required' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const imageContent = [{ type: 'image', source: { type: 'url', url: frontImageUrl } }]
    if (backImageUrl) imageContent.push({ type: 'image', source: { type: 'url', url: backImageUrl } })

    // Step 1: identify card from photo
    const idResponse = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 600,
      system: 'Expert sports card identifier. Return ONLY valid JSON with no markdown.',
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text', text: `Identify this sports card. Return ONLY:
{
  "player": "<string>",
  "year": "<string or null>",
  "brand": "<string or null>",
  "set": "<string or null>",
  "parallel": "<string or null>",
  "cardNumber": "<string or null>",
  "sport": "<string>",
  "league": "<string>",
  "team": "<string or null>",
  "rookie": <boolean>,
  "numbered": <boolean>,
  "printRun": <number or null>,
  "condition": "<'Mint' | 'Near Mint' | 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Poor' | null>",
  "worthGrading": <boolean>,
  "gradingNote": "<string or null>"
}` },
        ],
      }],
    })

    const identified = JSON.parse(idResponse.content[0].text.trim())

    // Step 2: eBay comps + AI value in parallel
    const ebayResult = await fetchEbayComps(
      identified.player, identified.year, identified.set, identified.brand,
      identified.parallel, identified.condition, identified.printRun
    )
    const ebayContext = buildEbayContext(ebayResult)

    const cardDesc = [
      identified.year, identified.brand, identified.set, identified.player,
      identified.parallel ? `(${identified.parallel})` : null,
      identified.rookie ? 'Rookie Card' : null,
      identified.numbered && identified.printRun ? `/${identified.printRun}` : null,
      identified.condition || null,
    ].filter(Boolean).join(' ')

    const valResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'Sports card market expert. Return ONLY valid JSON, no markdown.',
      messages: [{
        role: 'user',
        content: `Card: "${cardDesc}"\n\n${ebayContext}\n\nReturn ONLY: {"estimatedValue":<number or null>,"valueLow":<number or null>,"valueHigh":<number or null>,"confidence":"high"|"medium"|"low","trend":"rising"|"stable"|"falling"|"unknown","notes":"<2-3 sentences referencing eBay data if available>"}`,
      }],
    })

    const valData = JSON.parse(valResponse.content[0].text.trim())
    const prices  = ebayResult.items.map((s) => s.price)
    const avg     = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null

    return Response.json({
      mode:         'photo',
      ...identified,
      ...valData,
      ebayKeywords: ebayResult.keywords,
      ebayDataType: ebayResult.dataType,
      sales:        ebayResult.items,
      stats:        prices.length ? {
        avg:   Math.round(avg * 100) / 100,
        low:   Math.min(...prices),
        high:  Math.max(...prices),
        count: prices.length,
      } : null,
      sourceLabel: buildSourceLabel(ebayResult.dataType, ebayResult.items.length),
    })
  } catch (err) {
    console.error('Appraise error:', err)
    return Response.json({ error: err.message || 'Appraisal failed' }, { status: 500 })
  }
}
