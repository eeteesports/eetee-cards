import { getRookieBadge, getOtherBadges } from '@/lib/cardBadges'

// Overlay badges for a card photo. RC sits alone in the top-right (it's
// common — ~1/3 of the catalog — so it stays a single, unmissable pill).
// Everything rarer (graded, auto, patch/mem, serial) stacks in the top-left
// instead, so the two corners never compete for the same space. Both
// corners are deliberately small — the point of this whole change was
// getting badges OFF the player's face, not just relocating a big one.
export default function CardBadges({ fields, size = 'md' }) {
  const isRookie = getRookieBadge(fields)
  const others = getOtherBadges(fields)
  if (!isRookie && others.length === 0) return null

  const text = size === 'sm' ? 'text-[9px]' : 'text-[10px]'
  const pad = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'

  return (
    <>
      {isRookie && (
        <span className={`absolute top-2 right-2 z-10 ${text} font-bold ${pad} rounded bg-gold-400 text-navy-900 shadow-sm`}>
          RC
        </span>
      )}
      {others.length > 0 && (
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
          {others.map((b) => (
            <span key={b.key} className={`${text} font-bold ${pad} rounded bg-navy-900/85 text-white shadow-sm backdrop-blur-[1px]`}>
              {b.label}
            </span>
          ))}
        </div>
      )}
    </>
  )
}
