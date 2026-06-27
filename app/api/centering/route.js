import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { imageUrl } = await request.json()
    if (!imageUrl) return Response.json({ error: 'Image URL required' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 600,
      system: `You are a sports card grading expert specializing in centering analysis. You carefully examine card images to measure the border widths on all four sides and calculate centering ratios. Return ONLY valid JSON with no markdown.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: `Analyze this sports card image and estimate the centering by examining the border widths on all four sides (top, bottom, left, right).

Look carefully at:
- The white/colored border surrounding the card design
- Relative width of each border
- How the printed design is positioned within the card

Estimate the border ratios as percentages of total width/height.

Return ONLY this JSON:
{
  "leftBorder": <number, estimated % of card width>,
  "rightBorder": <number, estimated % of card width>,
  "topBorder": <number, estimated % of card height>,
  "bottomBorder": <number, estimated % of card height>,
  "leftRightRatio": "<string, e.g. '60/40'>",
  "topBottomRatio": "<string, e.g. '55/45'>",
  "grade": "<'10' | '9' | '8' | '7' | '6' | '5'>",
  "gradeLabel": "<string, e.g. 'PSA 10 eligible' or 'PSA 9 range' or 'Centering issue'>",
  "verdict": "<string, 1-2 sentences on centering quality and what it means for grading>",
  "confidence": "<'high' | 'medium' | 'low'>"
}

Centering grade guidelines:
- PSA 10: 55/45 or better on both axes
- PSA 9: 60/40 or better on both axes
- PSA 8: 65/35 or better on both axes
- PSA 7: 70/30 or better
- PSA 6: 75/25 or better
- PSA 5 or below: worse than 75/25

If you cannot determine centering (card too blurry, no visible borders, card not shown), set all numbers to null and explain in verdict.`,
          },
        ],
      }],
    })

    const text = response.content[0].text.trim()
    const parsed = JSON.parse(text)
    return Response.json(parsed)
  } catch (err) {
    console.error('Centering analysis error:', err)
    return Response.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
