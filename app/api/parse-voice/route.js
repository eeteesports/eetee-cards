import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  try {
    const { transcript } = await request.json()

    if (!transcript?.trim()) {
      return Response.json({ error: 'transcript required' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a sports card expert. Extract card details from this spoken description and return ONLY a JSON object, no other text.

Spoken description: "${transcript}"

Return this exact JSON structure:
{
  "player": "full player name",
  "year": 2017,
  "brand": "manufacturer (Panini, Topps, Upper Deck, Bowman, etc.)",
  "set": "set name (Prizm, Chrome, etc.)",
  "cardNumber": "card number as string, empty if not mentioned",
  "parallel": "parallel/variant name, empty if base card",
  "sport": "Football|Basketball|Baseball|Hockey|Soccer|Other",
  "tags": ["Rookie"],
  "serialNumber": "serial numbering like 45/99, empty if not mentioned",
  "condition": "Raw - Mint|Raw - Near Mint|Raw - Excellent|Raw - Good|Raw - Poor",
  "notes": ""
}

Be smart about abbreviations: PSA 10 means graded, "SP" or "SP Authentic" is a set, "Prizm" alone likely means Panini Prizm, "#269" means card number 269, "/99" means serial numbered out of 99.

Return ONLY the JSON.`,
        },
      ],
    })

    const text = response.content[0].text.trim()
    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const card = JSON.parse(cleaned)

    card.cardName = [card.year, card.brand, card.set, card.player, card.parallel]
      .filter(Boolean)
      .join(' ')

    return Response.json(card)
  } catch (err) {
    console.error('Parse voice error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
