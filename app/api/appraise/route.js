import Anthropic from '@anthropic-ai/sdk'

const EBAY_FINDING_URL = 'https://svcs.ebay.com/services/search/FindingService/v1'
const SPORTS_CARDS_CATEGORY = '64482'

async function fetchEbaySales(player, year, set, brand, parallel, condition, printRun) {
  try {
    const keywords = [
      player, year, set || brand, parallel || null,
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
      'paginationInput.entriesPerPage': '12',
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
        url:   i.viewItemURL?.[0] || '',
      }))
      .filter((s) => s.price > 0)

    return { keywords, sales }
  } catch {
    return { keywords: '', sales: [] }
  }
}

// POST: photo appraisal (frontImageUrl required) OR text search (query string)
export async function POST(request) {
  try {
    const body = await request.json()
    const { frontImageUrl, backImageUrl, query } = body

    // ── TEXT SEARCH MODE ──────────────────────────────────────────────
    if (query && !frontImageUrl) {
      const { keywords, sales } = await fetchEbaySales(query)

      const prices = sales.map((s) => s.price)
      const avg    = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null
      const low    = prices.length ? Math.min(...prices) : null
      const high   = prices.length ? Math.max(...prices) : null

      // Quick AI estimate based on text query + eBay comps
      let aiEstimate = null
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
          const ebayContext = sales.length > 0
            ? `Recent eBay sold (${sales.length} sales, avg $${avg?.toFixed(2)}, range $${low}–$${high}):\n` +
              sales.slice(0, 6).map((s) => `  • $${s.price.toFixed(2)} on ${s.date} — "${s.title}"`).join('\n')
            : 'No eBay sold data found.'

          const resp = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            system: 'You are a sports card market expert. Return ONLY valid JSON, no markdown.',
            messages: [{
              role: 'user',
              content: `Card: "${query}"\n\n${ebayContext}\n\nReturn ONLY: {"estimatedValue":<number or null>,"low":<number>,"high":<number>,"confidence":"high"|"medium"|"low","trend":"rising"|"stable"|"falling"|"unknown","notes":"<1-2 sentences>"}`,
            }],
          })
          aiEstimate = JSON.parse(resp.content[0].text.trim())
        } catch { /* non-fatal */ }
      }

      return Response.json({
        mode: 'search',
        query,
        ebayKeywords: keywords,
        sales,
        stats: prices.length ? { avg: Math.round(avg * 100) / 100, low, high, count: prices.length } : null,
        ...aiEstimate,
        sourceLabel: sales.length > 0 ? `eBay (${sales.length} sales) + AI` : 'AI Estimate',
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
      system: 'You are an expert sports card identifier. Return ONLY valid JSON with no markdown.',
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Identify this sports card. Return ONLY:
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
}`,
          },
        ],
      }],
    })

    const identified = JSON.parse(idResponse.content[0].text.trim())

    // Step 2: fetch eBay comps + AI value in parallel
    const [{ keywords, sales }, valueResponse] = await Promise.all([
      fetchEbaySales(
        identified.player, identified.year, identified.set, identified.brand,
        identified.parallel, identified.condition, identified.printRun
      ),
      (async () => {
        const prices_tmp = [] // placeholder — we need eBay first but run in parallel
        const cardDesc = [
          identified.year, identified.brand, identified.set, identified.player,
          identified.parallel ? `(${identified.parallel})` : null,
          identified.rookie ? 'Rookie Card' : null,
          identified.numbered && identified.printRun ? `/${identified.printRun}` : null,
          identified.condition || null,
        ].filter(Boolean).join(' ')
        return { cardDesc }
      })(),
    ])

    // Step 3: AI value estimate with eBay comps
    const prices = sales.map((s) => s.price)
    const avg    = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null
    const low    = prices.length ? Math.min(...prices) : null
    const high   = prices.length ? Math.max(...prices) : null

    const ebayContext = sales.length > 0
      ? `REAL EBAY SOLD DATA (${sales.length} sales, avg $${avg?.toFixed(2)}, range $${low}–$${high}):\n` +
        sales.slice(0, 6).map((s) => `  • $${s.price.toFixed(2)} on ${s.date} — "${s.title}"`).join('\n') +
        '\n\nAnchor your estimate to these real sales.'
      : 'No eBay sold data found. Use your training knowledge.'

    const valResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'Sports card market expert. Return ONLY valid JSON, no markdown.',
      messages: [{
        role: 'user',
        content: `Card: "${valueResponse.cardDesc}"\n\n${ebayContext}\n\nReturn ONLY: {"estimatedValue":<number or null>,"valueLow":<number or null>,"valueHigh":<number or null>,"confidence":"high"|"medium"|"low","trend":"rising"|"stable"|"falling"|"unknown","notes":"<2-3 sentences referencing eBay sales if available>"}`,
      }],
    })

    const valData = JSON.parse(valResponse.content[0].text.trim())

    return Response.json({
      mode: 'photo',
      ...identified,
      ...valData,
      ebayKeywords: keywords,
      sales,
      stats: prices.length ? { avg: Math.round(avg * 100) / 100, low, high, count: prices.length } : null,
      sourceLabel: sales.length > 0 ? `eBay (${sales.length} sales) + AI` : 'AI Estimate',
    })
  } catch (err) {
    console.error('Appraise error:', err)
    return Response.json({ error: err.message || 'Appraisal failed' }, { status: 500 })
  }
}
