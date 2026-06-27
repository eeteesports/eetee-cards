import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { frontImageUrl, backImageUrl } = await request.json()
    if (!frontImageUrl) return Response.json({ error: 'Front image URL required' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const imageContent = [
      { type: 'image', source: { type: 'url', url: frontImageUrl } },
    ]
    if (backImageUrl) {
      imageContent.push({ type: 'image', source: { type: 'url', url: backImageUrl } })
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 800,
      system: `You are an expert sports card identifier and appraiser. You can identify cards from photos and provide accurate market value estimates. Return ONLY valid JSON with no markdown.`,
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Identify this sports card and provide a value estimate.

Return ONLY this JSON:
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
  "estimatedValue": <number or null>,
  "valueLow": <number or null>,
  "valueHigh": <number or null>,
  "confidence": "<'high' | 'medium' | 'low'>",
  "trend": "<'rising' | 'stable' | 'falling' | 'unknown'>",
  "notes": "<string, 2-3 sentences on identification and value drivers>",
  "worthGrading": <boolean>,
  "gradingNote": "<string or null, brief note on grading potential>"
}`,
          },
        ],
      }],
    })

    const text = response.content[0].text.trim()
    const parsed = JSON.parse(text)
    return Response.json(parsed)
  } catch (err) {
    console.error('Appraise error:', err)
    return Response.json({ error: err.message || 'Appraisal failed' }, { status: 500 })
  }
}
