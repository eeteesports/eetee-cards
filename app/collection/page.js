'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import CardTile from '@/components/CardTile'
import CardModal from '@/components/CardModal'

const SPORTS = ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'Other']
const LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'MLS', 'Other']
const CONDITIONS = [
  'Raw - Mint', 'Raw - Near Mint', 'Raw - Excellent', 'Raw - Good', 'Raw - Poor',
  'PSA 8', 'PSA 9', 'PSA 10', 'BGS 9', 'BGS 9.5', 'BGS 10',
]

const emptyFilters = () => ({
  search: '',
  sport: '',
  league: '',
  team: '',
  forSale: false,
  rookie: false,
  numbered: false,
  yearMin: '',
  yearMax: '',
  condition: '',
  set: '',
})

function CollectionInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false) // mobile drawer

  const [filters, setFilters] = useState(() => ({
    ...emptyFilters(),
    sport: searchParams.get('sport') || '',
    forSale: searchParams.get('forSale') === 'true',
  }))

  const setF = (key, val) => setFilters((p) => ({ ...p, [key]: val }))
  const toggleF = (key) => setFilters((p) => ({ ...p, [key]: !p[key] }))

  const activeFilterCount = [
    filters.sport, filters.league, filters.team, filters.condition, filters.set,
    filters.yearMin, filters.yearMax,
    filters.forSale, filters.rookie, filters.numbered,
  ].filter(Boolean).length

  const fetchCards = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filters.search)    p.set('search', filters.search)
    if (filters.sport)     p.set('sport', filters.sport)
    if (filters.league)    p.set('league', filters.league)
    if (filters.team)      p.set('team', filters.team)
    if (filters.forSale)   p.set('forSale', 'true')
    if (filters.rookie)    p.set('rookie', 'true')
    if (filters.numbered)  p.set('numbered', 'true')
    if (filters.yearMin)   p.set('yearMin', filters.yearMin)
    if (filters.yearMax)   p.set('yearMax', filters.yearMax)
    if (filters.condition) p.set('condition', filters.condition)
    if (filters.set)       p.set('set', filters.set)
    const res = await fetch(`/api/cards?${p}`)
    const data = await res.json()
    setCards(data.records || [])
    setLoading(false)
  }, [filters])

  useEffect(() => {
    const t = setTimeout(fetchCards, filters.search || filters.team || filters.set ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchCards])

  const isEmpty = !loading && cards.length === 0

  const FilterPanel = (
    <aside className="w-full">
      {/* Clear all */}
      {activeFilterCount > 0 && (
        <button
          onClick={() => setFilters(emptyFilters())}
          className="w-full mb-4 text-sm text-blue-600 font-semibold hover:underline text-left"
        >
          ✕ Clear all filters ({activeFilterCount})
        </button>
      )}

      {/* For Sale */}
      <FilterSection title="Availability">
        <Toggle active={filters.forSale} onClick={() => toggleF('forSale')} color="green">
          🏷️ For Sale Only
        </Toggle>
      </FilterSection>

      {/* Quick attributes */}
      <FilterSection title="Card Type">
        <Toggle active={filters.rookie} onClick={() => toggleF('rookie')} color="yellow">
          ⭐ Rookies Only
        </Toggle>
        <Toggle active={filters.numbered} onClick={() => toggleF('numbered')} color="orange">
          🔢 Numbered Only
        </Toggle>
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

      {/* Team search */}
      <FilterSection title="Team">
        <input
          type="text"
          value={filters.team}
          onChange={(e) => setF('team', e.target.value)}
          placeholder="e.g. Lakers, Cowboys…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </FilterSection>

      {/* Set search */}
      <FilterSection title="Set / Product Line">
        <input
          type="text"
          value={filters.set}
          onChange={(e) => setF('set', e.target.value)}
          placeholder="e.g. Prizm, Chrome…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </FilterSection>

      {/* Year range */}
      <FilterSection title="Year">
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={filters.yearMin}
            onChange={(e) => setF('yearMin', e.target.value)}
            placeholder="From"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <span className="text-gray-400 text-sm flex-shrink-0">–</span>
          <input
            type="number"
            value={filters.yearMax}
            onChange={(e) => setF('yearMax', e.target.value)}
            placeholder="To"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </FilterSection>

      {/* Condition */}
      <FilterSection title="Condition">
        <select
          value={filters.condition}
          onChange={(e) => setF('condition', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
        >
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </FilterSection>
    </aside>
  )

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black uppercase tracking-widest">
          {filters.forSale ? '🏷️ Storefront' : '📊 Collection'}
        </h1>
        {!loading && (
          <span className="text-gray-400 text-sm">{cards.length} cards</span>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="search"
          placeholder="Search players, teams, sets, brands…"
          value={filters.search}
          onChange={(e) => setF('search', e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-white shadow-sm"
        />
      </div>

      {/* Mobile: filter toggle button */}
      <button
        onClick={() => setFiltersOpen(!filtersOpen)}
        className="lg:hidden w-full mb-4 flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-sm font-semibold text-gray-700 shadow-sm"
      >
        <span>🎛️ Filters {activeFilterCount > 0 && <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>}</span>
        <span className="text-gray-400">{filtersOpen ? '▲' : '▼'}</span>
      </button>

      <div className="lg:flex lg:gap-6">
        {/* Filter sidebar — desktop always visible, mobile collapsible */}
        <div className={`lg:w-56 lg:flex-shrink-0 ${filtersOpen ? 'block mb-4' : 'hidden lg:block'}`}>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            {FilterPanel}
          </div>
        </div>

        {/* Card grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-400 text-lg mb-1">
                {activeFilterCount > 0 || filters.search
                  ? 'No cards match your filters.'
                  : 'No cards yet!'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters(emptyFilters())}
                  className="mt-3 text-blue-600 text-sm font-semibold hover:underline"
                >
                  Clear filters
                </button>
              )}
              {!filters.search && activeFilterCount === 0 && (
                <button
                  onClick={() => router.push('/add')}
                  className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm"
                >
                  Add Your First Card
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {cards.map((card) => (
                <CardTile key={card.id} card={card} onClick={() => setSelected(card)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <CardModal card={selected} onClose={() => setSelected(null)} onRefresh={fetchCards} />
      )}
    </div>
  )
}

function FilterSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Toggle({ active, onClick, color = 'blue', children }) {
  const activeColors = {
    blue:   'bg-blue-600 text-white border-blue-600',
    green:  'bg-green-600 text-white border-green-600',
    yellow: 'bg-yellow-400 text-yellow-900 border-yellow-400',
    orange: 'bg-orange-500 text-white border-orange-500',
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors font-medium
        ${active ? activeColors[color] || activeColors.blue : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}

export default function Collection() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <CollectionInner />
    </Suspense>
  )
}
