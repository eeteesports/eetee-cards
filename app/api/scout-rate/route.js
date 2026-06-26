import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { prompt, listPrice, valData } = await request.json()
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 400,
      system: `You are an expert sports card investor helping a collector evaluate deals. Be direct, honest, and practical. Return ONLY valid JSON with no markdown.`,
      messages: [{
        role: 'user',
        content: `${prompt}

Return ONLY this JSON:
{
  "score": <integer 1-10 where 10 = incredible steal, 1 = terrible overpay>,
  "verdict": <string, 2-3 sentences of honest deal analysis>
}`,
      }],
    })

    const parsed = JSON.parse(response.content[0].text.trim())
    return Response.json(parsed)
  } catch (err) {
    console.error('Scout rate error:', err)
    return Response.json({ score: 5, verdict: 'Could not analyze deal — please try again.' }, { status: 500 })
  }
}
