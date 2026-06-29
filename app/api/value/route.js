import Anthropic from '@anthropic-ai/sdk'

const EBAY_FINDING_URL = 'https://svcs.ebay.com/services/search/FindingService/v1'
const SPORTS_CARDS_CATEGORY = '64482'

async function fetchEbaySales(player, year, set, brand, parallel, condition, printRun) {
  try {
    const keywords = [
      player,
      year,
      set || brand,
      parallel || null,
      printRun ? `/${printRun}` : null,
      condition?.match(/PSA|BGS|SGC/) ? condition : null,
    ].filter(Boolean).join(' ')

    const params = new URLSearchParams({
      'OPERATION-NAME':       'findCompletedItems',
      'SERVICE-VERSION':      '1.0.0',
      'APP-NAME':             process.env.EBAY_APP_ID,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'keywords':             keywords,
      'categoryId':           SPORTS_CARDS_CATEGORY,
      'itemFilter(0).name':   'SoldItemsOnly',
      'itemFilter(0).value':  'true',
      'sortOrder':            'EndTimeSoonest',
      'paginationInput.entriesPerPage': '10',
    })

    const res  = await fetch(`${EBAY_FINDING_URL}?${params}`)
    const data = await res.json()
    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || []

    const sales = items
      .filter((i) => i.sellingStatus?.[0]?.sellingState?.[0] === 'EndedWithSales')
      .map((i) => ({
        title: i.title?.[0] || '',
        price: parseFloat(i.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'] || '0'),
        date:  i.listingInfo?.[0]?.endTime?.[0]?.slice(0, 10) || '',
      }))
      .filter((s) => s.price > 0)

    return { keywords, sales }
  } catch {
    return { keywords: '', sales: [] }
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { player, year, brand, set, parallel, condition, rookie, numbered, printRun, sport, league, team, cardNumber } = body

    if (!player) return Response.json({ error: 'Player name required' }, { status: 400 })

    const cardDesc = [
      year, brand, set, player,
      parallel ? `(${parallel})` : null,
      cardNumber ? `#${cardNumber}` : null,
      team || null,
      rookie ? 'Rookie Card' : null,
      numbered && printRun ? `Numbered /${printRun}` : numbered ? 'Numbered' : null,
      condition || null,
    ].filter(Boolean).join(' ')

    // Fetch eBay sold comps in parallel with nothing else (fast ~300ms)
    const { keywords: ebayKeywords, sales } = await fetchEbaySales(
      player, year, set, brand, parallel, condition, printRun
    )

    // Build eBay context block for Claude
    let ebayContext = ''
    if (sales.length > 0) {
      const prices  = sales.map((s) => s.price)
      const avg     = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
      const low     = Math.min(...prices).toFixed(2)
      const high    = Math.max(...prices).toFixed(2)

      const saleLines = sales
        .slice(0, 8)
        .map((s) => `  • $${s.price.toFixed(2)} on ${s.date} — "${s.title}"`)
        .join('\n')

      ebayContext = `
REAL EBAY SOLD DATA (searched: "${ebayKeywords}"):
${saleLines}

Summary: ${sales.length} recent sales | avg $${avg} | range $${low}–$${high}

Use these actual sales as your primary reference. Adjust from the eBay average if the condition, parallel, or other specifics of THIS card differ from the listings above.`
    } else {
      ebayContext = `No recent eBay sold listings found for this card. Base your estimate on your training knowledge of this player, set, and comparable cards.`
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are a sports card market expert. When real eBay sold data is provided, anchor your estimate to those actual sales. Adjust up or down based on condition differences, recency, and card-specific factors. Return ONLY valid JSON with no markdown.`,
      messages: [{
        role: 'user',
        content: `Estimate the current market value for this sports card:

Card: "${cardDesc}"

${ebayContext}

Return ONLY this JSON (no markdown):
{
  "estimatedValue": <number, your best single estimate in USD>,
  "low": <number, realistic low end>,
  "high": <number, realistic high end>,
  "confidence": <"high" | "medium" | "low">,
  "trend": <"rising" | "stable" | "falling" | "unknown">,
  "notes": <string, 1-2 sentences — reference specific eBay sales if available, explain any adjustments>,
  "keyFactors": [<string, up to 3 short points about what drives this card's value>]
}`,
      }],
    })

    const text   = response.content[0].text.trim()
    const parsed = JSON.parse(text)

    return Response.json({
      ...parsed,
      cardDesc,
      ebaySales:    sales.length,
      ebayKeywords,
      source:       sales.length > 0 ? 'ebay+claude' : 'claude-ai',
      sourceLabel:  sales.length > 0 ? `eBay (${sales.length} sales) + AI` : 'AI Estimate',
      fetchedAt:    new Date().toISOString(),
    })
  } catch (err) {
    console.error('Value estimation error:', err)
    return Response.json({ error: err.message || 'Estimation failed' }, { status: 500 })
  }
}
