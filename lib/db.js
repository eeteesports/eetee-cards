// Turso-backed data layer for eetee-cards-site, replacing the previous
// direct Airtable REST integration (2026-08-14).
//
// WHY: eetee-cards-app (the Tauri desktop app) migrated its full ~1,730-card
// CDP inventory into a shared Turso database on 2026-08-13 (see
// eetee-cards-app/scripts/migrate-to-turso-full.mjs). This site's Airtable
// base was a small, stale test set (25 records, mostly from June test
// batches) — not the real inventory — so this migration is a pure win, not
// a data-loss risk. See project_live_site_discovery memory for the decision
// history if this file is being read out of context.
//
// DESIGN NOTE: every function here returns/accepts the exact same
// Airtable-style `{ id, fields: { 'Player': ..., 'Estimated Value': ... } }`
// shape the frontend has always used (CardTile, CardModal, page.js, the
// team/dashboard/admin pages, etc.) — so NONE of those components needed to
// change. `rowToFields()` is the DB-row -> Airtable-shape translator;
// `PATCH_FIELD_MAP` is the reverse, for saving edits CardModal.js sends
// using Airtable's own field-name spelling (unchanged from before).
//
// Requires TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in .env.local (same values
// already used by eetee-cards-app — copy them over, don't regenerate).

import { createClient } from '@libsql/client'

let _client = null
export function getTurso() {
  if (_client) return _client
  const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env
  if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
    throw new Error('Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN env vars')
  }
  _client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN })
  return _client
}

// ── DB row (snake_case) -> Airtable-style "fields" object ─────────────────
export function rowToFields(row) {
  return {
    'Card Name': row.card_name || '',
    'Player': row.player || '',
    'Year': row.year ?? null,
    'Brand': row.brand || '',
    'Set': row.set_name || '',
    'Card Number': row.card_number || '',
    'Parallel / Variant': row.parallel_variant || '',
    'Sport': row.sport || '',
    'Tags': row.tags ? JSON.parse(row.tags) : [],
    'Serial Number': row.serial_number || '',
    'Condition': row.condition || '',
    'Cost Paid': row.cost_paid ?? null,
    'Estimated Value': row.estimated_value ?? null,
    'Value Last Updated': row.value_last_updated || '',
    'PSA 8 Value': row.psa8_value ?? null,
    'PSA 9 Value': row.psa9_value ?? null,
    'PSA 10 Value': row.psa10_value ?? null,
    'For Sale': !!row.for_sale,
    'Asking Price': row.asking_price ?? null,
    'Front Image URL': row.front_image_url || '',
    'Back Image URL': row.back_image_url || '',
    'Notes': row.notes || '',
    'eBay Comp Data': row.ebay_comp_data || '',
    'Date Added': row.date_added || '',
    'Team': row.team || '',
    'League': row.league || '',
    'Rookie': !!row.rookie,
    'Numbered': !!row.numbered,
    'Print Run': row.print_run ?? null,
    'eBay Listing Title': row.ebay_listing_title || '',
    'eBay Listing Description': row.ebay_listing_description || '',
    // Added 2026-08-14 alongside this migration — present in the old
    // Airtable base's schema (Centering L/R, Centering T/B, Centering
    // Grade, Value Notes) or written by CardModal.js (Graded/Grader/Grade)
    // but had no column in the shared cards table until now. See
    // eetee-cards-app/scripts/apply-cards-extra-fields-to-turso.mjs.
    'Centering L/R': row.centering_lr || '',
    'Centering T/B': row.centering_tb || '',
    'Centering Grade': row.centering_grade || '',
    'Value Notes': row.value_notes || '',
    'Graded': !!row.graded,
    'Grader': row.grader || '',
    'Grade': row.grade || '',
  }
}

function toRecord(row) {
  return { id: row.id, fields: rowToFields(row) }
}

