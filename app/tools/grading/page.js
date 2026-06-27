'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const SCORE_COLOR = (s) => {
  if (s >= 8) return 'text-green-700 bg-green-50 border-green-300'
  if (s >= 6) return 'text-blue-700 bg-blue-50 border-blue-300'
  if (s >= 4) return 'text-yellow-700 bg-yellow-50 border-yellow-300'
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

const URGENCY_COLOR = {
  'Send now':             'text-green-700 bg-green-100',
  'Consider':             'text-blue-700 bg-blue-100',
  'Wait for right price': 'text-yellow-700 bg-yellow-100',
}

export default function GradingPage() {
  const [collection, setCollection]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [analyzing, setAnalyzing]     = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState(null)

  useEffect(() => {
    fetch('/api/cards?all=true')
      .then((r) => r.json())
      .then((d) => { setCollection(d.records || []); setLoading(false) })
  }, [])

  // Filter to un-graded cards only
  const ungradedCards = collection.filter((c) => !c.fields['Grade'])

  async function analyze() {
    setAnalyzing(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: ungradedCards }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/tools" className="text-gray-400 hover:text-gray-700 text-sm">← Tools</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-black uppercase tracking-widest">🏅 Grading Recommendations</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        AI analyzes your ungraded collection and ranks which cards are worth submitting to PSA or BGS based on ROI potential.
      </p>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading collection...</p>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black">{collection.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cards</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black">{ungradedCards.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ungraded</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black">{collection.length - ungradedCards.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Already Graded</p>
            </div>
          </div>

          {!result && (
            <button
              onClick={analyze}
              disabled={analyzing || ungradedCards.length === 0}
              className="w-full bg-[#0f1b35] text-white py-4 rounded-2xl font-black uppercase tracking-wide text-lg disabled:opacity-40 hover:bg-blue-900 transition-colors"
            >
              {analyzing
                ? '🤖 Analyzing collection...'
                : `🏅 Analyze ${ungradedCards.length} Ungraded Cards`}
            </button>
          )}

          {analyzing && (
            <div className="mt-6 text-center text-gray-500 text-sm">
              <div className="inline-block w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-2" />
              <p>Evaluating grading ROI for each card...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              {/* Summary */}
              {result.summary && (
                <div className="bg-[#0f1b35] text-white rounded-2xl p-5">
                  <p className="text-blue-300 text-xs font-black uppercase tracking-widest mb-1">Grading Strategy</p>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Rankings */}
              <p className="font-black text-sm uppercase tracking-wide text-gray-500">
                Top Cards to Grade ({result.rankings?.length || 0})
              </p>

              {result.rankings?.map((r, i) => (
                <div key={i} className={`border-2 rounded-2xl p-4 ${SCORE_COLOR(r.gradingScore)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl font-black">{r.gradingScore}/10</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${URGENCY_COLOR[r.urgency] || 'text-gray-600 bg-gray-100'}`}>
                          {r.urgency}
                        </span>
                        <span className="text-xs font-bold text-gray-500">{r.gradingService}</span>
                      </div>
                      <p className="font-black mt-1">{r.player}</p>
                      <p className="text-xs opacity-70">{r.cardDesc}</p>
                    </div>
                    {r.estimatedPSA10Value && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs opacity-60">PSA 10 est.</p>
                        <p className="text-lg font-black">${r.estimatedPSA10Value.toLocaleString()}</p>
                        {r.currentRawValue && (
                          <>
                            <p className="text-xs opacity-60 mt-1">Raw ~${r.currentRawValue}</p>
                            <p className="text-xs font-bold">{r.roi}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm mt-2 opacity-80">{r.reason}</p>
                </div>
              ))}

              <button
                onClick={() => setResult(null)}
                className="w-full border border-gray-200 text-gray-500 py-2 rounded-2xl text-sm hover:bg-gray-50 transition-colors"
              >
                Re-analyze
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
