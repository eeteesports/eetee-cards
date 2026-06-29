// Queries eBay Finding API for recently completed (sold) listings
// Returns cleaned sale data to use as pricing comps

const EBAY_FINDING_URL = 'https://svcs.ebay.com/services/search/FindingService/v1'
const SPORTS_CARDS_CATEGORY = '64482' // eBay: Sports Trading Cards (singles)

export async function POST(request) {
  try {
    const { player, year, brand, set, parallel, condition, printRun } = await request.json()

    if (!player) return Response.json({ error: 'Player required' }, { status: 400 })

    // Build keyword string — most specific first, drop vague terms
    const keywords = [
      player,
      year,
      set || brand,            // set is more specific than brand
      parallel || null,
      printRun ? `/${printRun}` : null,
      // Include grade only if card is graded
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
      'paginationInput.entriesPerPage': '15',
    })

    const res  = await fetch(`${EBAY_FINDING_URL}?${params}`)
    const data = await res.json()

    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || []

    const sales = items
      .filter((item) => item.sellingStatus?.[0]?.sellingState?.[0] === 'EndedWithSales')
      .map((item) => ({
        title:    item.title?.[0] || '',
        price:    parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'] || '0'),
        date:     item.listingInfo?.[0]?.endTime?.[0] || '',
        url:      item.viewItemURL?.[0] || '',
      }))
      .filter((s) => s.price > 0)

    // Summary stats
    const prices = sales.map((s) => s.price)
    const avg    = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null
    const low    = prices.length ? Math.min(...prices) : null
    const high   = prices.length ? Math.max(...prices) : null

    return Response.json({
      keywords,
      totalFound: sales.length,
      sales,
      stats: prices.length ? {
        avg:    Math.round(avg * 100) / 100,
        low,
        high,
        count:  prices.length,
      } : null,
    })
  } catch (err) {
    console.error('eBay sold error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
