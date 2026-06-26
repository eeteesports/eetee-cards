'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import CardTile from '@/components/CardTile'
import CardModal from '@/components/CardModal'

const SPORT_EMOJI = { Football: '🏈', Basketball: '🏀', Baseball: '⚾', Hockey: '🏒', Soccer: '⚽', Other: '🃏' }
const TREND_CONFIG = {
  rising: { label: '↑ Rising', color: 'text-green-600 bg-green-50' },
  falling: { label: '↓ Falling', color: 'text-red-500 bg-red-50' },
  stable:  { label: '→ Stable',  color: 'text-gray-600 bg-gray-100' },
  unknown: { label: '? Unknown', color: 'text-gray-400 bg-gray-50' },
}

export default function Dashboard() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [valueDetails, setValueDetails] = useState({}) // { cardId: { estimatedValue, trend, ... } }
  const [fetchingValue, setFetchingValue] = useState(null)

  useEffect(() => {
    fetch('/api/cards?all=true')
      .then((r) => r.json())
      .then((d) => { setCards(d.records || []); setLoading(false) })
  }, [])

  // ── Portfolio calculations ─────────────────────────────────────────
  const totalCards    = cards.length
  const cardsWithVal  = cards.filter((c) => c.fields['Estimated Value'])
  const totalValue    = cardsWithVal.reduce((s, c) => s + (c.fields['Estimated Value'] || 0), 0)
  const forSaleCards  = cards.filter((c) => c.fields['For Sale'])
  const forSaleValue  = forSaleCards.reduce((s, c) => s + (c.fields['Asking Price'] || 0), 0)
  const gradedCards   = cards.filter((c) => c.fields['Condition']?.match(/PSA|BGS|SGC/))
  const rookieCards   = cards.filter((c) => c.fields['Rookie'])
  const covPct        = totalCards ? Math.round((cardsWithVal.length / totalCards) * 100) : 0

  // Top cards by value
  const topCards = [...cards]
    .filter((c) => c.fields['Estimated Value'])
    .sort((a, b) => (b.fields['Estimated Value'] || 0) - (a.fields['Estimated Value'] || 0))
    .slice(0, 6)

  // Recent additions (last 5)
  const recentCards = cards.slice(0, 5)

  // Sport breakdown
  const sportBreakdown = cards.reduce((acc, c) => {
    const s = c.fields.Sport || 'Other'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const topSport = Object.entries(sportBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0]

  // League breakdown
  const leagueBreakdown = cards.reduce((acc, c) => {
    const l = c.fields.League || 'Unknown'
    acc[l] = (acc[l] || 0) + 1
    return acc
  }, {})

  // Value tiers
  const tiers = {
    'Under $10':   cards.filter((c) => c.fields['Estimated Value'] > 0 && c.fields['Estimated Value'] < 10).length,
    '$10–$50':     cards.filter((c) => c.fields['Estimated Value'] >= 10 && c.fields['Estimated Value'] < 50).length,
    '$50–$200':    cards.filter((c) => c.fields['Estimated Value'] >= 50 && c.fields['Estimated Value'] < 200).length,
    '$200+':       cards.filter((c) => c.fields['Estimated Value'] >= 200).length,
  }

  async function fetchValueForCard(card) {
    const f = card.fields
    setFetchingValue(card.id)
    try {
      const res = await fetch('/api/value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: f['Player'], year: f['Year'], brand: f['Brand'], set: f['Set'],
          parallel: f['Parallel / Variant'], condition: f['Condition'],
          rookie: f['Rookie'], numbered: f['Numbered'], printRun: f['Print Run'],
          sport: f['Sport'], league: f['League'], team: f['Team'], cardNumber: f['Card Number'],
        }),
      })
      const data = await res.json()
      setValueDetails((prev) => ({ ...prev, [card.id]: data }))
    } catch {}
    setFetchingValue(null)
  }

  return (
    <div className="pb-12">
      {/* ── Hero / Portfolio Value ── */}
      <div className="bg-gradient-to-br from-[#0f1b35] via-[#1a3a6b] to-[#0d2d5e] text-white m-4 rounded-2xl p-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute right-0 top-0 w-56 h-56 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
        <div className="absolute right-16 bottom-0 w-36 h-36 bg-blue-400/10 rounded-full translate-y-12" />
        <div className="absolute left-0 bottom-0 w-24 h-24 bg-blue-600/10 rounded-full translate-y-6 -translate-x-6" />

        <div className="relative z-10">
          <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">eetee Sports Portfolio</p>

          {loading ? (
            <div className="h-12 w-48 bg-white/10 rounded-xl animate-pulse mb-2" />
          ) : (
            <div className="flex items-end gap-3 mb-1">
              <h1 className="text-5xl font-black">
                ${totalValue > 0 ? totalValue.toLocaleString() : '—'}
              </h1>
              {totalValue === 0 && !loading && (
                <span className="text-blue-300 text-sm mb-2">Add estimated values to see portfolio total</span>
              )}
            </div>
          )}
          <p className="text-blue-200 text-sm mb-4">
            {loading ? '—' : `${totalCards} cards · ${covPct}% valued`}
          </p>

          <div className="flex gap-2 flex-wrap">
            <Link href="/collection"
              className="bg-white text-[#0f1b35] font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-50 transition-colors">
              Browse Collection
            </Link>
            <Link href="/store"
              className="border border-white/40 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors">
              🏷️ Storefront
            </Link>
            <Link href="/scout"
              className="border border-white/40 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors">
              🔭 Scout Deals
            </Link>
            <Link href="/add"
              className="bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-400 transition-colors">
              + Add Card
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 mb-4">
        <StatCard label="Total Cards" value={loading ? '—' : totalCards} icon="🃏" />
        <StatCard
          label="For Sale"
          value={loading ? '—' : forSaleCards.length}
          icon="🏷️"
          sub={forSaleValue > 0 ? `$${forSaleValue.toLocaleString()} asking` : null}
          subColor="text-green-600"
          href="/store"
        />
        <StatCard label="Rookie Cards" value={loading ? '—' : rookieCards.length} icon="⭐" />
        <StatCard label="Graded" value={loading ? '—' : gradedCards.length} icon="🏆" />
      </div>

      {/* ── Collection Breakdown ── */}
      {!loading && totalCards > 0 && (
        <div className="mx-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* By Sport */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">By Sport</p>
            <div className="space-y-2">
              {Object.entries(sportBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([sport, count]) => (
                  <Link key={sport} href={`/collection?sport=${encodeURIComponent(sport)}`} className="block group">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">{SPORT_EMOJI[sport] || '🃏'}</span>
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{sport}</span>
                      <span className="ml-auto text-sm font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round((count / totalCards) * 100)}%` }}
                      />
                    </div>
                  </Link>
                ))}
            </div>
          </div>

          {/* By Value Tier */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Value Distribution</p>
            {cardsWithVal.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">No value estimates yet.</p>
                <Link href="/admin" className="text-blue-600 text-sm font-semibold hover:underline mt-1 block">
                  Run bulk estimate →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(tiers).map(([tier, count]) => (
                  <div key={tier}>
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="text-gray-600">{tier}</span>
                      <span className="font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: cardsWithVal.length ? `${Math.round((count / cardsWithVal.length) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">
                  {cardsWithVal.length} of {totalCards} cards have estimates
                  {covPct < 100 && (
                    <Link href="/admin" className="text-blue-500 ml-1 hover:underline">
                      (fill in the rest →)
                    </Link>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Cards by Value ── */}
      {!loading && topCards.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-black text-base uppercase tracking-wide">🏆 Top Cards by Value</h2>
            <Link href="/collection" className="text-blue-600 text-sm font-semibold hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {topCards.map((card, idx) => {
              const f = card.fields
              const vd = valueDetails[card.id]
              return (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelected(card)}
                >
                  <span className="text-lg font-black text-gray-300 w-6 flex-shrink-0">#{idx + 1}</span>
                  {f['Front Image URL'] ? (
                    <img
                      src={f['Front Image URL'].replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_80/')}
                      alt={f.Player}
                      className="w-10 aspect-[3/4] object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🃏</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{f.Player}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}
                      {f.Rookie ? ' ⭐' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-gray-900">${Number(f['Estimated Value']).toLocaleString()}</p>
                    {vd?.trend && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TREND_CONFIG[vd.trend]?.color}`}>
                        {TREND_CONFIG[vd.trend]?.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent Additions ── */}
      {!loading && recentCards.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-black text-base uppercase tracking-wide">🆕 Recent Additions</h2>
            <Link href="/collection" className="text-blue-600 text-sm font-semibold hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {recentCards.map((card) => (
              <CardTile key={card.id} card={card} onClick={() => setSelected(card)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Admin quick-access ── */}
      <div className="mx-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Admin Tools</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            🔍 Bulk Re-Identify Cards
          </Link>
          <Link href="/admin" className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            💰 Bulk Estimate Values
          </Link>
          <Link href="/add" className="bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            + Add New Card
          </Link>
        </div>
      </div>

      {loading && (
        <div className="px-4 mt-4">
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
        </div>
      )}

      {!loading && totalCards === 0 && (
        <div className="mx-4 mt-4 text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-3">🃏</div>
          <p className="text-gray-500 mb-4">No cards yet — let's add your first one!</p>
          <Link href="/add" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700">
            Add Your First Card
          </Link>
        </div>
      )}

      {selected && (
        <CardModal
          card={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => fetch('/api/cards?all=true').then((r) => r.json()).then((d) => setCards(d.records || []))}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, sub, subColor, href }) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
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
  return href ? <Link href={href}>{content}</Link> : content
}
