'use client'
import { useState } from 'react'
import Link from 'next/link'

const DEAL_COLOR = (score) => {
  if (score >= 8) return { bg: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-100 text-green-800', label: 'Excellent Deal' }
  if (score >= 6) return { bg: 'bg-teal-500', text: 'text-teal-600', badge: 'bg-teal-100 text-teal-800', label: 'Good Deal' }
  if (score >= 4) return { bg: 'bg-yellow-400', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800', label: 'Fair Price' }
  return { bg: 'bg-red-400', text: 'text-red-500', badge: 'bg-red-100 text-red-800', label: 'Overpriced' }
}

export default function ScoutPage() {
  const [mode, setMode] = useState('rate') // 'rate' | 'suggest'
  const [form, setForm] = useState({
    player: '', year: '', brand: '', set: '', parallel: '',
    condition: '', rookie: false, numbered: false, printRun: '', listPrice: '',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Suggest mode
  const [budget, setBudget] = useState('')
  const [sportPref, setSportPref] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [loadingSuggest, setLoadingSuggest] = useState(false)

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  async function rateDeal() {
    if (!form.player.trim()) { setError('Enter a player name.'); return }
    if (!form.listPrice) { setError('Enter the listed price.'); return }
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Get AI value estimate
      const valRes = await fetch('/api/value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const valData = await valRes.json()

      // Ask Claude to rate the deal
      const prompt = valData.estimatedValue
        ? `Card: ${valData.cardDesc || `${form.year} ${form.brand} ${form.set} ${form.player}`}
Estimated market value: $${valData.estimatedValue} (range: $${valData.low}–$${valData.high}, confidence: ${valData.confidence})
Listed price: $${form.listPrice}
Trend: ${valData.trend}

Rate this deal 1–10 and explain why.`
        : `Card: ${form.year || ''} ${form.brand || ''} ${form.set || ''} ${form.player}${form.parallel ? ` (${form.parallel})` : ''}${form.condition ? ', ' + form.condition : ''}
Listed price: $${form.listPrice}

Without a confident market value estimate, rate this deal 1–10 based on the listed price relative to typical prices for similar cards, and explain your reasoning.`

      const rateRes = await fetch('/api/scout-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, listPrice: parseFloat(form.listPrice), valData }),
      })
      const rateData = await rateRes.json()
      setResult({ valData, rateData, listPrice: parseFloat(form.listPrice) })
    } catch (err) {
      setError('Something went wrong — please try again.')
    }
    setLoading(false)
  }

  async function getSuggestions() {
    setLoadingSuggest(true)
    setSuggestions(null)
    try {
      const res = await fetch('/api/scout-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: parseFloat(budget) || null, sport: sportPref }),
      })
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch {
      setSuggestions([])
    }
    setLoadingSuggest(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-black uppercase tracking-widest">🔭 Buying Assistant</h1>
      </div>

      {/* eBay API notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-5 flex gap-2 items-start">
        <span className="text-blue-400 mt-0.5 flex-shrink-0">ℹ️</span>
        <p className="text-blue-700 text-sm">
          eBay API approval pending — real-time deal scanning coming soon. For now, use the Deal Rater to evaluate any card you find, or get AI-powered buying suggestions.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="bg-gray-100 rounded-2xl p-1 flex mb-6">
        {[
          { id: 'rate', label: '⚖️ Rate a Deal' },
          { id: 'suggest', label: '💡 Get Suggestions' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setResult(null); setSuggestions(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Rate a Deal ── */}
      {mode === 'rate' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Found a card on eBay, COMC, or elsewhere? Enter the details and listed price — we'll estimate fair market value and score the deal 1–10.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <SField label="Player *" value={form.player} onChange={(v) => set('player', v)} placeholder="e.g. LeBron James" />
            <div className="grid grid-cols-2 gap-3">
              <SField label="Year" value={form.year} onChange={(v) => set('year', v)} placeholder="2003" />
              <SField label="Brand" value={form.brand} onChange={(v) => set('brand', v)} placeholder="Topps" />
            </div>
            <SField label="Set / Product" value={form.set} onChange={(v) => set('set', v)} placeholder="Chrome, Prizm, etc." />
            <SField label="Parallel / Variant" value={form.parallel} onChange={(v) => set('parallel', v)} placeholder="Refractor, Gold, etc." />
            <SField label="Condition / Grade" value={form.condition} onChange={(v) => set('condition', v)} placeholder="PSA 9, Raw - NM, etc." />

            <div className="flex gap-3">
              <label className="flex items-center gap-2 flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 cursor-pointer">
                <input type="checkbox" checked={form.rookie} onChange={(e) => set('rookie', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                <span className="text-yellow-800 font-semibold text-sm">⭐ Rookie</span>
              </label>
              <label className="flex items-center gap-2 flex-1 bg-orange-50 border border-orange-200 rounded-xl p-2.5 cursor-pointer">
                <input type="checkbox" checked={form.numbered} onChange={(e) => set('numbered', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-orange-800 font-semibold text-sm">🔢 Numbered</span>
              </label>
            </div>
            {form.numbered && (
              <SField label="Print Run" value={form.printRun} onChange={(v) => set('printRun', v)} placeholder="e.g. 99" type="number" />
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Listed Price *</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={form.listPrice}
                  onChange={(e) => set('listPrice', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-blue-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white font-bold text-gray-900"
                />
              </div>
            </div>
          </div>

          <button
            onClick={rateDeal}
            disabled={loading}
            className="w-full bg-[#0f1b35] hover:bg-blue-900 text-white py-4 rounded-2xl font-black text-base disabled:opacity-50 transition-colors"
          >
            {loading ? '🔍 Analyzing deal...' : '⚖️ Rate This Deal'}
          </button>

          {/* Result */}
          {result && (
            <DealResult result={result} />
          )}
        </div>
      )}

      {/* ── Get Suggestions ── */}
      {mode === 'suggest' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Tell us your budget and interests, and our AI will suggest specific cards worth hunting for right now based on value, demand, and market trends.
          </p>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Budget (per card)</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sport / League Preference (optional)</label>
              <input
                type="text"
                value={sportPref}
                onChange={(e) => setSportPref(e.target.value)}
                placeholder="e.g. NBA, NFL rookies, NCAA Basketball..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <button
            onClick={getSuggestions}
            disabled={loadingSuggest}
            className="w-full bg-[#0f1b35] hover:bg-blue-900 text-white py-4 rounded-2xl font-black text-base disabled:opacity-50 transition-colors"
          >
            {loadingSuggest ? '💡 Thinking...' : '💡 Get Buying Suggestions'}
          </button>

          {suggestions && suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-black text-base uppercase tracking-wide">AI Recommendations</h3>
              {suggestions.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-black text-gray-900">{s.card}</h4>
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded-lg flex-shrink-0">
                      ~${s.estimatedPrice}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{s.reason}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.tags?.map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {suggestions && suggestions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No suggestions returned — try adjusting your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DealResult({ result }) {
  const { valData, rateData, listPrice } = result
  const score = rateData?.score || 0
  const dc = DEAL_COLOR(score)
  const saving = valData?.estimatedValue ? valData.estimatedValue - listPrice : null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Score banner */}
      <div className={`${dc.bg} p-5 text-white text-center`}>
        <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Deal Score</p>
        <p className="text-7xl font-black leading-none">{score}</p>
        <p className="text-sm font-bold uppercase tracking-wider opacity-90 mt-1">/10 · {dc.label}</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Price breakdown */}
        {valData?.estimatedValue && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-400 font-medium">You'd Pay</p>
              <p className="text-xl font-black text-gray-900">${listPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Market Value</p>
              <p className="text-xl font-black text-gray-900">${valData.estimatedValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{saving >= 0 ? 'You Save' : 'Premium'}</p>
              <p className={`text-xl font-black ${saving >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {saving >= 0 ? '+' : ''}{saving !== null ? `$${Math.abs(saving).toLocaleString()}` : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Value range */}
        {valData?.low && valData?.high && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Market Range</p>
            <p className="text-sm font-semibold text-gray-700">
              ${valData.low.toLocaleString()} – ${valData.high.toLocaleString()}
              <span className="ml-2 text-xs text-gray-400">({valData.confidence} confidence)</span>
            </p>
          </div>
        )}

        {/* AI verdict */}
        {rateData?.verdict && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">AI Verdict</p>
            <p className="text-sm text-gray-700 leading-relaxed">{rateData.verdict}</p>
          </div>
        )}

        {/* Key factors */}
        {valData?.keyFactors?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Value Factors</p>
            <ul className="space-y-1">
              {valData.keyFactors.map((f, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-blue-400 flex-shrink-0">•</span>{f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trend */}
        {valData?.trend && valData.trend !== 'unknown' && (
          <div className={`text-sm font-semibold px-3 py-2 rounded-xl inline-block ${
            valData.trend === 'rising' ? 'bg-green-50 text-green-700' :
            valData.trend === 'falling' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
          }`}>
            {valData.trend === 'rising' ? '↑ Market trend: Rising' :
             valData.trend === 'falling' ? '↓ Market trend: Falling' : '→ Market trend: Stable'}
          </div>
        )}
      </div>
    </div>
  )
}

function SField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
      />
    </div>
  )
}
