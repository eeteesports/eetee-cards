import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { cards } = await request.json()
    if (!cards || !cards.length) return Response.json({ rankings: [] }, { status: 200 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Build a concise card list for the prompt
    const cardList = cards.map((c, i) => {
      const f = c.fields
      return `${i + 1}. ${[f['Year'], f['Brand'], f['Set'], f['Player']].filter(Boolean).join(' ')}` +
        `${f['Parallel'] ? ` [${f['Parallel']}]` : ''}` +
        `${f['Rookie'] ? ' RC' : ''}` +
        `${f['Numbered'] ? ` /${f['Print Run'] || '?'}` : ''}` +
        `${f['Condition'] ? ` | Cond: ${f['Condition']}` : ''}` +
        `${f['Estimated Value'] ? ` | ~$${f['Estimated Value']}` : ''}` +
        `${f['Grade'] ? ` | Already graded: ${f['Grade']}` : ''}`
    }).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `You are a sports card grading expert specializing in ROI analysis for PSA/BGS submissions. You understand grading fees ($20-50 per card), typical raw-to-graded value multipliers, which cards benefit most from grading, and current market demand for graded copies. Return ONLY valid JSON with no markdown.`,
      messages: [{
        role: 'user',
        content: `Analyze this collection and recommend which cards are most worth grading (submitting to PSA/BGS).

COLLECTION:
${cardList}

For each card worth grading, evaluate:
- Raw-to-graded value uplift potential (a PSA 10 of a popular RC can 3-5x in value)
- Current demand for graded copies of this card
- Likelihood of achieving a high grade based on the described condition
- Whether the estimated value justifies $20-50 grading fee
- Skip cards already graded, cards clearly worth less than $30 raw, or modern junk wax

Return the top 5-8 cards worth grading in this JSON format:
{
  "rankings": [
    {
      "cardIndex": <number, 1-based index from the list above>,
      "player": "<string>",
      "cardDesc": "<string, brief description>",
      "gradingScore": <number 1-10, overall worth-grading score>,
      "estimatedPSA10Value": <number or null, estimated PSA 10 value in USD>,
      "currentRawValue": <number or null>,
      "roi": "<string, e.g. '3-5x potential' or 'Low ROI'>",
      "reason": "<string, 2-3 sentences why this card is worth grading>",
      "gradingService": "<'PSA' | 'BGS' | 'SGC'>",
      "urgency": "<'Send now' | 'Consider' | 'Wait for right price'>"
    }
  ],
  "summary": "<string, 2-3 sentences of overall grading strategy for this collection>"
}`,
      }],
    })

    const text = response.content[0].text.trim()
    const parsed = JSON.parse(text)
    return Response.json(parsed)
  } catch (err) {
    console.error('Grading analysis error:', err)
    return Response.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
