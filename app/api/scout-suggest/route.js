import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { budget, sport } = await request.json()
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const budgetStr = budget ? `Budget: up to $${budget} per card.` : 'No specific budget.'
    const sportStr  = sport  ? `Preferred sport/league: ${sport}.` : 'Open to any sport.'

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 900,
      system: `You are an elite sports card investment advisor with deep market knowledge. Suggest specific, actionable card buys based on value, current demand, and upside potential. Focus on cards that are currently undervalued or have strong growth potential. Return ONLY valid JSON with no markdown.`,
      messages: [{
        role: 'user',
        content: `Give me 5 specific sports card buying recommendations right now.

${budgetStr}
${sportStr}

Consider: rookie cards of rising players, star player cards from popular sets at good values, cards with upcoming catalysts (playoffs, awards season, Hall of Fame eligibility), or blue-chip cards that hold value well.

Return ONLY this JSON:
{
  "suggestions": [
    {
      "card": "<specific card description, e.g. '2021 Panini Prizm Ja Morant Silver Prizm PSA 9'>",
      "estimatedPrice": <number, typical market price in USD>,
      "reason": "<2-3 sentences on why this is a good buy right now>",
      "upside": "<brief upside scenario>",
      "tags": [<string, 2-4 tags like "Rising Star", "Safe Hold", "Undervalued", "Rookie", "Hot Market">]
    }
  ]
}`,
      }],
    })

    const parsed = JSON.parse(response.content[0].text.trim())
    return Response.json(parsed)
  } catch (err) {
    console.error('Scout suggest error:', err)
    return Response.json({ suggestions: [] }, { status: 500 })
  }
}
