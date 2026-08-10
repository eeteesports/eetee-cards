// Shared eBay helper
// Priority: Marketplace Insights (sold, requires a scope eBay isn't granting to
// new apps right now — see fetchSoldItems) → Browse API (active listings).

const SPORTS_CARDS_CATEGORY = '64482'

// Module-level token cache
let _tokenCache = { token: null, expiresAt: 0 }

async function getToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token
  }

  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString('base64')

  // Request both scopes — insights may not be granted but basic scope always is
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=' +
      encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  })

  const data = await res.json()
  if (!data.access_token) throw new Error(`eBay OAuth failed: ${data.error_description || JSON.stringify(data)}`)

  _tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 120) * 1000,
  }
  return _tokenCache.token
}

// Marketplace Insights REST (sold data) — returns null if not authorized.
// As of 2026, eBay has this API closed to new applicants (confirmed against
// eetee's actual granted OAuth scopes — buy.marketplace.insights isn't in
// the list), so this will realistically always fall through to Browse API
// below. Left in place rather than removed: if that scope is ever granted,
// this starts working with zero code changes.
async function fetchSoldItems(token, keywords) {
  const params = new URLSearchParams({
    q:            keywords,
    category_ids: SPORTS_CARDS_CATEGORY,
    limit:        '12',
  })

  const res = await fetch(
    `https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search?${params}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )

  if (res.status === 403 || res.status === 401) return null // not granted
  if (!res.ok) return null

  const data = await res.json()
  const sales = (data.itemSales || []).map((i) => ({
    title:  i.title || '',
    price:  parseFloat(i.lastSoldPrice?.value || '0'),
    date:   i.lastSoldDate?.slice(0, 10) || '',
    url:    i.itemWebUrl || '',
    source: 'sold',
  })).filter((s) => s.price > 0)

  return sales
}

// Browse API (active listings) — always available
async function fetchActiveListings(token, keywords) {
  const params = new URLSearchParams({
    q:            keywords,
    category_ids: SPORTS_CARDS_CATEGORY,
    sort:         'newlyListed',
    limit:        '12',
  })

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )

  if (!res.ok) return []
  const data = await res.json()

  return (data.itemSummaries || []).map((i) => ({
    title:  i.title || '',
    price:  parseFloat(i.price?.value || '0'),
    date:   i.itemCreationDate?.slice(0, 10) || '',
    url:    i.itemWebUrl || '',
    source: 'active',
  })).filter((s) => s.price > 0)
}

// Main export — tries sold first, falls back to active listings
export async function fetchEbayComps(player, year, set, brand, parallel, condition, printRun) {
  const keywords = [
    player,
    year,
    set || brand,
    parallel || null,
    printRun ? `/${printRun}` : null,
    condition?.match(/PSA|BGS|SGC/) ? condition : null,
  ].filter(Boolean).join(' ')

  try {
    // 1. OAuth token for REST API
    const token = await getToken()

    // 2. Try Marketplace Insights REST (sold) — only if scope available
    //    (it isn't, currently — see comment above fetchSoldItems)
    const restSold = await fetchSoldItems(token, keywords)
    if (restSold && restSold.length > 0) {
      return { keywords, items: restSold, dataType: 'sold' }
    }

    // 3. Fall back to Browse API (active listings) — this is the one that
    //    actually works with eetee's current scopes
    const active = await fetchActiveListings(token, keywords)
    return {
      keywords,
      items:    active,
      dataType: active.length > 0 ? 'active' : 'none',
    }
  } catch (err) {
    console.error('eBay fetch error:', err.message)
    return { keywords, items: [], dataType: 'error', error: err.message }
  }
}

export function buildEbayContext({ keywords, items, dataType }) {
  if (!items.length) {
    return `No eBay data found for "${keywords}". Base estimate on your training knowledge.`
  }

  const prices = items.map((s) => s.price)
  const avg    = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
  const low    = Math.min(...prices).toFixed(2)
  const high   = Math.max(...prices).toFixed(2)
  const label  = dataType === 'sold' ? 'SOLD listings' : 'ACTIVE listings (asking prices)'

  const lines = items.slice(0, 8)
    .map((s) => `  • $${s.price.toFixed(2)}${s.date ? ` (${s.date})` : ''} — "${s.title}"`)
    .join('\n')

  const note = dataType === 'active'
    ? 'These are current asking prices (not sold). Real sold prices are typically 10–30% lower.'
    : 'These are real sold prices — anchor your estimate to these.'

  return `EBAY ${label} (searched: "${keywords}"):
${lines}

Summary: ${items.length} results | avg $${avg} | range $${low}–$${high}
${note}`
}

export function buildSourceLabel(dataType, count) {
  if (dataType === 'sold')   return `eBay Sold (${count})`
  if (dataType === 'active') return `eBay Listings (${count})`
  return 'AI Estimate'
}
