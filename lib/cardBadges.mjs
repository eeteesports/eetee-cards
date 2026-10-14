export function cardBadges(card) {
  const badges = []
  if (card.rookie === true || card.rookie === 'Yes') badges.push({label: 'RC', title: 'Rookie card'})
  if (card.autograph === true || card.autographed === 'Yes') badges.push({label: 'AUTO', title: 'Autograph card'})
  const serial = String(card.serial || card.serial_number || '').trim()
  const match = serial.match(/^(?:\d+)?\s*\/\s*(\d+)$/)
  const printRun = Number(card.printRun ?? card.print_run ?? match?.[1])
  if ((match || Number.isInteger(printRun)) && printRun > 0) {
    badges.push({label: `SN /${printRun}`, title: `Serial numbered; print run of ${printRun}`})
  } else if (/^\d+$/.test(serial)) {
    badges.push({label: 'SN', title: 'Serial numbered; print run not recorded'})
  }
  return badges
}
