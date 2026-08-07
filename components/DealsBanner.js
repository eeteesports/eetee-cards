import { DEALS } from '@/lib/deals'

// Marketing banner across the top advertising the two standing bulk deals.
// Purely informational here — the actual discount math lives in lib/deals.js
// and gets applied on the cart page once someone actually qualifies.
export default function DealsBanner() {
  return (
    <div className="bg-yellow-400 text-[#0f1b35]">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-1">
        {DEALS.map((deal) => (
          <span key={deal.id} className="text-xs sm:text-sm font-black text-center">
            🔥 {deal.label} — {deal.description}
          </span>
        ))}
      </div>
    </div>
  )
}
