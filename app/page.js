'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import CardTile from '@/components/CardTile'
import CardModal from '@/components/CardModal'

export default function Dashboard() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/cards')
      .then((r) => r.json())
      .then((d) => { setCards(d.records || []); setLoading(false) })
  }, [])

  const totalCards = cards.length
  const totalValue = cards.reduce((s, c) => s + (c.fields['Estimated Value'] || 0), 0)
  const totalInvested = cards.reduce((s, c) => s + (c.fields['Cost Paid'] || 0), 0)
  const forSaleCount = cards.filter((c) => c.fields['For Sale']).length
  const gain = totalValue - totalInvested

  const featured = [...cards]
    .sort((a, b) => (b.fields['Estimated Value'] || 0) - (a.fields['Estimated Value'] || 0))
    .slice(0, 6)

  const sportBreakdown = cards.reduce((acc, c) => {
    const s = c.fields.Sport || 'Other'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a3a6b] to-[#0f1b35] text-white m-4 rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute right-12 bottom-0 w-32 h-32 bg-blue-500/10 rounded-full translate-y-8" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black uppercase leading-tight">My Collection.</h1>
          <p className="text-blue-200 font-bold uppercase tracking-wide mt-0.5">All In One Place.</p>
          <p className="text-blue-200/70 text-sm mt-2 max-w-xs">
            Browse, search, and track every card. Not for sale on this site — just showcasing what you've collected.
          </p>
          <div className="flex gap-3 mt-5 flex-wrap">
            <Link href="/collection"
              className="bg-white text-[#0f1b35] font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors">
              Browse Collection
            </Link>
            <Link href="/collection?forSale=true"
              className="border border-white/60 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors">
              View Storefront
            </Link>
            <Link href="/add"
              className="bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-400 transition-colors">
              + Add Card
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard label="Total Cards" value={loading ? '—' : totalCards} icon="🃏" />
        <StatCard
          label="Estimated Value"
          value={loading ? '—' : `$${totalValue.toLocaleString()}`}
          icon="💰"
          sub={gain !== 0 && !loading ? `${gain >= 0 ? '+' : ''}$${gain.toLocaleString()} vs cost` : null}
          subColor={gain >= 0 ? 'text-green-500' : 'text-red-400'}
        />
        <StatCard label="Total Invested" value={loading ? '—' : `$${totalInvested.toLocaleString()}`} icon="📈" />
        <StatCard label="Listed for Sale" value={loading ? '—' : forSaleCount} icon="🏷️" />
      </div>

      {/* Sport breakdown */}
      {!loading && Object.keys(sportBreakdown).length > 1 && (
        <div className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">By Sport</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(sportBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([sport, count]) => (
                <Link key={sport} href={`/collection?sport=${sport}`}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium transition-colors">
                  <span>{sport}</span>
                  <span className="bg-blue-200 text-blue-900 text-xs px-1.5 py-0.5 rounded-full font-bold">{count}</span>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Featured cards */}
      <div className="px-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg uppercase tracking-wide">Featured Cards</h2>
          <Link href="/collection" className="text-blue-600 text-sm font-semibold hover:underline">View all →</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-3">🃏</div>
            <p className="text-gray-500 mb-4">No cards yet — let's add your first one!</p>
            <Link href="/add" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700">
              Add Your First Card
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featured.map((card) => (
              <CardTile key={card.id} card={card} onClick={() => setSelected(card)} />
            ))}
          </div>
        )}
      </div>

      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StatCard({ label, value, icon, sub, subColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-xs font-medium">{label}</p>
          <p className="text-2xl font-black mt-1 text-gray-900">{value}</p>
          {sub && <p className={`text-xs font-semibold mt-0.5 ${subColor}`}>{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
