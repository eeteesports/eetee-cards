'use client'
import { useState } from 'react'
import Link from 'next/link'

// Fields that the bulk re-identify pass should fill in
const NEW_FIELDS = ['League', 'Team', 'Rookie', 'Numbered', 'Print Run']

export default function AdminPage() {
  const [mode, setMode] = useState(null) // 'identify' | 'value'
  const [cards, setCards] = useState([])
  const [processed, setProcessed] = useState([])
  const [current, setCurrent] = useState(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState([])

  function addLog(msg, type = 'info') {
    setLog((prev) => [...prev, { msg, type, ts: Date.now() }])
  }

  async function loadCards() {
    addLog('Fetching all cards from Airtable...')
    const res = await fetch('/api/cards?all=true')
    const data = await res.json()
    const records = data.records || []
    addLog(`Found ${records.length} cards.`, 'success')
    return records
  }

  // ── Bulk Re-identify ──────────────────────────────────────────────
  async function runBulkIdentify() {
    setRunning(true)
    setDone(false)
    setLog([])
    setProcessed([])

    const records = await loadCards()
    setCards(records)

    // Filter to cards that have a front image but are missing new fields
    const targets = records.filter((c) => {
      const f = c.fields
      return f['Front Image URL'] && (!f['League'] || !f['Team'])
    })

    addLog(`${targets.length} cards need updating (missing League or Team).`)

    let updatedCount = 0
    for (let i = 0; i < targets.length; i++) {
      const card = targets[i]
      const f = card.fields
      setCurrent({ index: i + 1, total: targets.length, player: f['Player'] || 'Unknown' })

      try {
        // Call identify with front + back images
        const res = await fetch('/api/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: f['Front Image URL'],
            backImageUrl: f['Back Image URL'] || undefined,
          }),
        })
        if (!res.ok) throw new Error('Identify failed')
        const data = await res.json()

        // Build patch payload — only set fields that AI returned and are currently blank
        const patch = {}
        if (data.league && !f['League'])      patch['League']     = data.league
        if (data.team && !f['Team'])          patch['Team']       = data.team
        if (data.rookie !== undefined && f['Rookie'] === undefined) patch['Rookie'] = Boolean(data.rookie)
        if (data.numbered !== undefined && f['Numbered'] === undefined) patch['Numbered'] = Boolean(data.numbered)
        if (data.printRun && !f['Print Run']) patch['Print Run']  = Number(data.printRun)
        // Also fill card number if missing
        if (data.cardNumber && !f['Card Number']) patch['Card Number'] = data.cardNumber

        if (Object.keys(patch).length === 0) {
          addLog(`→ ${f['Player']}: already complete, skipped`)
          setProcessed((p) => [...p, { id: card.id, player: f['Player'], status: 'skipped', patch: {} }])
          continue
        }

        // PATCH Airtable
        const patchRes = await fetch(`/api/cards?id=${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: card.id, ...patch }),
        })
        if (!patchRes.ok) throw new Error('Patch failed')

        updatedCount++
        addLog(`✓ ${f['Player']}: updated ${Object.keys(patch).join(', ')}`, 'success')
        setProcessed((p) => [...p, { id: card.id, player: f['Player'], status: 'updated', patch }])
      } catch (err) {
        addLog(`✗ ${f['Player']}: ${err.message}`, 'error')
        setProcessed((p) => [...p, { id: card.id, player: f['Player'], status: 'error', patch: {} }])
      }

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 800))
    }

    addLog(`Done! Updated ${updatedCount} of ${targets.length} cards.`, 'success')
    setCurrent(null)
    setRunning(false)
    setDone(true)
  }

  // ── Bulk Value Estimation ─────────────────────────────────────────
  async function runBulkValue() {
    setRunning(true)
    setDone(false)
    setLog([])
    setProcessed([])

    const records = await loadCards()
    setCards(records)

    // Filter to cards without an estimated value
    const targets = records.filter((c) => !c.fields['Estimated Value'])
    addLog(`${targets.length} cards need value estimates.`)

    let updatedCount = 0
    for (let i = 0; i < targets.length; i++) {
      const card = targets[i]
      const f = card.fields
      setCurrent({ index: i + 1, total: targets.length, player: f['Player'] || 'Unknown' })

      try {
        const res = await fetch('/api/value', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player: f['Player'],
            year: f['Year'],
            brand: f['Brand'],
            set: f['Set'],
            parallel: f['Parallel / Variant'],
            condition: f['Condition'],
            rookie: f['Rookie'],
            numbered: f['Numbered'],
            printRun: f['Print Run'],
            sport: f['Sport'],
            league: f['League'],
            team: f['Team'],
            cardNumber: f['Card Number'],
          }),
        })
        if (!res.ok) throw new Error('Value API failed')
        const data = await res.json()

        if (!data.estimatedValue) {
          addLog(`→ ${f['Player']}: AI couldn't estimate (${data.notes || 'insufficient data'})`, 'warn')
          setProcessed((p) => [...p, { id: card.id, player: f['Player'], status: 'skipped', patch: {} }])
          continue
        }

        const patchRes = await fetch(`/api/cards?id=${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: card.id, 'Estimated Value': data.estimatedValue }),
        })
        if (!patchRes.ok) throw new Error('Patch failed')

        updatedCount++
        addLog(`✓ ${f['Player']}: $${data.estimatedValue} (${data.confidence} confidence, ${data.trend})`, 'success')
        setProcessed((p) => [...p, { id: card.id, player: f['Player'], status: 'updated', patch: { value: data.estimatedValue } }])
      } catch (err) {
        addLog(`✗ ${f['Player']}: ${err.message}`, 'error')
        setProcessed((p) => [...p, { id: card.id, player: f['Player'], status: 'error', patch: {} }])
      }

      await new Promise((r) => setTimeout(r, 1000))
    }

    addLog(`Done! Estimated values for ${updatedCount} cards.`, 'success')
    setCurrent(null)
    setRunning(false)
    setDone(true)
  }

  const progress = current ? Math.round((current.index / current.total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-black uppercase tracking-widest">Admin Tools</h1>
      </div>

      {/* Tool selector */}
      {!mode && !running && (
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">Select a batch operation to run on your collection.</p>

          <button
            onClick={() => { setMode('identify'); runBulkIdentify() }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl text-left transition-colors"
          >
            <div className="font-black text-lg">🔍 Bulk Re-Identify Cards</div>
            <div className="text-blue-200 text-sm mt-1">
              Re-runs AI identification on all cards missing League, Team, Rookie, or Numbered fields. Uses front (and back) images from Cloudinary.
            </div>
          </button>

          <button
            onClick={() => { setMode('value'); runBulkValue() }}
            className="w-full bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl text-left transition-colors"
          >
            <div className="font-black text-lg">💰 Bulk Estimate Card Values</div>
            <div className="text-green-200 text-sm mt-1">
              Uses AI to estimate market value for all cards that don't have an Estimated Value set. Based on Claude's market knowledge.
            </div>
          </button>
        </div>
      )}

      {/* Progress */}
      {running && current && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-gray-800">{current.player}</p>
            <p className="text-sm text-gray-500">{current.index} / {current.total}</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{progress}% complete</p>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-gray-950 rounded-2xl p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-0.5">
          {log.map((entry, i) => (
            <div
              key={i}
              className={
                entry.type === 'success' ? 'text-green-400'
                : entry.type === 'error' ? 'text-red-400'
                : entry.type === 'warn' ? 'text-yellow-400'
                : 'text-gray-400'
              }
            >
              {entry.msg}
            </div>
          ))}
          {running && <div className="text-blue-400 animate-pulse">Running...</div>}
        </div>
      )}

      {/* Summary */}
      {done && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {['updated', 'skipped', 'error'].map((status) => {
            const count = processed.filter((p) => p.status === status).length
            return (
              <div key={status} className={`rounded-xl p-3 text-center ${
                status === 'updated' ? 'bg-green-50 border border-green-200'
                : status === 'error' ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200'
              }`}>
                <p className="text-2xl font-black">{count}</p>
                <p className="text-xs text-gray-500 capitalize">{status}</p>
              </div>
            )
          })}
        </div>
      )}

      {done && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setMode(null); setDone(false); setLog([]); setProcessed([]) }}
            className="flex-1 border border-gray-300 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50"
          >
            Run Another Tool
          </button>
          <Link href="/" className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold text-center hover:bg-blue-700">
            View Dashboard →
          </Link>
        </div>
      )}
    </div>
  )
}
