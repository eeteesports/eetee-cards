// Temporary debug route — hit /api/ebay-test to see raw eBay response
export async function GET() {
  const params = new URLSearchParams({
    'OPERATION-NAME':       'findCompletedItems',
    'SERVICE-VERSION':      '1.0.0',
    'APP-NAME':             process.env.EBAY_APP_ID || 'MISSING',
    'RESPONSE-DATA-FORMAT': 'JSON',
    'keywords':             'Patrick Mahomes Prizm',
    'itemFilter(0).name':   'SoldItemsOnly',
    'itemFilter(0).value':  'true',
    'sortOrder':            'EndTimeSoonest',
    'paginationInput.entriesPerPage': '3',
  })

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`

  try {
    const res  = await fetch(url)
    const data = await res.json()

    const ack     = data?.findCompletedItemsResponse?.[0]?.ack?.[0]
    const items   = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || []
    const errMsg  = data?.findCompletedItemsResponse?.[0]?.errorMessage?.[0]?.error?.[0]?.message?.[0]

    return Response.json({
      appIdPresent: !!process.env.EBAY_APP_ID,
      appIdPrefix:  process.env.EBAY_APP_ID?.slice(0, 12) + '…',
      ack,
      errorMessage: errMsg || null,
      itemCount:    items.length,
      firstItem:    items[0] ? {
        title:        items[0].title?.[0],
        sellingState: items[0].sellingStatus?.[0]?.sellingState?.[0],
        price:        items[0].sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'],
      } : null,
      rawAck: data?.findCompletedItemsResponse?.[0]?.ack,
    })
  } catch (err) {
    return Response.json({ error: err.message, url })
  }
}
