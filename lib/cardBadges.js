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

  // "Serial Number" is entered pre-formatted (e.g. "45/99"); a plain
  // Print Run has no numerator, so it's shown as "/99" instead.
  const serial = fields['Serial Number'] || (fields.Numbered && fields['Print Run'] ? `/${fields['Print Run']}` : '')
  if (serial) badges.push({ key: 'serial', label: serial.toString() })

  return badges
}
