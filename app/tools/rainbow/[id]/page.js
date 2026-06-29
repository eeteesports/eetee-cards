'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const TIER_LABELS = ['Base', 'Refractors', '/400–/199', '/150–/75', '/50–/25', '/10–/5', 'Ultra Rare']

function ParallelCard({ p, onClick }) {
  const isOwned    = p.owned
  const printLabel = p.printRun === 1 ? '1/1' : p.printRun ? `/${p.printRun}` : null

  return (
    <button
      onClick={() => onClick(p)}
      className="group relative flex flex-col items-center gap-1 focus:outline-none"
      title={p.name + (printLabel ? ` ${printLabel}` : '')}
    >
      {/* Card art area */}
      <div
        className="relative w-[72px] h-[100px] rounded-lg overflow-hidden shadow-md transition-transform group-hover:scale-105 group-hover:shadow-xl"
        style={{
          border: `2px solid ${isOwned ? p.color : '#9CA3AF'}`,
        }}
      >
        {isOwned && p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.name}
            className="w-full h-full object-cover"
            style={{ filter: 'none' }}
          />
        ) : isOwned ? (
          /* Owned but no image — colored gradient placeholder */
          <div
            className="w-full h-full flex items-center justify-center text-white text-xs font-bold text-center px-1 leading-tight"
            style={{
              background: `linear-gradient(135deg, ${p.color}CC, ${p.color}55)`,
            }}
          >
            ✓
          </div>
        ) : (
          /* Missing — grayscale card placeholder */
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex flex-col items-center justify-center gap-1">
            <div className="w-8 h-8 rounded-full bg-gray-400/50 flex items-center justify-center text-gray-500 text-sm">?</div>
            {p.ebayPrice != null && (
              <span className="text-[10px] font-bold text-gray-600">${p.ebayPrice.toFixed(0)}</span>
            )}
          </div>
        )}

        {/* Owned checkmark overlay */}
        {isOwned && (
          <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
            style={{ background: p.color, color: '#fff', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }}>
            ✓
          </div>
        )}

        {/* Exclusive badge */}
        {p.exclusive && (
          <div className="absolute bottom-0 left-0 right-0 text-[8px] text-center py-0.5 font-bold"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
            {p.exclusive}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-center w-[72px]">
        <p className="text-[10px] font-bold leading-tight text-gray-700 truncate">{p.name.replace(' Refractor', '').replace(' Geometric', ' Geo')}</p>
        {printLabel && (
          <p className="text-[10px] font-black" style={{ color: isOwned ? p.color : '#9CA3AF' }}>{printLabel}</p>
        )}
      </div>
    </button>
  )
}

