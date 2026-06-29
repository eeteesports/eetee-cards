'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'

const TREND_ICON  = { rising: '↑', falling: '↓', stable: '→', unknown: '–' }
const TREND_COLOR = { rising: 'text-green-300', falling: 'text-red-300', stable: 'text-blue-300', unknown: 'text-gray-400' }

async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'eetee-cards-unsigned')
  const res  = await fetch('https://api.cloudinary.com/v1_1/dgfukcdmz/image/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!data.secure_url) throw new Error('Upload failed')
  return data.secure_url
}

export default function AppraisePage() {
  const [mode, setMode]           = useState('search') // 'search' | 'photo'
  const [query, setQuery]         = useState('')
  const [frontSrc, setFrontSrc]   = useState(null)
  const [backSrc, setBackSrc]     = useState(null)
  const [frontFile, setFrontFile] = useState(null)
  const [backFile, setBackFile]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const frontRef = useRef(null)
  const backRef  = useRef(null)

  function handleFront(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFrontFile(file)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setFrontSrc(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleBack(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBackFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setBackSrc(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function appraise() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let body

      if (mode === 'photo') {
        if (!frontFile) throw new Error('Please add a front photo')
        const [frontUrl, backUrl] = await Promise.all([
          uploadToCloudinary(frontFile),
          backFile ? uploadToCloudinary(backFile) : Promise.resolve(null),
        ])
        body = { frontImageUrl: frontUrl, backImageUrl: backUrl }
      } else {
        if (!query.trim()) throw new Error('Please enter a card description')
        body = { query: query.trim() }
      }

      const res  = await fetch('/api/appraise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Appraisal failed')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFrontSrc(null); setBackSrc(null)
    setFrontFile(null); setBackFile(null)
    setResult(null); setError(null)
    setQuery('')
  }

  const canSubmit = mode === 'search' ? query.trim().length > 0 : !!frontFile

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/tools" className="text-gray-400 hover:text-gray-700 text-sm">← Tools</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-black uppercase tracking-widest">🔎 Card Appraiser</h1>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Search by keyword or snap a photo — get recent eBay sold prices and an AI value estimate instantly.
      </p>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
        {[
          { key: 'search', label: '⌨️ Search by Text' },
          { key: 'photo',  label: '📷 Snap a Photo'  },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setResult(null); setError(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!result && (
        <>
          {/* Search input */}
          {mode === 'search' && (
            <div className="mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canSubmit && !loading && appraise()}
                placeholder="e.g. 2025 Patrick Mahomes Select, 1986 Fleer Jordan RC PSA 9…"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1.5 px-1">
                Include year, player, set, parallel, or grade for best results
              </p>
            </div>
          )}

          {/* Photo inputs */}
          {mode === 'photo' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">Front *</p>
                <div
                  onClick={() => frontRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors aspect-[3/4] flex flex-col items-center justify-center ${
                    frontSrc ? 'border-blue-300' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {frontSrc
                    ? <img src={frontSrc} alt="Front" className="max-h-full object-contain rounded-lg" />
                    : <><span className="text-3xl">🃏</span><p className="text-xs text-gray-400 mt-1">Tap to add</p></>
                  }
                </div>
                <input ref={frontRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFront} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">Back (optional)</p>
                <div
                  onClick={() => backRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors aspect-[3/4] flex flex-col items-center justify-center ${
                    backSrc ? 'border-blue-300' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  {backSrc
                    ? <img src={backSrc} alt="Back" className="max-h-full object-contain rounded-lg" />
                    : <><span className="text-3xl">🔄</span><p className="text-xs text-gray-400 mt-1">Tap to add</p></>
                  }
                </div>
                <input ref={backRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleBack} />
              </div>
            </div>
          )}

          <button
            onClick={appraise}
            disabled={!canSubmit || loading}
            className="w-full bg-[#0f1b35] text-white py-4 rounded-2xl font-black uppercase tracking-wide disabled:opacity-40 hover:bg-blue-900 transition-colors"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === 'photo' ? 'Identifying & searching eBay…' : 'Searching eBay…'}
                </span>
              : '🔎 Appraise This Card'
            }
          </button>
        </>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
          <button onClick={reset} className="block mt-2 text-red-400 underline text-xs">Try again</button>
        </div>
      )}

      {result && (
        <div className="space-y-4 mt-2">
          {/* Photo thumbnails (photo mode only) */}
          {result.mode === 'photo' && (frontSrc || backSrc) && (
            <div className={`grid gap-3 ${backSrc ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {frontSrc && <img src={frontSrc} alt="Front" className="rounded-2xl object-contain border border-gray-200 max-h-64 w-full" />}
              {backSrc  && <img src={backSrc}  alt="Back"  className="rounded-2xl object-contain border border-gray-200 max-h-64 w-full" />}
            </div>
          )}

          {/* Value hero */}
          <div className="bg-[#0f1b35] text-white rounded-2xl p-5">
            <div className="flex items-start justify-between mb-1">
              <p className="text-blue-300 text-xs font-black uppercase tracking-widest">Estimated Value</p>
              {result.sourceLabel && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  result.sourceLabel.includes('eBay')
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {result.sourceLabel}
                </span>
              )}
            </div>
            {result.estimatedValue ? (
              <>
                <p className="text-5xl font-black mt-1">${Number(result.estimatedValue).toLocaleString()}</p>
                {(result.valueLow || result.valueHigh || result.low || result.high) && (
                  <p className="text-blue-300 text-sm mt-0.5">
                    Range: ${(result.valueLow ?? result.low)?.toLocaleString()} – ${(result.valueHigh ?? result.high)?.toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-black mt-1 text-gray-400">Value unknown</p>
            )}
            <div className="flex gap-3 mt-2 flex-wrap">
              {result.trend && result.trend !== 'unknown' && (
                <span className={`text-sm font-bold ${TREND_COLOR[result.trend]}`}>
                  {TREND_ICON[result.trend]} {result.trend}
                </span>
              )}
              {result.confidence && (
                <span className="text-blue-400 text-xs self-end">Confidence: {result.confidence}</span>
              )}
            </div>
            {result.notes && (
              <p className="text-blue-200 text-xs mt-3 leading-relaxed border-t border-white/10 pt-3">{result.notes}</p>
            )}
          </div>

          {/* eBay Recent Sales */}
          {result.sales?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="font-black text-sm uppercase tracking-wide">
                  📦 eBay Recent Sales
                </p>
                <span className="text-xs text-gray-400">
                  {result.sales.length} sold · avg ${result.stats?.avg?.toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {result.sales.map((sale, i) => (
                  <a
                    key={i}
                    href={sale.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                        {sale.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{sale.date}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900 text-sm">${sale.price.toFixed(2)}</p>
                      {sale.url && <p className="text-xs text-blue-400 group-hover:underline">View →</p>}
                    </div>
                  </a>
                ))}
              </div>
              {result.ebayKeywords && (
                <p className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                  Searched: "{result.ebayKeywords}"
                </p>
              )}
            </div>
          )}

          {result.sales?.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="text-sm text-yellow-800 font-semibold">No recent eBay sales found</p>
              <p className="text-xs text-yellow-600 mt-1">
                Try different keywords — less specific often works better (e.g. drop parallel or condition).
              </p>
            </div>
          )}

          {/* Card identity (photo mode) */}
          {result.mode === 'photo' && result.player && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="font-black text-sm uppercase tracking-wide mb-3">Card Identification</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  ['Player',   result.player],
                  ['Year',     result.year],
                  ['Brand',    result.brand],
                  ['Set',      result.set],
                  ['Parallel', result.parallel],
                  ['Sport',    result.sport],
                  ['League',   result.league],
                  ['Team',     result.team],
                  ['Card #',   result.cardNumber],
                  ['Condition',result.condition],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-semibold text-gray-800">{val}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {result.rookie   && <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">RC</span>}
                {result.numbered && <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">{result.printRun ? `/${result.printRun}` : 'Numbered'}</span>}
              </div>
            </div>
          )}

          {/* Grading note */}
          {result.worthGrading && result.gradingNote && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="font-black text-xs uppercase tracking-wide text-green-700 mb-1">🏅 Worth Grading</p>
              <p className="text-sm text-green-800">{result.gradingNote}</p>
            </div>
          )}

          <button onClick={reset} className="w-full border border-gray-200 text-gray-500 py-3 rounded-2xl text-sm hover:bg-gray-50 transition-colors">
            ← Appraise another card
          </button>
        </div>
      )}
    </div>
  )
}
