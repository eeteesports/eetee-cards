'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import CardModal from '@/components/CardModal'
import DealsBanner from '@/components/DealsBanner'
import TeamPicker from '@/components/TeamPicker'
import { PRICE_BINS, binForPrice } from '@/lib/priceBins'
import { formatPrice } from '@/lib/format'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_600/')
}

const SPORTS  = ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'Other']
const LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'MLS', 'NCAA Football', 'NCAA Basketball', 'Other']
const CONDITIONS = [
  'Raw - Mint', 'Raw - Near Mint', 'Raw - Excellent', 'Raw - Good',
  'PSA 8', 'PSA 9', 'PSA 10', 'BGS 9', 'BGS 9.5', 'BGS 10', 'SGC 9', 'SGC 10',
]

const emptyFilters = () => ({
  search: '',
  sport: '',
  league: '',
  team: '',
  set: '',
  rookie: false,
  numbered: false,
  yearMin: '',
  yearMax: '',
  condition: '',
  priceMin: '',
  priceMax: '',
  bin: '', // price bin key — see lib/priceBins.js
})

// This is the homepage. Evan's ask: land straight in a browse/shop
// experience (no marketing hero, no stats) — modeled after
// keegskards.com/shop: filters on the left, a dense grid of cards, quick
// price-bin chips, and a "pick your team" entry point up top since that's
// how a lot of real buyer conversations start for him.
function HomeInner() {
  const searchParams = useSearchParams()
  const { add, remove, items } = useCart()
  const cartCount = items.length

  const [allCards, setAllCards] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filters, setFilters] = useState(() => ({
    ...emptyFilters(),
    search: searchParams.get('q') || '',
  }))

  const setF = (key, val) => setFilters((p) => ({ ...p, [key]: val }))
  const toggleF = (key) => setFilters((p) => ({ ...p, [key]: !p[key] }))

  const fetchCards = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ forSale: 'true' })
    if (filters.search)    p.set('search', filters.search)
    if (filters.sport)     p.set('sport', filters.sport)
    if (filters.league)    p.set('league', filters.league)
    if (filters.team)      p.set('team', filters.team)
    if (filters.set)       p.set('set', filters.set)
    if (filters.rookie)    p.set('rookie', 'true')
    if (filters.numbered)  p.set('numbered', 'true')
    if (filters.yearMin)   p.set('yearMin', filters.yearMin)
    if (filters.yearMax)   p.set('yearMax', filters.yearMax)
    if (filters.condition) p.set('condition', filters.condition)
    const res  = await fetch(`/api/cards?${p}`)
    const data = await res.json()
    setAllCards(data.records || [])
    setLoading(false)
  }, [
    filters.search, filters.sport, filters.league, filters.team,
    filters.set, filters.rookie, filters.numbered,
    filters.yearMin, filters.yearMax, filters.condition,
  ])

  useEffect(() => {
    const delay = (filters.search || filters.team || filters.set) ? 400 : 0
    const t = setTimeout(fetchCards, delay)
    return () => clearTimeout(t)
  }, [fetchCards])

  // Price bin + custom min/max applied client-side (bins are just named
  // min/max presets, so a custom range and a bin chip use the same filter)
  const cards = allCards.filter((c) => {
    const price = c.fields['Asking Price']
    if (filters.bin) {
      const bin = PRICE_BINS.find((b) => b.key === filters.bin)
      if (bin && !(price >= bin.min && price <= bin.max)) return false
    }
    if (filters.priceMin && price < Number(filters.priceMin)) return false
    if (filters.priceMax && price > Number(filters.priceMax)) return false
    return true
  })

  const activeFilterCount = [
    filters.sport, filters.league, filters.team, filters.set,
    filters.condition, filters.yearMin, filters.yearMax,
    filters.rookie, filters.numbered, filters.priceMin, filters.priceMax, filters.bin,
  ].filter(Boolean).length

  const FilterPanel = (
    <aside className="w-full text-sm">
      {activeFilterCount > 0 && (
        <button
          onClick={() => setFilters(emptyFilters())}
          className="w-full mb-4 text-blue-600 font-semibold hover:underline text-left text-xs"
        >
          ✕ Clear all filters ({activeFilterCount})
        </button>
      )}

      {/* Price bins — the literal boxes Evan sells out of */}
      <FilterSection title="Price Bin">
        <div className="grid grid-cols-2 gap-1.5">
          {PRICE_BINS.map((b) => (
            <button
              key={b.key}
              onClick={() => setF('bin', filters.bin === b.key ? '' : b.key)}
              className={`text-xs px-2 py-2 rounded-lg border font-bold transition-colors ${
                filters.bin === b.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Custom price range — mix and match with (or instead of) a bin */}
      <FilterSection title="Custom Price Range">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              value={filters.priceMin}
              onChange={(e) => setF('priceMin', e.target.value)}
              placeholder="Min"
              min={0}
              step="0.01"
              className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2 text-xs focus:outline-none focus:border-blue-400"
            />
          </div>
          <span className="text-gray-400 flex-shrink-0">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="number"
              value={filters.priceMax}
              onChange={(e) => setF('priceMax', e.target.value)}
              placeholder="Max"
              min={0}
              step="0.01"
              className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2 text-xs focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </FilterSection>

      {/* Card Type */}
      <FilterSection title="Card Type">
        <Toggle active={filters.rookie}   onClick={() => toggleF('rookie')}   color="yellow">⭐ Rookie Cards</Toggle>
        <Toggle active={filters.numbered} onClick={() => toggleF('numbered')} color="orange">🔢 Numbered Only</Toggle>
      </FilterSection>

      {/* Sport */}
      <FilterSection title="Sport">
        {SPORTS.map((s) => (
          <Toggle key={s} active={filters.sport === s} onClick={() => setF('sport', filters.sport === s ? '' : s)}>
            {s}
          </Toggle>
        ))}
      </FilterSection>

      {/* League */}
      <FilterSection title="League">
        {LEAGUES.map((l) => (
          <Toggle key={l} active={filters.league === l} onClick={() => setF('league', filters.league === l ? '' : l)}>
            {l}
          </Toggle>
        ))}
      </FilterSection>

      {/* Team */}
      <FilterSection title="Team">
        <input
          type="text"
          value={filters.team}
          onChange={(e) => setF('team', e.target.value)}
          placeholder="e.g. Lakers, Lions…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
        />
      </FilterSection>

      {/* Set */}
      <FilterSection title="Set / Product">
        <input
          type="text"
          value={filters.set}
          onChange={(e) => setF('set', e.target.value)}
          placeholder="e.g. Prizm, Chrome…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
        />
      </FilterSection>

      {/* Year */}
      <FilterSection title="Year">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={filters.yearMin}
            onChange={(e) => setF('yearMin', e.target.value)}
            placeholder="From"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
          />
          <span className="text-gray-400 flex-shrink-0">–</span>
          <input
            type="number"
            value={filters.yearMax}
            onChange={(e) => setF('yearMax', e.target.value)}
            placeholder="To"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
          />
        </div>
      </FilterSection>

      {/* Condition */}
      <FilterSection title="Condition">
        <select
          value={filters.condition}
          onChange={(e) => setF('condition', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 bg-white"
        >
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </FilterSection>
    </aside>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <DealsBanner />

      {/* Header */}
      <div className="bg-[#0f1b35] text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/eetee-logo.png" alt="eetee Cards" className="w-11 h-11 object-contain" />
            <div>
              <p className="font-black text-lg tracking-widest uppercase leading-none">eetee Cards</p>
              <p className="text-blue-300 text-xs">Detroit roots. Collecting since the &apos;90s.</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TeamPicker />
            <Link href="/cart" className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">
              <span className="text-lg">🛒</span>
              <span className="text-sm font-bold hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setF('search', e.target.value)}
            placeholder="Search by player, set, team, brand…"
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mobile filter toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="lg:hidden w-full mb-4 flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-sm font-semibold text-gray-700 shadow-sm"
        >
          <span>
            🎛️ Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </span>
          <span className="text-gray-400">{filtersOpen ? '▲' : '▼'}</span>
        </button>

        <div className="lg:flex lg:gap-6">
          {/* Sidebar */}
          <div className={`lg:w-60 lg:flex-shrink-0 ${filtersOpen ? 'block mb-4' : 'hidden lg:block'}`}>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-4">
              {FilterPanel}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              {loading ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-sm text-gray-500 font-medium">
                  {cards.length} card{cards.length !== 1 ? 's' : ''}
                  {filters.search ? ` for "${filters.search}"` : ' available'}
                  {activeFilterCount > 0 && <span className="text-blue-600"> · {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>}
                </p>
              )}
              {activeFilterCount > 0 && !loading && (
                <button onClick={() => setFilters(emptyFilters())} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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
              <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="text-5xl mb-4">🃏</div>
                <h2 className="text-lg font-black text-gray-700">No cards match your filters</h2>
                <p className="text-gray-400 mt-2 text-sm">Try adjusting or clearing your filters.</p>
                <button onClick={() => setFilters(emptyFilters())} className="mt-4 text-blue-600 font-semibold text-sm hover:underline">
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {cards.map((card) => {
                  const f = card.fields
                  const inCart = items.some((i) => i.id === card.id)
                  const bin = binForPrice(f['Asking Price'])
                  return (
                    <div
                      key={card.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
                    >
                      <div className="relative cursor-pointer" onClick={() => setSelected(card)}>
                        {f.Condition && (
                          <span className="absolute top-2 left-2 z-10 text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {f.Condition}
                          </span>
                        )}
                        {f.Rookie && (
                          <span className="absolute top-2 right-2 z-10 text-xs font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">RC</span>
                        )}
                        {f['Front Image URL'] ? (
                          <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-4xl text-gray-300">🃏</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-sm truncate text-gray-900">{f.Player || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}</p>
                        {f['Parallel / Variant'] && (
                          <p className="text-purple-600 text-xs font-medium mt-0.5 truncate">{f['Parallel / Variant']}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {bin && (bin.key === 'fifty-cent' || bin.key === 'one-dollar') && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold">{bin.label}</span>
                          )}
                          {f.Numbered && f['Print Run'] && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-medium">🔢 /{f['Print Run']}</span>
                          )}
                          {f.League && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{f.League}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-black text-gray-900 text-sm">
                            {f['Asking Price'] != null ? formatPrice(f['Asking Price']) : 'Make Offer'}
                          </p>
                          <button
                            onClick={() => inCart ? remove(card.id) : add(card)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                              inCart ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'
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
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-4">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-400 flex-wrap gap-2">
          <span>© eetee Cards</span>
          <div className="flex gap-4">
            <a href="mailto:eeteecards@gmail.com" className="hover:text-gray-600 transition-colors">Contact</a>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Admin</Link>
          </div>
        </div>
      </div>

      {/* Floating cart CTA */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Link href="/cart" className="flex items-center gap-3 bg-[#0f1b35] text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm hover:bg-blue-900 transition-colors">
            <span>🛒</span>
            <span>{cartCount} card{cartCount !== 1 ? 's' : ''} in cart</span>
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-lg">View Offer →</span>
          </Link>
        </div>
      )}

      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function FilterSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Toggle({ active, onClick, color = 'blue', children }) {
  const activeColors = {
    blue:   'bg-blue-600 text-white border-blue-600',
    yellow: 'bg-yellow-400 text-yellow-900 border-yellow-400',
    orange: 'bg-orange-500 text-white border-orange-500',
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors font-medium
        ${active ? activeColors[color] || activeColors.blue : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}

export default function PublicHome() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading store…</div>
      </div>
    }>
      <HomeInner />
    </Suspense>
  )
}
