'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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

const SPORTS  = ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'Other']
const LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'MLS', 'NCAA Football', 'NCAA Basketball', 'Other']
const CONDITIONS = [
  'Raw - Mint', 'Raw - Near Mint', 'Raw - Excellent', 'Raw - Good',
  'PSA 8', 'PSA 9', 'PSA 10', 'BGS 9', 'BGS 9.5', 'BGS 10', 'SGC 9', 'SGC 10',
]

const emptyFilters = () => ({
  search: '', sport: '', league: '', team: '', set: '',
  rookie: false, numbered: false, graded: false, yearMin: '', yearMax: '',
  condition: '', priceMin: '', priceMax: '', bin: '',
})

// A card counts as "graded" if its condition isn't one of the raw-grade
// buckets — i.e. it's a PSA/BGS/SGC slab grade instead.
const isGradedCondition = (condition) => !!condition && !condition.startsWith('Raw')

// Full searchable/filterable catalog — split out from the homepage
// (2026-08-17 brand refresh) so "/" can be a curated landing page instead
// of dropping straight into the whole inventory. Mirrors keegskards.com's
// own home-vs-/shop split. All the filter/search/grid logic here is
// unchanged from the old homepage — only the surrounding chrome (header,
// colors, type) picked up the new navy/gold system.
function ShopInner() {
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
    sport: searchParams.get('sport') || '',
    league: searchParams.get('league') || '',
    team: searchParams.get('team') || '',
    bin: searchParams.get('bin') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    rookie: searchParams.get('rookie') === 'true',
    graded: searchParams.get('graded') === 'true',
  }))
  const [sort, setSort] = useState(searchParams.get('sort') || '')

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

  const cards = allCards.filter((c) => {
    const price = c.fields['Asking Price']
    if (filters.bin) {
      const bin = PRICE_BINS.find((b) => b.key === filters.bin)
      if (bin && !(price >= bin.min && price <= bin.max)) return false
    }
    if (filters.priceMin && price < Number(filters.priceMin)) return false
    if (filters.priceMax && price > Number(filters.priceMax)) return false
    if (filters.graded && !isGradedCondition(c.fields.Condition)) return false
    return true
  }).sort((a, b) => {
    const priceA = a.fields['Asking Price'] ?? -1
    const priceB = b.fields['Asking Price'] ?? -1
    if (sort === 'price_desc') return priceB - priceA
    if (sort === 'price_asc') return priceA - priceB
    return 0 // default: whatever order the API returned (newest-first)
  })

  const activeFilterCount = [
    filters.sport, filters.league, filters.team, filters.set,
    filters.condition, filters.yearMin, filters.yearMax,
    filters.rookie, filters.numbered, filters.graded, filters.priceMin, filters.priceMax, filters.bin,
  ].filter(Boolean).length

  // Dark navy sidebar per Evan's mockup — every input here needs its own
  // dark-theme treatment rather than the light-card styling the rest of
  // the site uses, since this panel sits directly on navy-900.
  const darkInput = "w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/50"
  const FilterPanel = (
    <aside className="w-full text-sm">
      {activeFilterCount > 0 && (
        <button
          onClick={() => setFilters(emptyFilters())}
          className="w-full mb-4 text-white font-semibold hover:underline text-left text-xs"
        >
          ✕ Clear all filters ({activeFilterCount})
        </button>
      )}

      <FilterSection title="Price Bin">
        <div className="grid grid-cols-2 gap-1.5">
          {PRICE_BINS.map((b) => (
            <button
              key={b.key}
              onClick={() => setF('bin', filters.bin === b.key ? '' : b.key)}
              className={`text-xs px-2 py-2 rounded-lg border font-semibold transition-colors ${
                filters.bin === b.key
                  ? 'bg-gold-400 text-navy-900 border-gold-400'
                  : 'bg-white/5 text-white/70 border-white/15 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Custom Price Range">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">$</span>
            <input
              type="number" value={filters.priceMin} onChange={(e) => setF('priceMin', e.target.value)}
              placeholder="Min" min={0} step="0.01"
              className={`${darkInput} pl-6`}
            />
          </div>
          <span className="text-white/30 flex-shrink-0">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">$</span>
            <input
              type="number" value={filters.priceMax} onChange={(e) => setF('priceMax', e.target.value)}
              placeholder="Max" min={0} step="0.01"
              className={`${darkInput} pl-6`}
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Card Type">
        <Toggle active={filters.rookie}   onClick={() => toggleF('rookie')}   color="gold">⭐ Rookie Cards</Toggle>
        <Toggle active={filters.numbered} onClick={() => toggleF('numbered')} color="gold">🔢 Numbered Only</Toggle>
        <Toggle active={filters.graded}   onClick={() => toggleF('graded')}   color="gold">🏆 Graded Only</Toggle>
      </FilterSection>

      <FilterSection title="Sport">
        {SPORTS.map((s) => (
          <Toggle key={s} active={filters.sport === s} onClick={() => setF('sport', filters.sport === s ? '' : s)}>
            {s}
          </Toggle>
        ))}
      </FilterSection>

      <FilterSection title="League">
        {LEAGUES.map((l) => (
          <Toggle key={l} active={filters.league === l} onClick={() => setF('league', filters.league === l ? '' : l)}>
            {l}
          </Toggle>
        ))}
      </FilterSection>

      <FilterSection title="Team">
        <input
          type="text" value={filters.team} onChange={(e) => setF('team', e.target.value)}
          placeholder="e.g. Lakers, Lions…"
          className={darkInput}
        />
      </FilterSection>

      <FilterSection title="Set / Product">
        <input
          type="text" value={filters.set} onChange={(e) => setF('set', e.target.value)}
          placeholder="e.g. Prizm, Chrome…"
          className={darkInput}
        />
      </FilterSection>

      <FilterSection title="Year">
        <div className="flex gap-2 items-center">
          <input
            type="number" value={filters.yearMin} onChange={(e) => setF('yearMin', e.target.value)}
            placeholder="From"
            className={darkInput}
          />
          <span className="text-white/30 flex-shrink-0">–</span>
          <input
            type="number" value={filters.yearMax} onChange={(e) => setF('yearMax', e.target.value)}
            placeholder="To"
            className={darkInput}
          />
        </div>
      </FilterSection>

      <FilterSection title="Condition">
        <select
          value={filters.condition} onChange={(e) => setF('condition', e.target.value)}
          className={`${darkInput} [&>option]:text-gray-900`}
        >
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </FilterSection>
    </aside>
  )

  return (
    <div className="min-h-screen bg-royal-600">
      {/* Header — full-bleed, no side rails here (matches the homepage) */}
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

      {/* Rail-framed content column — royal-600 shows as side rails on wide viewports */}
      <div className="max-w-7xl mx-auto bg-gray-50 min-h-[calc(100vh-140px)] px-4 py-6">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="lg:hidden w-full mb-4 flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-sm font-semibold text-gray-700 shadow-sm"
        >
          <span>
            🎛️ Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-navy-800 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </span>
          <span className="text-gray-400">{filtersOpen ? '▲' : '▼'}</span>
        </button>

        <div className="lg:flex lg:gap-6">
          <div className={`lg:w-64 lg:flex-shrink-0 ${filtersOpen ? 'block mb-4' : 'hidden lg:block'}`}>
            <div className="bg-navy-900 rounded-2xl p-4 sticky top-4">
              {FilterPanel}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              {loading ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-sm text-gray-500 font-medium">
                  {cards.length} card{cards.length !== 1 ? 's' : ''}
                  {filters.search ? ` for "${filters.search}"` : ' available'}
                  {activeFilterCount > 0 && <span className="text-navy-700"> · {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>}
                </p>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-navy-400"
                >
                  <option value="">Newest first</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="price_asc">Price: low to high</option>
                </select>
                {activeFilterCount > 0 && !loading && (
                  <button onClick={() => setFilters(emptyFilters())} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Clear all
                  </button>
                )}
              </div>
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
                <h2 className="font-display font-semibold text-lg text-gray-700">No cards match your filters</h2>
                <p className="text-gray-400 mt-2 text-sm">Try adjusting or clearing your filters.</p>
                <button onClick={() => setFilters(emptyFilters())} className="mt-4 text-navy-700 font-semibold text-sm hover:underline">
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
                      className="bg-white rounded-b-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
                    >
                      <div className="relative cursor-pointer" onClick={() => setSelected(card)}>
                        <CardBadges fields={f} size="sm" />
                        {/* Square corners on the photo itself — corner sharpness is real grading signal. */}
                        {f['Front Image URL'] ? (
                          <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-4xl text-gray-300">🃏</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm truncate text-gray-900">{f.Player || 'Unknown'}</p>
                        {f['Parallel / Variant'] && (
                          <p className="text-royal-600 text-xs font-bold truncate mt-0.5">{f['Parallel / Variant']}</p>
                        )}
                        <p className="text-gray-400 text-xs truncate mt-0.5">{[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {bin && (bin.key === 'fifty-cent' || bin.key === 'one-dollar') && (
                            <span className="text-xs bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded-full font-semibold">{bin.label}</span>
                          )}
                          {f.League && (
                            <span className="text-xs bg-navy-50 text-navy-700 px-1.5 py-0.5 rounded-full">{f.League}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-display font-semibold text-navy-900 text-sm">
                            {f['Asking Price'] != null ? formatPrice(f['Asking Price']) : 'Contact'}
                          </p>
                          {f['Asking Price'] == null ? (
                            <a href={`mailto:eeteecards@gmail.com?subject=${encodeURIComponent(`Pricing for ${f.Player || 'a card'}`)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-green-300 text-green-700 hover:bg-green-50 transition-colors">
                              ✉️ Ask
                            </a>
                          ) : (
                            <button
                              onClick={() => inCart ? remove(card.id) : add(card)}
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                                inCart ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {inCart ? '✓ In Cart' : '+ Cart'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

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

function FilterSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Toggle({ active, onClick, color = 'gold', children }) {
  const activeColors = {
    navy: 'bg-white text-navy-900 border-white',
    gold: 'bg-gold-400 text-navy-900 border-gold-400',
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors font-medium
        ${active ? activeColors[color] || activeColors.gold : 'bg-white/5 text-white/70 border-white/15 hover:border-white/30 hover:bg-white/10'}`}
    >
      {children}
    </button>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading store…</div>
      </div>
    }>
      <ShopInner />
    </Suspense>
  )
}
