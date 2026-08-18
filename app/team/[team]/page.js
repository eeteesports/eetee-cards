'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import CardModal from '@/components/CardModal'
import TeamPicker from '@/components/TeamPicker'
import { PRICE_BINS, binForPrice } from '@/lib/priceBins'
import { formatPrice } from '@/lib/format'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_600/')
}

// "Pick your team" destination — the carousel-by-price-bin layout is
// Evan's ask specifically, separate from the full-filter homepage: this is
// meant to be a fast, scannable "here's everything I've got for your team"
// view for someone who opened with "what [team] cards do you have?"
export default function TeamPage({ params }) {
  const team = decodeURIComponent(params.team)
  const { add, remove, items } = useCart()
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f1b35] text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/eetee-logo.png" alt="eetee Cards" className="w-11 h-11 object-contain" />
            <span className="font-black text-lg tracking-widest uppercase leading-none">eetee Cards</span>
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TeamPicker />
            <Link href="/" className="text-sm font-bold text-white/70 hover:text-white px-3 py-2">
              ← All Cards
            </Link>
            <Link href="/cart" className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">
              <span className="text-lg">🛒</span>
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide mb-1">{team}</h1>
        <p className="text-gray-400 text-sm mb-8">
          {loading ? 'Loading…' : `${cards.length} card${cards.length !== 1 ? 's' : ''} available`}
        </p>

        {!loading && cards.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="text-5xl mb-4">🃏</div>
            <h2 className="text-lg font-black text-gray-700">No {team} cards listed right now</h2>
            <p className="text-gray-400 mt-2 text-sm">
              <a href="mailto:eeteecards@gmail.com" className="text-blue-600 hover:underline">Reach out</a> if you're looking for something specific.
            </p>
          </div>
        )}

        {buckets.map(({ bin, cards: binCards }) => (
          <div key={bin.key} className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-lg uppercase tracking-wide flex items-center gap-2">
                {bin.label}
                <span className="text-xs font-medium text-gray-400 normal-case">({binCards.length})</span>
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {binCards.map((card) => {
                const f = card.fields
                const inCart = items.some((i) => i.id === card.id)
                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-b-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex-shrink-0 w-40 sm:w-48"
                  >
                    <div className="relative cursor-pointer" onClick={() => setSelected(card)}>
                      {f['Front Image URL'] ? (
                        <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-3xl text-gray-300">🃏</div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-xs truncate text-gray-900">{f.Player || 'Unknown'}</p>
                      <p className="text-gray-400 text-xs truncate">{[f.Year, f.Set].filter(Boolean).join(' · ')}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="font-black text-gray-900 text-xs">{formatPrice(f['Asking Price'])}</p>
                        <button
                          onClick={() => inCart ? remove(card.id) : add(card)}
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg transition-colors ${
                            inCart ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {inCart ? '✓' : '+'}
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
            <h2 className="font-black text-lg uppercase tracking-wide mb-3">Make an Offer</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {noPriceCards.map((card) => {
                const f = card.fields
                return (
                  <div key={card.id} onClick={() => setSelected(card)}
                    className="bg-white rounded-b-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex-shrink-0 w-40 sm:w-48">
                    {f['Front Image URL'] ? (
                      <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-3xl text-gray-300">🃏</div>
                    )}
                    <div className="p-2.5">
                      <p className="font-bold text-xs truncate text-gray-900">{f.Player || 'Unknown'}</p>
                      <p className="text-gray-400 text-xs truncate">{[f.Year, f.Set].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-4">
          <Link href={`/?team=${encodeURIComponent(team)}`} className="text-blue-600 text-sm font-semibold hover:underline">
            Or browse {team} cards with full filters →
          </Link>
        </div>
      </div>

      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
