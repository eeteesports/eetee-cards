'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Hardcoded list of active rainbow chases — add new ones here as you start tracking them
const RAINBOWS = [
  { id: '2025-topps-chrome-gibbs-101', emoji: '🌈' },
]

export default function RainbowListPage() {
  const [rainbows, setRainbows] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all(
      RAINBOWS.map(({ id, emoji }) =>
        fetch(`/api/rainbow/${id}`)
          .then(r => r.json())
          .then(data => ({ ...data, emoji }))
          .catch(() => null)
      )
    ).then(results => {
      setRainbows(results.filter(Boolean))
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="mb-8">
        <Link href="/tools" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">← Tools</Link>
        <h1 className="text-3xl font-black uppercase tracking-widest">🌈 Rainbow Tracker</h1>
        <p className="text-gray-500 mt-1">Track your parallel rainbow chases and see what's still missing.</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading rainbows…</div>
      ) : rainbows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No rainbow chases tracked yet.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {rainbows.map(r => (
            <Link
              key={r.id}
              href={`/tools/rainbow/${r.id}`}
              className="block border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50/30 rounded-2xl p-5 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg leading-tight">{r.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{r.player} · {r.year} {r.brand} {r.set} #{r.cardNumber}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-black text-purple-600">{r.stats.owned}<span className="text-base text-gray-400 font-normal">/{r.stats.total}</span></p>
                  <p className="text-xs text-gray-400">{r.stats.pct}% complete</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${r.stats.pct}%`,
                    background: 'linear-gradient(90deg, #a855f7, #ec4899, #f97316)',
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{r.stats.missing} still needed</p>

              {/* Mini parallel dot strip */}
              <div className="flex gap-1 flex-wrap mt-3">
                {r.parallels.map(p => (
                  <span
                    key={p.id}
                    title={p.name + (p.printRun ? ` /${p.printRun}` : '')}
                    className="inline-block w-4 h-4 rounded-sm border border-white/50 shadow-sm"
                    style={{
                      background:  p.owned ? p.color : '#D1D5DB',
                      opacity:     p.owned ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