function DetailModal({ parallel, onClose }) {
  if (!parallel) return null
  const printLabel = parallel.printRun === 1 ? '1/1' : parallel.printRun ? `/${parallel.printRun}` : 'Unlimited'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-black text-xl">{parallel.name}</h2>
            <p className="text-gray-500 text-sm">{printLabel} print run</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {/* Card image or placeholder */}
        <div className="flex justify-center mb-4">
          {parallel.owned && parallel.imageUrl ? (
            <img src={parallel.imageUrl} alt={parallel.name} className="w-40 rounded-xl shadow-lg" />
          ) : parallel.owned ? (
            <div className="w-40 h-[224px] rounded-xl flex items-center justify-center text-4xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${parallel.color}CC, ${parallel.color}44)` }}>
              ✓
            </div>
          ) : (
            <div className="w-40 h-[224px] rounded-xl flex flex-col items-center justify-center gap-2 bg-gray-100 shadow-inner">
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-2xl text-gray-500">?</div>
              <p className="text-gray-400 font-bold text-sm">Not Yet Owned</p>
            </div>
          )}
        </div>

        {/* Status */}
        <div className={`text-center font-black text-lg mb-3 ${parallel.owned ? 'text-green-600' : 'text-gray-400'}`}>
          {parallel.owned ? '✅ In Your Collection' : '⬜ Missing'}
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm">
          {parallel.condition && (
            <div className="flex justify-between">
              <span className="text-gray-500">Condition</span>
              <span className="font-bold">{parallel.condition}</span>
            </div>
          )}
          {parallel.serialNum && (
            <div className="flex justify-between">
              <span className="text-gray-500">Serial Number</span>
              <span className="font-bold">{parallel.serialNum}</span>
            </div>
          )}
          {parallel.exclusive && (
            <div className="flex justify-between">
              <span className="text-gray-500">Exclusive to</span>
              <span className="font-bold">{parallel.exclusive} box</span>
            </div>
          )}
          {!parallel.owned && parallel.ebayPrice != null && (
            <div className="flex justify-between items-center mt-2 pt-2 border-t">
              <span className="text-gray-500">eBay (lowest listing)</span>
              <div className="flex items-center gap-2">
                <span className="font-black text-green-700">${parallel.ebayPrice.toFixed(2)}</span>
                {parallel.ebayUrl && (
                  <a href={parallel.ebayUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline">View →</a>
                )}
              </div>
            </div>
          )}
          {!parallel.owned && parallel.ebayPrice == null && (
            <div className="text-center text-xs text-gray-400 mt-2 pt-2 border-t">
              Load eBay prices to see current listings for this card.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RainbowDetailPage({ params }) {
  const { id }                           = params
  const [data,     setData]              = useState(null)
  const [loading,  setLoading]           = useState(true)
  const [selected, setSelected]          = useState(null)
  const [ebayLoading, setEbayLoading]    = useState(false)
  const [showMissing, setShowMissing]    = useState(false)

  useEffect(() => {
    fetch(`/api/rainbow/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function loadEbayPrices() {
    setEbayLoading(true)
    try {
      const res = await fetch(`/api/rainbow/${id}?ebay=1`)
      const d = await res.json()
      setData(d)
    } finally {
      setEbayLoading(false)
    }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto p-4 py-16 text-center text-gray-400">Loading rainbow…</div>
  )
  if (!data || data.error) return (
    <div className="max-w-3xl mx-auto p-4 py-16 text-center text-red-400">Rainbow not found.</div>
  )

  const { parallels, stats } = data
  const hasEbayPrices = parallels.some(p => !p.owned && p.ebayPrice != null)
  const displayedParallels = showMissing ? parallels.filter(p => !p.owned) : parallels

  // Group by tier
  const tiers = [...new Set(parallels.map(p => p.tier))].sort((a, b) => a - b)

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link href="/tools/rainbow" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">← Rainbow Tracker</Link>
        <h1 className="text-2xl font-black leading-tight">{data.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{data.player} · #{data.cardNumber} · {data.year} {data.brand} {data.set}</p>
      </div>

      {/* Progress hero */}
      <div className="bg-gradient-to-br from-[#0f1b35] to-[#1a2d5a] text-white rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-4xl font-black">{stats.owned}<span className="text-xl text-blue-300 font-normal"> / {stats.total}</span></p>
            <p className="text-blue-300 text-sm mt-0.5">parallels collected</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-yellow-400">{stats.pct}%</p>
            <p className="text-blue-300 text-sm">{stats.missing} still needed</p>
          </div>
        </div>
        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${stats.pct}%`,
              background: 'linear-gradient(90deg, #a855f7, #ec4899, #f97316, #eab308)',
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setShowMissing(false)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${!showMissing ? 'bg-[#0f1b35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setShowMissing(true)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${showMissing ? 'bg-[#0f1b35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Missing ({stats.missing})
          </button>
        </div>

        {!hasEbayPrices && (
          <button
            onClick={loadEbayPrices}
            disabled={ebayLoading}
            className="px-4 py-1.5 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {ebayLoading ? '⏳ Loading…' : '💰 Load eBay Prices'}
          </button>
        )}
        {hasEbayPrices && (
          <span className="text-xs text-green-600 font-bold">✓ eBay prices loaded</span>
        )}
      </div>

      {/* Parallel grid — grouped by tier */}
      {tiers.map(tier => {
        const tierCards = displayedParallels.filter(p => p.tier === tier)
        if (tierCards.length === 0) return null
        return (
          <div key={tier} className="mb-6">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 border-b pb-1.5">
              {TIER_LABELS[tier] || `Tier ${tier}`}
            </p>
            <div className="flex flex-wrap gap-3">
              {tierCards.map(p => (
                <ParallelCard key={p.id} p={p} onClick={setSelected} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div className="mt-6 flex gap-4 text-xs text-gray-400 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Owned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-300 inline-block" /> Missing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300 inline-block text-center text-[8px] leading-3">E</span> Box exclusive
        </span>
      </div>

      {selected && <DetailModal parallel={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
