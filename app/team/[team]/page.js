'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import CardModal from '@/components/CardModal'
import CardBadges from '@/components/CardBadges'
import TeamPicker from '@/components/TeamPicker'
import { PRICE_BINS, binForPrice } from '@/lib/priceBins'
import { formatPrice } from '@/lib/format'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_600/')
}

// "Pick your team" destination — the carousel-by-price-bin layout is
// Evan's ask specifically, separate from the full-filter /shop page: this
// is meant to be a fast, scannable "here's everything I've got for your
// team" view for someone who opened with "what [team] cards do you have?"
// Chrome/typography matches the brand refresh (2026-08-18) — this page had
// been left on the pre-refresh navy/black look, which read as a different
// site the moment someone clicked in from the new home or shop pages.
export default function TeamPage({ params }) {
  const team = decodeURIComponent(params.team)
  const { add, remove, items } = useCart()
  const cartCount = items.length
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/cards?forSale=true&team=${encodeURIComponent(team)}`)
      .then((r) => r.json())
      .then((d) => setCards(d.records || []))
      .finally(() => setLoading(false))
  }, [team])

  const buckets = PRICE_BINS.map((bin) => ({
    bin,
    cards: cards.filter((c) => binForPrice(c.fields['Asking Price'])?.key === bin.key),
  })).filter((b) => b.cards.length > 0)

  const noPriceCards = cards.filter((c) => c.fields['Asking Price'] == null)

  return (
    <div className="min-h-screen bg-royal-600">
      {/* Header — full-bleed, no side rails here (matches home/shop) */}
      <div className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/eetee-logo.png" alt="eetee Cards" className="w-9 h-9 object-contain" />
            <span className="font-display font-semibold text-lg tracking-tight">eetee Cards</span>
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TeamPicker />
            <Link href="/cart" className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">
              <span className="text-lg">🛒</span>
              <span className="text-sm font-semibold hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-navy-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Rail-framed content column — royal-600 shows as side rails on wide viewports */}
      <div className="max-w-7xl mx-auto bg-gray-50 min-h-[calc(100vh-72px)] px-4 py-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-gray-900">{team}</h1>
          <Link href={`/shop?team=${encodeURIComponent(team)}`} className="text-sm font-semibold text-navy-700 hover:underline">
            Full filters for {team} →
          </Link>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          {loading ? 'Loading…' : `${cards.length} card${cards.length !== 1 ? 's' : ''} available`}
        </p>

        {!loading && cards.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="text-5xl mb-4">🃏</div>
            <h2 className="font-display font-semibold text-lg text-gray-700">No {team} cards listed right now</h2>
            <p className="text-gray-400 mt-2 text-sm">
              <a href="mailto:eeteecards@gmail.com" className="text-navy-700 hover:underline">Reach out</a> if you're looking for something specific.
            </p>
          </div>
        )}

        {buckets.map(({ bin, cards: binCards }) => (
          <div key={bin.key} className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-lg text-gray-900 flex items-center gap-2">
                {bin.label}
                <span className="text-xs font-medium text-gray-400">({binCards.length})</span>
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {binCards.map((card) => {
                const f = card.fields
                const inCart = items.some((i) => i.id === card.id)
                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-b-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 flex-shrink-0 w-40 sm:w-48"
                  >
                    <div className="relative cursor-pointer" onClick={() => setSelected(card)}>
                      <CardBadges fields={f} size="sm" />
                      {f['Front Image URL'] ? (
                        <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-3xl text-gray-300">🃏</div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-semibold text-xs truncate text-gray-900">{f.Player || 'Unknown'}</p>
                      <p className="text-gray-400 text-[11px] truncate mt-0.5">{[f.Year, f.Set].filter(Boolean).join(' · ')}</p>
                      {f.Condition && (
                        <p className="text-gray-400 text-[10px] truncate mt-0.5">{f.Condition}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="font-display font-semibold text-navy-900 text-xs">{formatPrice(f['Asking Price'])}</p>
                        <button
                          onClick={() => inCart ? remove(card.id) : add(card)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                            inCart ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {inCart ? '✓' : '+ Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {noPriceCards.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display font-semibold text-lg text-gray-900 mb-3">Ask About These</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
              {noPriceCards.map((card) => {
                const f = card.fields
                return (
                  <div key={card.id} onClick={() => setSelected(card)}
                    className="bg-white rounded-b-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex-shrink-0 w-40 sm:w-48">
                    <div className="relative">
                      <CardBadges fields={f} size="sm" />
                      {f['Front Image URL'] ? (
                        <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-3xl text-gray-300">🃏</div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-semibold text-xs truncate text-gray-900">{f.Player || 'Unknown'}</p>
                      <p className="text-gray-400 text-[11px] truncate">{[f.Year, f.Set].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 mt-6 -mx-4 px-4 pt-6">
          <div className="flex items-center justify-between text-sm text-gray-400 flex-wrap gap-2">
            <span>© eetee Cards</span>
            <div className="flex gap-4">
              <a href="mailto:eeteecards@gmail.com" className="hover:text-gray-600 transition-colors">Contact</a>
              <Link href="/login" className="hover:text-gray-600 transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Link href="/cart" className="flex items-center gap-3 bg-navy-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-semibold text-sm hover:bg-navy-800 transition-colors">
            <span>🛒</span>
            <span>{cartCount} card{cartCount !== 1 ? 's' : ''} in cart</span>
            <span className="bg-gold-400 text-navy-900 text-xs px-2 py-0.5 rounded-lg font-bold">View Cart →</span>
          </Link>
        </div>
      )}

      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