function genId() {
  return 'card' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

// ── List / filter ───────────────────────────────────────────────────────
// Mirrors the filter set the old Airtable filterByFormula supported, so
// every existing caller (app/page.js, collection/page.js, team/[team],
// dashboard, admin) keeps working with zero changes.
export async function listCards({
  search, sport, league, team, forSale, rookie, numbered,
  yearMin, yearMax, condition, set,
} = {}) {
  const turso = getTurso()
  let sql = 'SELECT * FROM cards'
  const clauses = []
  const args = {}

  if (search) {
    clauses.push(`(
      LOWER(player) LIKE @search OR LOWER(card_name) LIKE @search OR
      LOWER(set_name) LIKE @search OR LOWER(brand) LIKE @search OR
      LOWER(team) LIKE @search
    )`)
    args.search = `%${search.toLowerCase()}%`
  }
  if (sport && sport !== 'all') { clauses.push('sport = @sport'); args.sport = sport }
  if (league) { clauses.push('league = @league'); args.league = league }
  if (team) { clauses.push('LOWER(team) LIKE @team'); args.team = `%${team.toLowerCase()}%` }
  if (forSale === 'true' || forSale === true) clauses.push('for_sale = 1')
  if (rookie === 'true' || rookie === true) clauses.push('rookie = 1')
  if (numbered === 'true' || numbered === true) clauses.push('numbered = 1')
  if (yearMin) { clauses.push('year >= @yearMin'); args.yearMin = Number(yearMin) }
  if (yearMax) { clauses.push('year <= @yearMax'); args.yearMax = Number(yearMax) }
  if (condition) { clauses.push('condition = @condition'); args.condition = condition }
  if (set) { clauses.push('LOWER(set_name) LIKE @set'); args.set = `%${set.toLowerCase()}%` }

  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
  sql += ' ORDER BY date_added DESC, created_at DESC'

  const rs = await turso.execute({ sql, args })
  return rs.rows.map(toRecord)
}

export async function getCard(id) {
  const turso = getTurso()
  const rs = await turso.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [id] })
  if (!rs.rows.length) return null
  return toRecord(rs.rows[0])
}

// ── Create — accepts the camelCase body app/add and app/bulk-add already
// send (unchanged from before; see app/add/page.js:255-274). ─────────────
export async function createCard(body) {
  const turso = getTurso()
  const id = genId()
  await turso.execute({
    sql: `INSERT INTO cards (
      id, card_name, player, year, brand, set_name, card_number, parallel_variant,
      sport, tags, team, league, serial_number, rookie, numbered, print_run,
      condition, cost_paid, estimated_value, psa8_value, psa9_value, psa10_value,
      for_sale, asking_price, front_image_url, back_image_url, notes,
      centering_lr, centering_tb, centering_grade, value_notes, date_added, source
    ) VALUES (
      @id, @cardName, @player, @year, @brand, @set, @cardNumber, @parallel,
      @sport, @tags, @team, @league, @serialNumber, @rookie, @numbered, @printRun,
      @condition, @costPaid, @estimatedValue, @psa8Value, @psa9Value, @psa10Value,
      @forSale, @askingPrice, @frontImageUrl, @backImageUrl, @notes,
      @centeringLR, @centeringTB, @centeringGrade, @valueNotes, @dateAdded, @source
    )`,
    args: {
      id,
      cardName: body.cardName || '',
      player: body.player || '',
      year: body.year != null ? Number(body.year) : null,
      brand: body.brand || '',
      set: body.set || '',
      cardNumber: body.cardNumber || '',
      parallel: body.parallel || '',
      sport: body.sport || '',
      tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      team: body.team || '',
      league: body.league || '',
      serialNumber: body.serialNumber || '',
      rookie: body.rookie ? 1 : 0,
      numbered: body.numbered ? 1 : 0,
      printRun: body.printRun != null ? Number(body.printRun) : null,
      condition: body.condition || '',
      costPaid: body.costPaid != null ? Number(body.costPaid) : null,
      estimatedValue: body.estimatedValue != null ? Number(body.estimatedValue) : null,
      psa8Value: body.psa8Value != null ? Number(body.psa8Value) : null,
      psa9Value: body.psa9Value != null ? Number(body.psa9Value) : null,
      psa10Value: body.psa10Value != null ? Number(body.psa10Value) : null,
      forSale: body.forSale ? 1 : 0,
      askingPrice: body.askingPrice != null ? Number(body.askingPrice) : null,
      frontImageUrl: body.frontImageUrl || '',
      backImageUrl: body.backImageUrl || '',
      notes: body.notes || '',
      centeringLR: body.centeringLR || '',
      centeringTB: body.centeringTB || '',
      centeringGrade: body.centeringGrade || '',
      valueNotes: body.valueNotes || '',
      dateAdded: body.dateAdded || new Date().toISOString().split('T')[0],
      source: 'site_manual',
    },
  })
  return getCard(id)
}

