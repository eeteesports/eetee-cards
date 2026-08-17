// Turso-backed replacement for the old direct-Airtable-REST implementation
// (2026-08-14). Query params, request/response shapes are unchanged from
// before — every existing caller (app/page.js, collection, dashboard,
// admin, team/[team], CardModal, add/bulk-add) keeps working as-is.
import { listCards, createCard, updateCard, deleteCard } from '@/lib/db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)

  // `all=true` used to mean "no filters, paginate through the whole
  // Airtable base." Turso doesn't need pagination for ~1,700 rows, so this
  // is just an alias for an unfiltered list now — kept so dashboard/admin
  // (which still pass it) don't need to change.
  if (searchParams.get('all') === 'true') {
    const records = await listCards({})
    return Response.json({ records })
  }

  const records = await listCards({
    search: searchParams.get('search') || undefined,
    sport: searchParams.get('sport') || undefined,
    league: searchParams.get('league') || undefined,
    team: searchParams.get('team') || undefined,
    forSale: searchParams.get('forSale') || undefined,
    rookie: searchParams.get('rookie') || undefined,
    numbered: searchParams.get('numbered') || undefined,
    yearMin: searchParams.get('yearMin') || undefined,
    yearMax: searchParams.get('yearMax') || undefined,
    condition: searchParams.get('condition') || undefined,
    set: searchParams.get('set') || undefined,
  })
  return Response.json({ records })
}

export async function POST(request) {
  const body = await request.json()
  const record = await createCard(body)
  return Response.json(record)
}

export async function PATCH(request) {
  const body = await request.json()
  const { id, ...fields } = body
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
  try {
    const record = await updateCard(id, fields)
    return Response.json(record)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
  const result = await deleteCard(id)
  return Response.json(result)
}
