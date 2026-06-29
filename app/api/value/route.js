import Anthropic from '@anthropic-ai/sdk'
import { fetchEbayComps, buildEbayContext, buildSourceLabel } from '@/lib/ebay'

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

    const ebayResult = await fetchEbayComps(player, year, set, brand, parallel, condition, printRun)
    const ebayContext = buildEbayContext(ebayResult)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are a sports card market expert. When real eBay data is provided, anchor your estimate to those prices. For active listings, real sold prices are typically 10-30% lower than asking. Return ONLY valid JSON with no markdown.`,
      messages: [{
        role: 'user',
        content: `Estimate the current market value for this sports card:

Card: "${cardDesc}"

${ebayContext}

Return ONLY this JSON (no markdown):
{
  "estimatedValue": <number or null>,
  "low": <number>,
  "high": <number>,
  "confidence": <"high" | "medium" | "low">,
  "trend": <"rising" | "stable" | "falling" | "unknown">,
  "notes": <string, 1-2 sentences referencing eBay data if available>,
  "keyFactors": [<up to 3 short strings>]
}`,
      }],
    })

    const parsed = JSON.parse(response.content[0].text.trim())

    return Response.json({
      ...parsed,
      cardDesc,
      ebaySales:    ebayResult.items.length,
      ebayKeywords: ebayResult.keywords,
      ebayDataType: ebayResult.dataType,
      source:       ebayResult.dataType !== 'none' && ebayResult.dataType !== 'error' ? 'ebay+claude' : 'claude-ai',
      sourceLabel:  buildSourceLabel(ebayResult.dataType, ebayResult.items.length),
      fetchedAt:    new Date().toISOString(),
    })
  } catch (err) {
    console.error('Value estimation error:', err)
    return Response.json({ error: err.message || 'Estimation failed' }, { status: 500 })
  }
}
