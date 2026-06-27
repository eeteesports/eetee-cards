'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_80/')
}

export default function LotCalculatorPage() {
  // ── Collection cards ──────────────────────────────────────────────
  const [collection, setCollection] = useState([])
  const [loadingCollection, setLoadingCollection] = useState(true)
  const [collectionSearch, setCollectionSearch] = useState('')

  // ── Lot ──────────────────────────────────────────────────────────
  const [lotCards, setLotCards] = useState([]) // { id, source:'collection'|'manual', name, value, img? }
  const [manualName, setManualName] = useState('')
  const [manualValue, setManualValue] = useState('')

  // ── Results ──────────────────────────────────────────────────────
  const [dealType, setDealType] = useState('sell') // 'sell' | 'buy'
  const [discountPct, setDiscountPct] = useState(30)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    fetch('/api/cards?all=true')
      .then((r) => r.json())
      .then((d) => { setCollection(d.records || []); setLoadingCollection(false) })
  }, [])

  // ── Derived ──────────────────────────────────────────────────────
  const filteredCollection = collection.filter((c) => {
    const name = (c.fields['Player'] || '').toLowerCase()
    const set  = (c.fields['Set'] || '').toLowerCase()
    const q    = collectionSearch.toLowerCase()
    return !q || name.includes(q) || set.includes(q)
  })

  const alreadyInLot = new Set(lotCards.map((c) => c.id))

  function addFromCollection(card) {
    const f = card.fields
    setLotCards((prev) => [
      ...prev,
      {
        id: card.id,
        source: 'collection',
        name: `${f['Player']}${f['Year'] ? ` (${f['Year']})` : ''}${f['Set'] ? ` ${f['Set']}` : ''}`,
        value: f['Estimated Value'] || f['Asking Price'] || null,
        img: f['Front Image URL'] || null,
        forSale: f['For Sale'] || false,
        asking: f['Asking Price'] || null,
      },
    ])
  }

  function addManual() {
    if (!manualName.trim()) return
    setLotCards((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        source: 'manual',
        name: manualName.trim(),
        value: manualValue ? parseFloat(manualValue) : null,
        img: null,
      },
    ])
    setManualName('')
    setManualValue('')
  }

  function removeCard(id) {
    setLotCards((prev) => prev.filter((c) => c.id !== id))
  }

  function updateValue(id, val) {
    setLotCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value: val === '' ? null : parseFloat(val) } : c))
    )
  }

  const cardsWithValue  = lotCards.filter((c) => c.value != null && !isNaN(c.value))
  const cardsNoValue    = lotCards.filter((c) => c.value == null || isNaN(c.value))
  const totalValue      = cardsWithValue.reduce((s, c) => s + c.value, 0)
  const discountedValue = totalValue * (1 - discountPct / 100)

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/tools" className="text-gray-400 hover:text-gray-700 text-sm">← Tools</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-black uppercase tracking-widest">📦 Lot Value Calculator</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Build a lot from your collection or enter cards manually. Get total value, and a suggested buy/sell price with discount.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* ── Left: Add Cards ── */}
        <div className="space-y-4">
          {/* From collection */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="font-black text-sm uppercase tracking-wide mb-2">From Your Collection</p>
            <input
              type="text"
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              placeholder="Search player or set..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400"
            />
            {loadingCollection ? (
              <p className="text-gray-400 text-sm text-center py-4">Loading collection...</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {filteredCollection.slice(0, 30).map((card) => {
                  const f = card.fields
                  const inLot = alreadyInLot.has(card.id)
                  return (
                    <button
                      key={card.id}
                      onClick={() => !inLot && addFromCollection(card)}
                      disabled={inLot}
                      className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-colors ${
                        inLot
                          ? 'bg-green-50 border border-green-200 cursor-default'
                          : 'hover:bg-blue-50 border border-transparent hover:border-blue-200'
                      }`}
                    >
                      {f['Front Image URL'] ? (
                        <img src={cardImg(f['Front Image URL'])} alt="" className="w-8 aspect-[3/4] object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-8 aspect-[3/4] bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-xs">🃏</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{f['Player']}</p>
                        <p className="text-xs text-gray-400 truncate">{[f['Year'], f['Set']].filter(Boolean).join(' · ')}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {f['Estimated Value'] ? (
                          <p className="text-xs font-bold text-gray-700">${Number(f['Estimated Value']).toLocaleString()}</p>
                        ) : (
                          <p className="text-xs text-gray-300">—</p>
                        )}
                        {inLot && <p className="text-xs text-green-600 font-bold">✓ Added</p>}
                      </div>
                    </button>
                  )
                })}
                {filteredCollection.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">No cards match your search.</p>
                )}
                {filteredCollection.length > 30 && (
                  <p className="text-xs text-gray-400 text-center pt-1">Showing 30 of {filteredCollection.length} — search to narrow down</p>
                )}
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="font-black text-sm uppercase tracking-wide mb-2">Add Card Manually</p>
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManual()}
              placeholder="Card description..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addManual()}
                  placeholder="Value (optional)"
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <button
                onClick={addManual}
                disabled={!manualName.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Lot summary ── */}
        <div className="space-y-4">
          {/* Lot list */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-black text-sm uppercase tracking-wide">Your Lot ({lotCards.length})</p>
              {lotCards.length > 0 && (
                <button onClick={() => setLotCards([])} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
              )}
            </div>

            {lotCards.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Add cards from your collection or enter manually ←</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {lotCards.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                    {c.img ? (
                      <img src={cardImg(c.img)} alt="" className="w-7 aspect-[3/4] object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-7 aspect-[3/4] bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-xs">🃏</div>
                    )}
                    <p className="text-xs text-gray-700 flex-1 min-w-0 truncate">{c.name}</p>
                    <div className="relative flex-shrink-0 w-20">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        value={c.value ?? ''}
                        onChange={(e) => updateValue(c.id, e.target.value)}
                        placeholder="?"
                        className="w-full border border-gray-200 rounded-lg pl-5 pr-1 py-1 text-xs focus:outline-none focus:border-blue-400 bg-white"
                      />
                    </div>
                    <button onClick={() => removeCard(c.id)} className="text-gray-300 hover:text-red-400 text-base flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}

            {cardsNoValue.length > 0 && lotCards.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ {cardsNoValue.length} card{cardsNoValue.length > 1 ? 's' : ''} missing value — enter manually or run Bulk Estimate on your collection
              </p>
            )}
          </div>

          {/* Calculation */}
          {lotCards.length > 0 && (
            <div className="bg-[#0f1b35] text-white rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Total Estimated Value</p>
                <p className="text-4xl font-black mt-0.5">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                <p className="text-blue-300 text-xs mt-0.5">{cardsWithValue.length} of {lotCards.length} cards valued</p>
              </div>

              {/* Deal type */}
              <div>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">I am:</p>
                <div className="flex gap-2">
                  {[{ v: 'sell', label: '💰 Selling this lot' }, { v: 'buy', label: '🛒 Buying this lot' }].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setDealType(v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                        dealType === v ? 'bg-white text-[#0f1b35]' : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">
                    {dealType === 'sell' ? 'Lot Discount' : 'Target Discount'}
                  </p>
                  <p className="text-white text-xs font-bold">{discountPct}% off</p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={70}
                  step={5}
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Number(e.target.value))}
                  className="w-full accent-blue-400"
                />
                <div className="flex justify-between text-xs text-blue-300/60 mt-0.5">
                  <span>0%</span><span>35%</span><span>70%</span>
                </div>
              </div>

              {/* Result */}
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-blue-200 text-xs uppercase font-bold tracking-wider">
                  {dealType === 'sell' ? 'Suggested Lot Price' : 'Max You Should Pay'}
                </p>
                <p className="text-3xl font-black mt-0.5 text-green-300">
                  ${discountedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-blue-300 text-xs mt-0.5">
                  {discountPct}% below the ${totalValue.toLocaleString()} total value
                </p>
              </div>

              {/* Presets */}
              <div>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1.5">Quick Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Wholesale (60% off)', pct: 60 },
                    { label: 'Dealer (40% off)', pct: 40 },
                    { label: 'Collector (25% off)', pct: 25 },
                    { label: 'Near-retail (10% off)', pct: 10 },
                  ].map(({ label, pct }) => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPct(pct)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                        discountPct === pct ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-200 hover:bg-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
