import Anthropic from '@anthropic-ai/sdk'

const SPORTS_CARDS_CATEGORY = '64482'

async function getEbayToken() {
  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString('base64')

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
  if (!data.access_token) throw new Error('eBay auth failed')
  return data.access_token
}

function buildKeywords({ sport, team, rookie, serial, auto: isAuto, more }) {
  const parts = []
  if (sport)   parts.push(sport)
  if (team)    parts.push(team)
  if (rookie)  parts.push('rookie')
  if (isAuto)  parts.push('auto')
  if (serial)  parts.push('numbered')
  if (more)    parts.push(more)
  if (parts.length === 0) parts.push('sports card')
  return parts.join(' ')
}

async function searchEbay(token, keywords, budget) {
  const params = new URLSearchParams({
    q:            keywords,
    category_ids: SPORTS_CARDS_CATEGORY,
    sort:         'bestMatch',
    limit:        '20',
  })

  if (budget) {
    params.set('filter', `price:[0..${budget}],priceCurrency:USD,conditions:{USED|NEW|UNSPECIFIED}`)
  }

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )

  if (!res.ok) return []
  const data = await res.json()
  return (data.itemSummaries || []).map(i => ({
    title:    i.title || '',
    price:    parseFloat(i.price?.value || '0'),
    currency: i.price?.currency || 'USD',
    url:      i.itemWebUrl || '',
    image:    i.image?.imageUrl || null,
    seller:   i.seller?.username || '',
    condition: i.condition || '',
  })).filter(i => i.price > 0)
}

export async function POST(request) {
  try {
    const { budget, sport, team, rookie, serial, auto: isAuto, more } = await request.json()

    if (!sport) return Response.json({ error: 'Sport is required' }, { status: 400 })

    const keywords = buildKeywords({ sport, team, rookie, serial, auto: isAuto, more })

    // Fetch real eBay listings
    let ebayItems = []
    try {
      const token = await getEbayToken()
      ebayItems = await searchEbay(token, keywords, budget)
    } catch (e) {
      console.error('eBay search failed:', e.message)
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Build criteria summary for Claude
    const criteria = [
      budget  ? `Budget: up to $${budget}` : 'No budget limit',
      `Sport: ${sport}`,
      team    ? `Team: ${team}` : null,
      rookie  ? 'Rookie cards only' : null,
      isAuto  ? 'Must be autographed' : null,
      serial  ? 'Must be serial-numbered' : null,
      more    ? `Additional criteria: ${more}` : null,
    ].filter(Boolean).join('\n')

    let prompt
    if (ebayItems.length > 0) {
      const listingLines = ebayItems.slice(0, 15).map((item, i) =>
        `${i + 1}. "${item.title}" — $${item.price.toFixed(2)} — ${item.url}`
      ).join('\n')

      prompt = `A collector is looking for cards with these criteria:
${criteria}

Here are real current eBay listings matching their search:
${listingLines}

Pick the top 5 listings that best match the criteria and represent the best value/opportunity. For each, explain WHY it's a good pick for this collector. Be specific — reference the card, price, and why it fits their criteria.

Return ONLY this JSON (no markdown):
{
  "suggestions": [
    {
      "card": "<card title, trimmed to key info>",
      "price": <number>,
      "url": "<exact eBay URL from listings above>",
      "reason": "<2-3 sentences: why this card, why this price makes sense, any upside>",
      "tags": [<2-4 tags from: "Great Value", "Rookie", "Auto", "Numbered", "Rising Player", "Safe Hold", "Low Pop", "Hot Market", "Star Player">]
    }
  ]
}`
    } else {
      // Fallback: pure AI suggestions when eBay returns nothing
      prompt = `A collector is looking for cards with these criteria:
${criteria}

eBay search returned no results. Suggest 5 specific cards they should look for that fit their criteria. Be specific with player, year, brand, and set.

Return ONLY this JSON (no markdown):
{
  "suggestions": [
    {
      "card": "<specific card e.g. '2023 Panini Prizm C.J. Stroud Silver Prizm Rookie'>",
      "price": <estimated market price as number>,
      "url": null,
      "reason": "<2-3 sentences on why this fits their criteria and is a good buy>",
      "tags": [<2-4 tags>]
    }
  ]
}`
    }

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1200,
      system:     'You are an elite sports card market expert. Return ONLY valid JSON, no markdown.',
      messages:   [{ role: 'user', content: prompt }],
    })

    const parsed = JSON.parse(response.content[0].text.trim())

    // Attach images from eBay data where URL matches
    const suggestionsWithImages = (parsed.suggestions || []).map(s => {
      const match = ebayItems.find(e => e.url === s.url)
      return { ...s, image: match?.image || null }
    })

    return Response.json({
      suggestions: suggestionsWithImages,
      keywords,
      ebayResultCount: ebayItems.length,
      source: ebayItems.length > 0 ? 'ebay+claude' : 'claude-ai',
    })
  } catch (err) {
    console.error('Scout suggest error:', err)
    return Response.json({ error: err.message, suggestions: [] }, { status: 500 })
  }
}
