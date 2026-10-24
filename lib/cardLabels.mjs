export function cardSetLabel(card){const brand=String(card.brand||'').replace(/^Panini America$/i,'Panini');const set=String(card.set||'').replace(/^(Topps|Panini America|Panini) /i,'');return [card.year,brand,set].filter(Boolean).join(' ')}

export function cardDetailLabel(card) {
  const absent = /^(?:base(?:\s*(?:card|set))?|no[\s_-]*parallel|none|n\/?a|not applicable|standard(?:\s*\/\s*no parallel)?|base\s*\/\s*no parallel)$/i
  return [card.cardName&&card.cardName!==card.player?card.cardName:'',card.family, card.parallel]
    .map(value => String(value || '').trim())
    .filter(value => value && !absent.test(value))
    .join(' | ')
}
