// On-image badge rules (2026-08-18) — Evan's explicit list of the only
// things allowed to overlay a card photo: RC, a serial/print-run number,
// MEM (patch/relic/jersey), AUTO, and a graded slab's grade. Everything
// else (condition, team, league, set) reads better below the image than
// crowding the player's face, so it belongs in each card's text block or
// detail table instead — see DetailRow usage in CardModal.js.
export function getRookieBadge(fields) {
  return !!fields.Rookie
}

// Ordered by how rare/valuable the signal typically is in the hobby, since
// this is also the stacking order for the top-left badge column.
export function getOtherBadges(fields) {
  const badges = []

  const gradeLabel = fields.Graded
    ? [fields.Grader, fields.Grade].filter(Boolean).join(' ')
    : (fields.Condition && !fields.Condition.startsWith('Raw') ? fields.Condition : '')
  if (gradeLabel) badges.push({ key: 'graded', label: gradeLabel })

  if (fields.Tags?.includes('Auto')) badges.push({ key: 'auto', label: 'AUTO' })
  if (fields.Tags?.includes('Patch')) badges.push({ key: 'mem', label: 'MEM' })

  // Print Run is the source of truth for this badge (Evan's spec,
  // 2026-08-19): "/<Print Run>" — e.g. Print Run 299 shows "/299" — with
  // one exception: a one-of-one shows the full "1/1", not a bare "/1",
  // since a lone "/1" reads as broken rather than as the rarest card in
  // the catalog.
  const printRun = fields['Print Run']
  if (printRun) badges.push({ key: 'serial', label: Number(printRun) === 1 ? '1/1' : `/${printRun}` })

  return badges
}
