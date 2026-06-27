import Anthropic from '@anthropic-ai/sdk'

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

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are a sports card market expert with comprehensive knowledge of card values, recent sales trends, and pricing factors. You understand how condition, rarity, player performance, set desirability, and parallels affect prices. Provide honest, realistic estimates based on actual market conditions. Return ONLY valid JSON with no markdown formatting.`,
      messages: [{
        role: 'user',
        content: `Estimate the current market value for this sports card:

Card: "${cardDesc}"

Key factors to consider:
- Player's current relevance and recent performance
- Set/brand desirability and collector demand
- Condition grade impact (raw vs graded)
- Parallel/variant rarity
- Rookie card premium if applicable
- Print run scarcity if numbered
- Recent market trends for this player/set

Return ONLY this JSON (no markdown):
{
  "estimatedValue": <number or null, your best single estimate in USD>,
  "low": <number, realistic low end>,
  "high": <number, realistic high end>,
  "confidence": <"high" | "medium" | "low">,
  "trend": <"rising" | "stable" | "falling" | "unknown">,
  "notes": <string, 1-2 sentences on key value drivers>,
  "keyFactors": [<string, up to 3 short bullet points about what moves this card's value>]
}

If the card is too obscure to estimate reliably, set estimatedValue to null and explain in notes.`,
      }],
    })

    const text = response.content[0].text.trim()
    const parsed = JSON.parse(text)

    return Response.json({
      ...parsed,
      cardDesc,
      source: 'claude-ai',
      sourceLabel: 'AI Estimate',
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Value estimation error:', err)
    return Response.json({ error: err.message || 'Estimation failed' }, { status: 500 })
  }
}
