import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are an expert sports card authenticator and grader with encyclopedic knowledge of all trading card sets, manufacturers, and players across football, basketball, baseball, and hockey from the 1980s to present.

CRITICAL BRAND vs SET DISTINCTION — many collectors and AI systems confuse these:
- "Brand" = the MANUFACTURER COMPANY that printed the card. Examples: Panini, Topps, Upper Deck, Bowman, Fleer, Score, Leaf.
  - Panini manufactures: Prizm, Donruss, Optic, Mosaic, Select, Contenders, National Treasures, Flawless, Illusions, Revolution, Hoops, Chronicles
  - Topps manufactures: Chrome, Stadium Club, Heritage, Finest, Series 1/2, Update, Archives, Bowman (subsidiary), Allen & Ginter
  - Upper Deck manufactures: SP, SPx, Exquisite, SP Authentic, Young Guns (hockey)
  - Donruss is a PRODUCT LINE made by Panini — Brand = Panini, Set = Donruss
  - Never list the product line as the brand when the parent company is known
- "Set" = the specific product line name printed on the card front/back. Examples: Prizm, Chrome, Donruss, Mosaic, Heritage.

CARD NUMBER LOCATION: Card numbers are almost always printed on the BACK of the card, typically in a corner, near the bottom, or adjacent to stats. They may be formatted as "#269", "269/300" (serial), or just "269". Look carefully at the bottom corners and edges of the back image.`

const USER_PROMPT = `Analyze this sports card image (may be front, back, or both). Return ONLY a valid JSON object — no markdown, no explanation, just the raw JSON.

{
  "player": "full legal name of the player",
  "year": 2017,
  "brand": "MANUFACTURER COMPANY only — Panini, Topps, Upper Deck, Bowman, Fleer, Score, Leaf. NOT the product line.",
  "set": "product line name — Prizm, Chrome, Donruss, Mosaic, Select, Optic, Contenders, Heritage, etc.",
  "cardNumber": "card number from back of card, digits only (e.g. '269'). Check bottom corners carefully. Empty string if not visible.",
  "parallel": "parallel/variant if not base card (e.g. 'Silver Prizm', 'Gold', 'Holo', 'Purple', 'Green', 'Red'). Empty string for base cards.",
  "sport": "Football|Basketball|Baseball|Hockey|Soccer|Other",
  "tags": ["Rookie"],
  "serialNumber": "serial stamp if present like '45/99'. Empty string if not serial numbered.",
  "condition": "Raw - Mint|Raw - Near Mint|Raw - Excellent|Raw - Good|Raw - Poor",
  "notes": "any other important details (autograph, patch, memorabilia, photo variation, etc.)"
}

For tags, choose only from: Rookie, Refractor, Auto, Patch, Serial Numbered, 1/1, Short Print, Prizm

If you cannot identify a field with confidence, use an empty string (not null).`

export async function POST(request) {
  try {
    const { imageUrl, backImageUrl, imageBase64, mimeType } = await request.json()

    if (!imageUrl && !imageBase64) {
      return Response.json({ error: 'imageUrl or imageBase64 required' }, { status: 400 })
    }

    const frontSource = imageUrl
      ? { type: 'url', url: imageUrl }
      : { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 }

    // Build content array — include back image if provided (card number lives there)
    const content = [
      { type: 'image', source: frontSource },
    ]
    if (backImageUrl) {
      content.push({ type: 'text', text: 'Front of card above. Back of card below — card number is usually on the back:' })
      content.push({ type: 'image', source: { type: 'url', url: backImageUrl } })
    }
    content.push({ type: 'text', text: USER_PROMPT })

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
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
