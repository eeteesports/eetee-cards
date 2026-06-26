'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import CardTile from '@/components/CardTile'
import CardModal from '@/components/CardModal'

const SPORTS = ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'Other']

function CollectionInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sport, setSport] = useState(searchParams.get('sport') || 'all')
  const [forSale, setForSale] = useState(searchParams.get('forSale') === 'true')
  const [selected, setSelected] = useState(null)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (sport !== 'all') p.set('sport', sport)
    if (forSale) p.set('forSale', 'true')
    const res = await fetch(`/api/cards?${p}`)
    const data = await res.json()
    setCards(data.records || [])
    setLoading(false)
  }, [search, sport, forSale])

  useEffect(() => {
    const t = setTimeout(fetchCards, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchCards, search])

  const isEmpty = !loading && cards.length === 0

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black uppercase tracking-widest">
          {forSale ? '🏷️ Storefront' : '📊 Collection'}
        </h1>
        {!loading && (
          <span className="text-gray-400 text-sm">{cards.length} cards</span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="search"
          placeholder="Search players, sets, brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-white"
        />
      </div>

      {/* Sport filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
        <FilterPill active={sport === 'all'} onClick={() => setSport('all')}>All Sports</FilterPill>
        {SPORTS.map((s) => (
          <FilterPill key={s} active={sport === s} onClick={() => setSport(s)}>{s}</FilterPill>
        ))}
        <FilterPill active={forSale} color="green" onClick={() => setForSale(!forSale)}>
          🏷️ For Sale
        </FilterPill>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
          <p className="text-gray-400 text-lg mb-1">{search || sport !== 'all' ? 'No cards match your filters.' : 'No cards yet!'}</p>
          {!search && sport === 'all' && (
            <button onClick={() => router.push('/add')} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm">
              Add Your First Card
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <CardTile key={card.id} card={card} onClick={() => setSelected(card)} />
          ))}
        </div>
      )}

      {selected && (
        <CardModal card={selected} onClose={() => setSelected(null)} onRefresh={fetchCards} />
      )}
    </div>
  )
}

function FilterPill({ active, color = 'blue', onClick, children }) {
  const activeClass = color === 'green'
    ? 'bg-green-600 text-white border-green-600'
    : 'bg-blue-600 text-white border-blue-600'
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap
        ${active ? activeClass : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
    >
      {children}
    </button>
  )
}

export default function Collection() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <CollectionInner />
    </Suspense>
  )
}