// ── Update — accepts Airtable-style field names, exactly what CardModal.js
// and app/admin/page.js already PATCH with today (no frontend changes). ──
const PATCH_FIELD_MAP = {
  'Card Name': 'card_name', 'Player': 'player', 'Year': 'year', 'Brand': 'brand',
  'Set': 'set_name', 'Card Number': 'card_number', 'Parallel / Variant': 'parallel_variant',
  'Sport': 'sport', 'Serial Number': 'serial_number', 'Condition': 'condition',
  'Cost Paid': 'cost_paid', 'Estimated Value': 'estimated_value',
  'Value Last Updated': 'value_last_updated', 'PSA 8 Value': 'psa8_value',
  'PSA 9 Value': 'psa9_value', 'PSA 10 Value': 'psa10_value', 'Asking Price': 'asking_price',
  'Front Image URL': 'front_image_url', 'Back Image URL': 'back_image_url', 'Notes': 'notes',
  'eBay Comp Data': 'ebay_comp_data', 'Team': 'team', 'League': 'league',
  'Print Run': 'print_run', 'eBay Listing Title': 'ebay_listing_title',
  'eBay Listing Description': 'ebay_listing_description', 'Centering L/R': 'centering_lr',
  'Centering T/B': 'centering_tb', 'Centering Grade': 'centering_grade',
  'Value Notes': 'value_notes', 'Grader': 'grader', 'Grade': 'grade',
  'Date Added': 'date_added',
}
const PATCH_BOOL_MAP = {
  'For Sale': 'for_sale', 'Rookie': 'rookie', 'Numbered': 'numbered',
  'Published': 'published', 'Graded': 'graded',
}

export async function updateCard(id, patchFields) {
  const turso = getTurso()
  const sets = []
  const args = { id }

  if (patchFields.Tags !== undefined) {
    sets.push('tags = @tags')
    args.tags = JSON.stringify(Array.isArray(patchFields.Tags) ? patchFields.Tags : [])
  }
  for (const [key, col] of Object.entries(PATCH_FIELD_MAP)) {
    if (patchFields[key] !== undefined) {
      sets.push(`${col} = @${col}`)
      args[col] = patchFields[key]
    }
  }
  for (const [key, col] of Object.entries(PATCH_BOOL_MAP)) {
    if (patchFields[key] !== undefined) {
      sets.push(`${col} = @${col}`)
      args[col] = patchFields[key] ? 1 : 0
    }
  }
  if (!sets.length) return getCard(id)
  sets.push("updated_at = datetime('now')")
  await turso.execute({ sql: `UPDATE cards SET ${sets.join(', ')} WHERE id = @id`, args })
  return getCard(id)
}

export async function deleteCard(id) {
  const turso = getTurso()
  await turso.execute({ sql: 'DELETE FROM cards WHERE id = ?', args: [id] })
  return { id, deleted: true }
}

// ── Rainbow Tracker support — same match criteria the old Airtable
// filterByFormula used (player contains / exact year / set contains /
// exact card number), returning the same trimmed field shape. Used by
// app/api/rainbow/[id]/route.js. ─────────────────────────────────────────
export async function listCardsForRainbowMatch({ playerContains, year, setContains, cardNumber }) {
  const turso = getTurso()
  const rs = await turso.execute({
    sql: `SELECT * FROM cards WHERE
      LOWER(player) LIKE @player AND year = @year AND
      LOWER(set_name) LIKE @set AND card_number = @cardNumber`,
    args: {
      player: `%${String(playerContains || '').toLowerCase()}%`,
      year: Number(year),
      set: `%${String(setContains || '').toLowerCase()}%`,
      cardNumber: String(cardNumber || ''),
    },
  })
  return rs.rows.map((r) => rowToFields(r))
}
