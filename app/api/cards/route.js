const BASE_ID = 'app5got9RZ5o2iczD'
const TABLE = 'Cards'
const AT_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}`

function headers() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const sport = searchParams.get('sport')
  const forSale = searchParams.get('forSale')

  let url = `${AT_URL}?pageSize=100&sort[0][field]=Date Added&sort[0][direction]=desc`

  const filters = []
  if (search) {
    const q = search.replace(/"/g, '')
    filters.push(`OR(SEARCH(LOWER("${q}"),LOWER({Player})),SEARCH(LOWER("${q}"),LOWER({Card Name})),SEARCH(LOWER("${q}"),LOWER({Set})),SEARCH(LOWER("${q}"),LOWER({Brand})))`)
  }
  if (sport && sport !== 'all') {
    filters.push(`{Sport}="${sport}"`)
  }
  if (forSale === 'true') {
    filters.push(`{For Sale}=1`)
  }
  if (filters.length) {
    const formula = filters.length === 1 ? filters[0] : `AND(${filters.join(',')})`
    url += `&filterByFormula=${encodeURIComponent(formula)}`
  }

  const res = await fetch(url, { headers: headers() })
  const data = await res.json()
  return Response.json(data)
}

export async function POST(request) {
  const body = await request.json()

  const fields = {
    'Card Name': body.cardName || '',
    'Player': body.player || '',
    'Year': body.year ? Number(body.year) : undefined,
    'Brand': body.brand || '',
    'Set': body.set || '',
    'Card Number': body.cardNumber || '',
    'Parallel / Variant': body.parallel || '',
    'Sport': body.sport || '',
    'Tags': Array.isArray(body.tags) ? body.tags : [],
    'Serial Number': body.serialNumber || '',
    'Condition': body.condition || '',
    'Cost Paid': body.costPaid ? Number(body.costPaid) : undefined,
    'Estimated Value': body.estimatedValue ? Number(body.estimatedValue) : undefined,
    'PSA 8 Value': body.psa8Value ? Number(body.psa8Value) : undefined,
    'PSA 9 Value': body.psa9Value ? Number(body.psa9Value) : undefined,
    'PSA 10 Value': body.psa10Value ? Number(body.psa10Value) : undefined,
    'For Sale': Boolean(body.forSale),
    'Asking Price': body.askingPrice ? Number(body.askingPrice) : undefined,
    'Front Image URL': body.frontImageUrl || '',
    'Back Image URL': body.backImageUrl || '',
    'Notes': body.notes || '',
    'Date Added': new Date().toISOString().split('T')[0],
  }

  // Strip undefined/empty strings to avoid Airtable errors
  for (const k of Object.keys(fields)) {
    if (fields[k] === undefined || fields[k] === '') delete fields[k]
  }

  const res = await fetch(AT_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fields }),
  })
  const data = await res.json()
  return Response.json(data, { status: res.ok ? 200 : 400 })
}

export async function PATCH(request) {
  const body = await request.json()
  const { id, ...fields } = body

  const res = await fetch(`${AT_URL}/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ fields }),
  })
  const data = await res.json()
  return Response.json(data)
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const res = await fetch(`${AT_URL}/${id}`, { method: 'DELETE', headers: headers() })
  const data = await res.json()
  return Response.json(data)
}
