'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_600/')
}

const CONDITION_COLOR = {
  'PSA 10': 'bg-blue-100 text-blue-800',
  'BGS 10': 'bg-blue-100 text-blue-800',
  'PSA 9':  'bg-teal-100 text-teal-800',
  'BGS 9':  'bg-teal-100 text-teal-800',
  'PSA 8':  'bg-green-100 text-green-800',
}

function conditionColor(cond) {
  for (const [key, cls] of Object.entries(CONDITION_COLOR)) {
    if (cond?.includes(key)) return cls
  }
  return 'bg-gray-100 text-gray-600'
}

function StoreInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { add, remove, items } = useCart()

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState(searchParams.get('q') || '')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ forSale: 'true' })
    if (search) params.set('search', search)
    fetch(`/api/cards?${params}`)
      .then((r) => r.json())
      .then((d) => { setCards(d.records || []); setLoading(false) })
  }, [search])

  const cartCount = items.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store header */}
      <div className="bg-[#0f1b35] text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black">ET</div>
              <div>
                <p className="font-black text-lg tracking-widest uppercase leading-none">eetee Sports</p>
                <p className="text-blue-300 text-xs">Cards for Sale</p>
              </div>
            </Link>
          </div>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
          >
            <span className="text-lg">🛒</span>
            <span className="text-sm font-bold">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Search bar */}
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player, set, team..."
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15"
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🃏</div>
            <h2 className="text-xl font-black text-gray-700">
              {search ? 'No matching cards for sale' : 'Nothing listed for sale right now'}
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              {search ? 'Try a different search term.' : 'Check back soon — new cards get listed regularly.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-4 text-blue-600 font-semibold text-sm hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4 font-medium">
              {cards.length} card{cards.length !== 1 ? 's' : ''} available
              {search ? ` matching "${search}"` : ''}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {cards.map((card) => {
                const f = card.fields
                const inCart = items.some((i) => i.id === card.id)
                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
                  >
                    {/* Image */}
                    <div className="relative cursor-pointer" onClick={() => setSelected(card)}>
                      {f.Condition && (
                        <span className={`absolute top-2 left-2 z-10 text-xs font-semibold px-2 py-0.5 rounded ${conditionColor(f.Condition)}`}>
                          {f.Condition}
                        </span>
                      )}
                      {f['Front Image URL'] ? (
                        <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                          <span className="text-4xl">🃏</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="font-bold text-sm truncate text-gray-900">{f.Player || 'Unknown'}</p>
                      <p className="text-gray-400 text-xs truncate mt-0.5">
                        {[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}
                      </p>
                      {f['Parallel / Variant'] && (
                        <p className="text-purple-600 text-xs font-medium mt-0.5 truncate">{f['Parallel / Variant']}</p>
                      )}

                      {/* Chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {f.Rookie && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">⭐ RC</span>
                        )}
                        {f.Numbered && f['Print Run'] && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-medium">🔢 /{f['Print Run']}</span>
                        )}
                        {f.League && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{f.League}</span>
                        )}
                      </div>

                      {/* Price + Cart */}
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-black text-gray-900">
                          {f['Asking Price'] ? `$${Number(f['Asking Price']).toLocaleString()}` : 'Make Offer'}
                        </p>
                        <button
                          onClick={() => inCart ? remove(card.id) : add(card)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                            inCart
                              ? 'bg-green-100 text-green-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {inCart ? '✓ In Cart' : '+ Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Cart CTA */}
        {cartCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <Link
              href="/cart"
              className="flex items-center gap-3 bg-[#0f1b35] text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm hover:bg-blue-900 transition-colors"
            >
              <span>🛒</span>
              <span>{cartCount} card{cartCount !== 1 ? 's' : ''} in cart</span>
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-lg">View Offer →</span>
            </Link>
          </div>
        )}
      </div>

      {/* Quickview modal */}
      {selected && <StoreCardQuickview card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StoreCardQuickview({ card, onClose }) {
  const f = card.fields
  const { add, remove, items } = useCart()
  const inCart = items.some((i) => i.id === card.id)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-t-2xl md:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-black text-xl">{f.Player}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">×</button>
        </div>

        {f['Front Image URL'] && (
          <img
            src={f['Front Image URL'].replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_600/')}
            alt={f.Player}
            className="w-full aspect-[3/4] object-cover rounded-xl mb-4"
          />
        )}

        <div className="space-y-1 text-sm mb-4">
          <p><span className="text-gray-400">Year/Set:</span> <span className="font-semibold">{[f.Year, f.Brand, f.Set].filter(Boolean).join(' ')}</span></p>
          {f['Card Number'] && <p><span className="text-gray-400">Card #:</span> <span className="font-semibold">#{f['Card Number']}</span></p>}
          {f['Parallel / Variant'] && <p><span className="text-gray-400">Variant:</span> <span className="font-semibold text-purple-700">{f['Parallel / Variant']}</span></p>}
          {f.Team && <p><span className="text-gray-400">Team:</span> <span className="font-semibold">{f.Team}</span></p>}
          {f.Condition && <p><span className="text-gray-400">Condition:</span> <span className="font-semibold">{f.Condition}</span></p>}
          {f.Rookie && <p className="text-yellow-700 font-semibold">⭐ Rookie Card</p>}
          {f.Numbered && f['Print Run'] && <p className="text-orange-700 font-semibold">🔢 Numbered /{f['Print Run']}</p>}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-3xl font-black">
            {f['Asking Price'] ? `$${Number(f['Asking Price']).toLocaleString()}` : 'Make Offer'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => inCart ? remove(card.id) : add(card)}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
              inCart
                ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {inCart ? '✓ In Cart — Remove?' : '🛒 Add to Cart'}
          </button>
          {inCart && (
            <Link href="/cart" onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-center bg-[#0f1b35] text-white hover:bg-blue-900 transition-colors">
              Make Offer →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading store...</div>
      </div>
    }>
      <StoreInner />
    </Suspense>
  )
}
