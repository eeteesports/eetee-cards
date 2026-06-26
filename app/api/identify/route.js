import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are an expert sports card authenticator with deep knowledge of all trading card sets, manufacturers, and players across football, basketball, baseball, and hockey from the 1980s to present. When shown a card image, identify every detail with precision.`

const USER_PROMPT = `Analyze this sports card image carefully. Return ONLY a valid JSON object — no markdown, no explanation, just the raw JSON.

{
  "player": "full legal name of the player",
  "year": 2017,
  "brand": "card manufacturer (Panini, Topps, Upper Deck, Bowman, Donruss, Fleer, Score, SP, etc.)",
  "set": "specific card set name (Prizm, Chrome, Contenders, Mosaic, Select, Optic, etc.)",
  "cardNumber": "card number visible on card, just digits (e.g. '269'), empty string if not visible",
  "parallel": "parallel or variant name if this is not the base card (e.g. 'Silver Prizm', 'Gold', 'Holo Silver', 'Purple', 'Green'), empty string for base cards",
  "sport": "Football|Basketball|Baseball|Hockey|Soccer|Other",
  "tags": ["Rookie"],
  "serialNumber": "serial numbering if stamped on card like '45/99', empty string if not serial numbered",
  "condition": "Raw - Mint|Raw - Near Mint|Raw - Excellent|Raw - Good|Raw - Poor",
  "notes": "any other important details (auto, patch, memorabilia, special edition, etc.)"
}

For tags, use only from: Rookie, Refractor, Auto, Patch, Serial Numbered, 1/1, Short Print, Prizm

If you cannot identify a field with confidence, use an empty string (not null).`

export async function POST(request) {
  try {
    const { imageUrl, imageBase64, mimeType } = await request.json()

    if (!imageUrl && !imageBase64) {
      return Response.json({ error: 'imageUrl or imageBase64 required' }, { status: 400 })
    }

    const imageSource = imageUrl
      ? { type: 'url', url: imageUrl }
      : { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 }

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: imageSource },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    })

    const text = response.content[0].text.trim()
    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const card = JSON.parse(cleaned)

    // Build a clean display name
    card.cardName = [card.year, card.brand, card.set, card.player, card.parallel]
      .filter(Boolean)
      .join(' ')

    return Response.json(card)
  } catch (err) {
    console.error('Identify error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
