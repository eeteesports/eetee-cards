'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { TEAMS_BY_LEAGUE } from '@/app/add/teams'
import CardBadges from '@/components/CardBadges'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_800/')
}

const SPORTS = ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'Other']
const LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'MLS', 'NCAA Football', 'NCAA Basketball', 'Other']
const ALL_TAGS = ['Refractor', 'Auto', 'Patch', 'Short Print', 'Prizm']
const BRANDS = ['Panini', 'Topps', 'Upper Deck', 'Bowman', 'Fleer', 'Score', 'Leaf', 'Donruss', 'SkyBox', 'O-Pee-Chee', 'Pacific', 'Playoff', 'Pro Set', 'Stadium Club', 'SP', 'Other']
const CONDITIONS = [
  'Raw - Mint', 'Raw - Near Mint', 'Raw - Excellent', 'Raw - Good', 'Raw - Poor',
  'PSA 6', 'PSA 7', 'PSA 8', 'PSA 9', 'PSA 10',
  'BGS 8', 'BGS 9', 'BGS 9.5', 'BGS 10',
  'SGC 8', 'SGC 9', 'SGC 10',
]

const CENTERING_GRADE_COLOR = {
  '10': 'text-green-700 bg-green-50 border-green-200',
  '9':  'text-green-700 bg-green-50 border-green-200',
  '8':  'text-blue-700 bg-blue-50 border-blue-200',
  '7':  'text-yellow-700 bg-yellow-50 border-yellow-200',
  '6':  'text-orange-700 bg-orange-50 border-orange-200',
  '5':  'text-red-700 bg-red-50 border-red-200',
}

import { formatPrice } from '@/lib/format'

export default function CardModal({ card, onClose, onRefresh, publicView = true }) {
  const f = card.fields
  const { add, remove, items } = useCart()
  const inCart = items.some((i) => i.id === card.id)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [centeringLoading, setCenteringLoading] = useState(false)
  const [refreshingValue, setRefreshingValue] = useState(false)
  const [zoomedImage, setZoomedImage] = useState(null) // { url, alt } — raw, untransformed source for close inspection
  const [valueSource, setValueSource] = useState(f['Value Notes'] ? null : null)

  const [form, setForm] = useState({
    'Player':             f['Player'] || '',
    'Year':               f['Year']?.toString() || '',
    'Brand':              f['Brand'] || '',
    'Set':                f['Set'] || '',
    'Card Number':        f['Card Number'] || '',
    'Parallel / Variant': f['Parallel / Variant'] || '',
    'Sport':              f['Sport'] || '',
    'League':             f['League'] || '',
    'Team':               f['Team'] || '',
    'Tags':               f['Tags'] || [],
    'Serial Number':      f['Serial Number'] || '',
    'Rookie':             f['Rookie'] || false,
    'Numbered':           f['Numbered'] || false,
    'Print Run':          f['Print Run']?.toString() || '',
    'Condition':          f['Condition'] || '',
    'Cost Paid':          f['Cost Paid']?.toString() || '',
    'Estimated Value':    f['Estimated Value']?.toString() || '',
    'PSA 8 Value':        f['PSA 8 Value']?.toString() || '',
    'PSA 9 Value':        f['PSA 9 Value']?.toString() || '',
    'PSA 10 Value':       f['PSA 10 Value']?.toString() || '',
    'For Sale':           f['For Sale'] || false,
    'Asking Price':       f['Asking Price']?.toString() || '',
    'Notes':              f['Notes'] || '',
    'Centering L/R':      f['Centering L/R'] || '',
    'Centering T/B':      f['Centering T/B'] || '',
    'Centering Grade':    f['Centering Grade'] || '',
    'Value Notes':        f['Value Notes'] || '',
  })

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }))
  // Attributes shown as one combined line in the details table — Rookie,
  // Auto (from Tags), Serial Number, and print-run numbering all live in
  // different underlying fields, but Evan wants them read together.
  const attributes = [
    f.Rookie && 'Rookie',
    f.Tags?.includes('Auto') && 'Auto',
    f.Tags?.includes('Patch') && 'Patch',
    f['Serial Number'] && `Serial #${f['Serial Number']}`,
    f.Numbered && !f['Serial Number'] && (f['Print Run'] ? `Numbered /${f['Print Run']}` : 'Numbered'),
  ].filter(Boolean)
  const toggleTag = (tag) =>
    setForm((p) => ({
      ...p,
      'Tags': p['Tags'].includes(tag)
        ? p['Tags'].filter((t) => t !== tag)
        : [...p['Tags'], tag],
    }))

  // Inline estValue here so gain can use it (estValue is also declared below for the render)
  const _estValue = form['Estimated Value'] ? parseFloat(form['Estimated Value']) : f['Estimated Value']
  const gain = (_estValue != null && f['Cost Paid'] != null)
    ? _estValue - (parseFloat(form['Cost Paid']) || f['Cost Paid'] || 0)
    : null

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (zoomedImage) setZoomedImage(null)
      else onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, zoomedImage])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const fields = {
        'Player':             form['Player'],
        'Year':               form['Year'] ? Number(form['Year']) : undefined,
        'Brand':              form['Brand'],
        'Set':                form['Set'],
        'Card Number':        form['Card Number'],
        'Parallel / Variant': form['Parallel / Variant'],
        'Sport':              form['Sport'],
        'League':             form['League'],
        'Team':               form['Team'],
        'Tags':               form['Tags'],
        'Serial Number':      form['Serial Number'],
        'Rookie':             form['Rookie'],
        'Numbered':           form['Numbered'],
        'Print Run':          form['Print Run'] ? Number(form['Print Run']) : undefined,
        'Condition':          form['Condition'],
        'Cost Paid':          form['Cost Paid'] ? parseFloat(form['Cost Paid']) : undefined,
        'Estimated Value':    form['Estimated Value'] ? parseFloat(form['Estimated Value']) : undefined,
        'PSA 8 Value':        form['PSA 8 Value'] ? parseFloat(form['PSA 8 Value']) : undefined,
        'PSA 9 Value':        form['PSA 9 Value'] ? parseFloat(form['PSA 9 Value']) : undefined,
        'PSA 10 Value':       form['PSA 10 Value'] ? parseFloat(form['PSA 10 Value']) : undefined,
        'For Sale':           form['For Sale'],
        'Asking Price':       form['Asking Price'] ? parseFloat(form['Asking Price']) : undefined,
        'Notes':              form['Notes'],
        'Centering L/R':      form['Centering L/R'] || undefined,
        'Centering T/B':      form['Centering T/B'] || undefined,
        'Centering Grade':    form['Centering Grade'] || undefined,
        'Value Notes':        form['Value Notes'] || undefined,
      }
      for (const k of Object.keys(fields)) {
        if (fields[k] === undefined || fields[k] === '') delete fields[k]
      }
      const res = await fetch(`/api/cards?id=${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, ...fields }),
      })
      if (!res.ok) throw new Error('Save failed')
      setEditing(false)
      if (onRefresh) onRefresh()
    } catch {
      setError('Could not save — please try again.')
    }
    setSaving(false)
  }

  async function runCentering() {
    const imageUrl = f['Front Image URL']
    if (!imageUrl) return
    setCenteringLoading(true)
    try {
      const res = await fetch('/api/centering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })
      const data = await res.json()
      if (!data.error) {
        const lr = data.leftRightRatio || ''
        const tb = data.topBottomRatio || ''
        const gr = data.grade?.toString() || ''
        // Update local state immediately so UI reflects result even if PATCH partially fails
        setForm((p) => ({ ...p, 'Centering L/R': lr, 'Centering T/B': tb, 'Centering Grade': gr }))
        // Save each new field separately — Airtable rejects unknown fields,
        // so we isolate failures so one missing field doesn't block the others
        for (const [fieldName, value] of [['Centering L/R', lr], ['Centering T/B', tb], ['Centering Grade', gr]]) {
          if (value) {
            await fetch(`/api/cards?id=${card.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: card.id, [fieldName]: value }),
            }).catch(() => {})
          }
        }
        if (onRefresh) onRefresh()
      }
    } catch {}
    setCenteringLoading(false)
  }

  async function refreshValue() {
    setRefreshingValue(true)
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
      const data = await res.json()
      if (data.estimatedValue) {
        // Save Estimated Value (confirmed field)
        await fetch(`/api/cards?id=${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: card.id, 'Estimated Value': data.estimatedValue }),
        })
        // Try Value Notes separately — non-fatal if field doesn't exist yet
        if (data.notes) {
          await fetch(`/api/cards?id=${card.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: card.id, 'Value Notes': data.notes }),
          }).catch(() => {})
        }
        setForm((p) => ({
          ...p,
          'Estimated Value': data.estimatedValue.toString(),
          'Value Notes': data.notes || '',
        }))
        setValueSource(data.sourceLabel || null)
        if (onRefresh) onRefresh()
      }
    } catch {}
    setRefreshingValue(false)
  }

  // Always read live values from form (form is initialized from f, so defaults match;
  // but runCentering/refreshValue update form immediately so view mode reflects results)
  const centeringGrade = form['Centering Grade']
  const centeringLR    = form['Centering L/R']
  const centeringTB    = form['Centering T/B']
  const valueNotes     = form['Value Notes']
  const estValue       = _estValue
  const centeringColors = CENTERING_GRADE_COLOR[centeringGrade] || 'text-gray-600 bg-gray-50 border-gray-200'

  return (
    <>
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-t-2xl md:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pt-3 px-4 pb-2 border-b border-gray-100">
          <div className="flex gap-2">
            {!publicView && (
              editing ? (
                <>
                  <button onClick={handleSave} disabled={saving}
                    className="bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg disabled:opacity-50">
                    {saving ? 'Saving…' : '✓ Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setError('') }}
                    className="text-gray-500 text-sm px-3 py-1.5 rounded-lg border border-gray-200">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="text-sm font-semibold text-blue-600 border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50">
                  ✏️ Edit
                </button>
              )
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none font-light">×</button>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        {/* Images — sized by each photo's own natural aspect ratio (fixed
            height, auto width, object-contain), not forced into a portrait
            box. Some card backs are shot/scanned landscape (stat blocks) —
            a forced aspect-[3/4] + object-cover was cropping real content
            off the sides. No rounding either: corner sharpness is real
            grading signal a rounded crop would misrepresent. */}
        <div className="px-5 pt-4 flex flex-wrap gap-4 justify-center">
          {f['Front Image URL'] ? (
            <div className="relative cursor-zoom-in group" onClick={() => setZoomedImage({ url: f['Front Image URL'], alt: f.Player })}>
              <CardBadges fields={f} />
              <img src={cardImg(f['Front Image URL'])} alt={f.Player}
                className="h-64 w-auto max-w-full object-contain border border-gray-200" />
              <ZoomHint />
            </div>
          ) : (
            <div className="h-64 w-48 bg-gray-100 flex items-center justify-center text-gray-400">
              <div className="text-center"><span className="text-5xl block">🃏</span><span className="text-sm mt-2 block">No Image</span></div>
            </div>
          )}
          {f['Back Image URL'] && (
            <div className="relative cursor-zoom-in group" onClick={() => setZoomedImage({ url: f['Back Image URL'], alt: `${f.Player} — back` })}>
              <img src={cardImg(f['Back Image URL'])} alt="Back" className="h-64 w-auto max-w-full object-contain border border-gray-200" />
              <ZoomHint />
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 -mt-1 mb-1">Tap a photo to zoom in — check corners and surface</p>

        <div className="p-5 space-y-4">
          {editing && !publicView ? (
            /* ── EDIT MODE ── */
            <div className="space-y-3">
              <EField label="Player" value={form['Player']} onChange={(v) => set('Player', v)} />
              <div className="grid grid-cols-2 gap-3">
                <EField label="Year" value={form['Year']} onChange={(v) => set('Year', v)} type="number" />
                <EField label="Card #" value={form['Card Number']} onChange={(v) => set('Card Number', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <ELabel>Brand</ELabel>
                  <select value={form['Brand']} onChange={(e) => set('Brand', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    <option value="">Select…</option>
                    {BRANDS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <EField label="Set" value={form['Set']} onChange={(v) => set('Set', v)} />
              </div>
              <EField label="Parallel / Variant" value={form['Parallel / Variant']} onChange={(v) => set('Parallel / Variant', v)} placeholder="Silver Prizm, Gold…" />

              <div>
                <ELabel>Team</ELabel>
                {TEAMS_BY_LEAGUE[form['League']] ? (
                  <select value={form['Team']} onChange={(e) => set('Team', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    <option value="">Select team…</option>
                    {form['Team'] && !TEAMS_BY_LEAGUE[form['League']].includes(form['Team']) && (
                      <option value={form['Team']}>{form['Team']}</option>
                    )}
                    {TEAMS_BY_LEAGUE[form['League']].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form['Team']} onChange={(e) => set('Team', e.target.value)}
                    placeholder="e.g. Los Angeles Lakers"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
                )}
              </div>

              <EField label="Serial Number" value={form['Serial Number']} onChange={(v) => set('Serial Number', v)} placeholder="45/99" />

              <div>
                <ELabel>Sport</ELabel>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {SPORTS.map((s) => <EPill key={s} active={form['Sport'] === s} onClick={() => set('Sport', s)}>{s}</EPill>)}
                </div>
              </div>
              <div>
                <ELabel>League</ELabel>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {LEAGUES.map((l) => (
                    <EPill key={l} active={form['League'] === l} onClick={() => {
                      set('League', l)
                      if (TEAMS_BY_LEAGUE[l] && !TEAMS_BY_LEAGUE[l].includes(form['Team'])) set('Team', '')
                    }}>{l}</EPill>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <label className="flex items-center gap-2 flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-3 cursor-pointer">
                  <input type="checkbox" checked={form['Rookie']} onChange={(e) => set('Rookie', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                  <span className="text-yellow-800 font-semibold text-sm">⭐ Rookie</span>
                </label>
                <label className="flex items-center gap-2 flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 cursor-pointer">
                  <input type="checkbox" checked={form['Numbered']} onChange={(e) => set('Numbered', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                  <span className="text-orange-800 font-semibold text-sm">🔢 Numbered</span>
                </label>
              </div>
              {form['Numbered'] && (
                <EField label="Print Run" value={form['Print Run']} onChange={(v) => set('Print Run', v)} type="number" placeholder="e.g. 99" />
              )}

              <div>
                <ELabel>Tags</ELabel>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_TAGS.map((t) => <EPill key={t} active={form['Tags'].includes(t)} color="yellow" onClick={() => toggleTag(t)}>{t}</EPill>)}
                </div>
              </div>

              <div>
                <ELabel>Condition</ELabel>
                <select value={form['Condition']} onChange={(e) => set('Condition', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="">Select condition…</option>
                  {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <EField label="Cost Paid ($)" value={form['Cost Paid']} onChange={(v) => set('Cost Paid', v)} type="number" placeholder="0.00" />
                <EField label="Est. Value ($)" value={form['Estimated Value']} onChange={(v) => set('Estimated Value', v)} type="number" placeholder="0.00" />
              </div>

              <div>
                <ELabel>Graded Values</ELabel>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <EField label="PSA 8 $" value={form['PSA 8 Value']} onChange={(v) => set('PSA 8 Value', v)} type="number" placeholder="—" />
                  <EField label="PSA 9 $" value={form['PSA 9 Value']} onChange={(v) => set('PSA 9 Value', v)} type="number" placeholder="—" />
                  <EField label="PSA 10 $" value={form['PSA 10 Value']} onChange={(v) => set('PSA 10 Value', v)} type="number" placeholder="—" />
                </div>
              </div>

              {/* Centering in edit mode */}
              <div>
                <ELabel>Centering</ELabel>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <EField label="L/R ratio" value={form['Centering L/R']} onChange={(v) => set('Centering L/R', v)} placeholder="60/40" />
                  <EField label="T/B ratio" value={form['Centering T/B']} onChange={(v) => set('Centering T/B', v)} placeholder="55/45" />
                  <EField label="Grade" value={form['Centering Grade']} onChange={(v) => set('Centering Grade', v)} placeholder="9" />
                </div>
              </div>

              <div>
                <ELabel>Value Notes</ELabel>
                <textarea value={form['Value Notes']} onChange={(e) => set('Value Notes', e.target.value)}
                  placeholder="AI reasoning behind estimated value..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm h-16 resize-none focus:outline-none focus:border-blue-400" />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                <input type="checkbox" id="forSaleEdit" checked={form['For Sale']}
                  onChange={(e) => set('For Sale', e.target.checked)} className="w-4 h-4 accent-green-600" />
                <label htmlFor="forSaleEdit" className="text-green-800 font-semibold text-sm flex-1 cursor-pointer">List for Sale</label>
                {form['For Sale'] && (
                  <input type="number" value={form['Asking Price']} onChange={(e) => set('Asking Price', e.target.value)}
                    placeholder="Asking $" className="border border-green-300 rounded-lg px-2 py-1 text-sm w-28 focus:outline-none bg-white" />
                )}
              </div>

              <div>
                <ELabel>Notes</ELabel>
                <textarea value={form['Notes']} onChange={(e) => set('Notes', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm h-16 resize-none focus:outline-none focus:border-blue-400" />
              </div>
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <>
              {/* Listing title — player-name-first, matches how these get listed */}
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight leading-snug">
                  {f.Player}
                  {(f.Year || f.Brand || f.Set) && (
                    <span className="text-gray-500 font-bold normal-case"> — {[f.Year, f.Brand, f.Set].filter(Boolean).join(' ')}</span>
                  )}
                  {f['Parallel / Variant'] && <span className="text-purple-600 font-bold normal-case"> {f['Parallel / Variant']}</span>}
                </h2>
              </div>

              {/* Details table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {f.Team && <DetailRow label="Team" value={f.Team} />}
                    {f.Year && <DetailRow label="Year" value={f.Year} />}
                    {f.League && <DetailRow label="League" value={f.League} />}
                    {(f['Card Name'] || f.Player) && <DetailRow label="Card Name" value={f['Card Name'] || f.Player} />}
                    {f['Parallel / Variant'] && <DetailRow label="Parallel Type" value={f['Parallel / Variant']} />}
                    {attributes.length > 0 && <DetailRow label="Attributes" value={attributes.join(', ')} />}
                    {f.Condition && <DetailRow label="Condition" value={f.Condition} />}
                  </tbody>
                </table>
              </div>

              {/* Value — Cost Paid is Evan's own cost basis, never shown to buyers */}
              {!publicView && (f['Cost Paid'] != null || estValue != null) && (
                <div className="space-y-2">
                  <div className={`grid gap-3 ${f['Cost Paid'] != null && estValue != null ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {f['Cost Paid'] != null && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Cost Paid</p>
                        <p className="font-bold text-xl mt-0.5">${Number(f['Cost Paid']).toLocaleString()}</p>
                      </div>
                    )}
                    {estValue != null && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide flex items-center justify-between gap-1">
                          <span>Est. Value</span>
                          <button onClick={refreshValue} disabled={refreshingValue} title="Refresh AI estimate"
                            className="text-blue-400 hover:text-blue-600 disabled:opacity-40 text-base leading-none">
                            {refreshingValue ? '⟳' : '🔄'}
                          </button>
                        </p>
                        <p className={`font-bold text-xl mt-0.5 ${gain != null && gain > 0 ? 'text-green-600' : gain != null && gain < 0 ? 'text-red-500' : ''}`}>
                          ${Number(estValue).toLocaleString()}
                        </p>
                        {gain != null && (
                          <p className={`text-xs font-medium ${gain >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                            {gain >= 0 ? '+' : ''}${gain.toLocaleString()} vs. cost
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Value reasoning */}
                  {valueNotes && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Why this value</p>
                        {valueSource && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            valueSource.includes('eBay')
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {valueSource}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed">{valueNotes}</p>
                    </div>
                  )}
                  {estValue != null && !valueNotes && (
                    <button onClick={refreshValue} disabled={refreshingValue}
                      className="text-xs text-blue-500 hover:text-blue-700 underline disabled:opacity-40">
                      {refreshingValue ? 'Getting reasoning...' : 'Get value reasoning from AI →'}
                    </button>
                  )}
                </div>
              )}

              {/* Graded values — admin reference only, not shown to buyers */}
              {!publicView && (f['PSA 8 Value'] || f['PSA 9 Value'] || f['PSA 10 Value']) && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Graded Value Estimates</p>
                  <div className="grid grid-cols-3 gap-2">
                    {f['PSA 8 Value'] && (
                      <div className="bg-green-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-500">PSA 8</p>
                        <p className="font-bold text-sm">${Number(f['PSA 8 Value']).toLocaleString()}</p>
                      </div>
                    )}
                    {f['PSA 9 Value'] && (
                      <div className="bg-teal-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-500">PSA 9</p>
                        <p className="font-bold text-sm">${Number(f['PSA 9 Value']).toLocaleString()}</p>
                      </div>
                    )}
                    {f['PSA 10 Value'] && (
                      <div className="bg-blue-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-gray-500">PSA 10</p>
                        <p className="font-bold text-sm">${Number(f['PSA 10 Value']).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Centering — internal grading-prep tool, never shown to buyers */}
              {!publicView && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Card Centering</p>
                  {centeringGrade ? (
                    <div className={`border-2 rounded-xl p-3 flex items-center gap-3 ${centeringColors}`}>
                      <div className="text-center flex-shrink-0">
                        <p className="text-3xl font-black">{centeringGrade}</p>
                        <p className="text-xs font-bold uppercase opacity-70">Grade</p>
                      </div>
                      <div className="space-y-0.5">
                        {centeringLR && <p className="text-sm font-bold">Left / Right: <span className="font-black">{centeringLR}</span></p>}
                        {centeringTB && <p className="text-sm font-bold">Top / Bottom: <span className="font-black">{centeringTB}</span></p>}
                      </div>
                      <button onClick={runCentering} disabled={centeringLoading || !f['Front Image URL']}
                        title="Re-run centering analysis"
                        className="ml-auto text-xs border border-current px-2 py-1 rounded-lg opacity-60 hover:opacity-100 disabled:opacity-30 flex-shrink-0">
                        {centeringLoading ? '🔍' : '↻ Re-run'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 flex items-center gap-3">
                      <p className="text-sm text-gray-400 flex-1">No centering data yet</p>
                      {f['Front Image URL'] && (
                        <button onClick={runCentering} disabled={centeringLoading}
                          className="text-xs font-bold px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex-shrink-0">
                          {centeringLoading ? '🔍 Analyzing...' : '📐 Run Analysis'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* For sale */}
              {f['For Sale'] && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-green-700 font-semibold text-sm uppercase tracking-wide">Listed for Sale</p>
                      {f['Asking Price'] != null && (
                        <p className="text-2xl font-black text-green-700 mt-0.5">{formatPrice(f['Asking Price'])}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {f['Asking Price'] == null ? (
                      <a href={`mailto:eeteecards@gmail.com?subject=${encodeURIComponent(`Pricing for ${f.Player || 'a card'}`)}`}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-center bg-white border border-green-300 text-green-700 hover:bg-green-50 transition-colors">
                        ✉️ Contact for Pricing
                      </a>
                    ) : (
                      <button
                        onClick={() => inCart ? remove(card.id) : add(card)}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                          inCart ? 'bg-green-200 text-green-800 hover:bg-red-100 hover:text-red-700' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {inCart ? '✓ In Cart — Remove?' : '🛒 Add to Cart'}
                      </button>
                    )}
                    {inCart && (
                      <Link href="/cart" onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-center bg-navy-900 text-white hover:bg-navy-800 transition-colors">
                        View Cart & Checkout →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {f.Notes && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{f.Notes}</p>
                </div>
              )}

              {f['Date Added'] && (
                <p className="text-xs text-gray-400 text-right">Added {f['Date Added']}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {/* Zoom lightbox — raw, untransformed image (no Cloudinary crop/pad)
        so corners and surface show at full fidelity, not a thumbnail. */}
    {zoomedImage && (
      <div
        className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-zoom-out"
        onClick={() => setZoomedImage(null)}
      >
        <button
          onClick={() => setZoomedImage(null)}
          className="absolute top-4 right-4 text-white/70 hover:text-white text-4xl leading-none font-light"
        >
          ×
        </button>
        <img
          src={zoomedImage.url}
          alt={zoomedImage.alt}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>
  )
}

function ZoomHint() {
  return (
    <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      🔍
    </span>
  )
}

function DetailRow({ label, value }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide align-top w-1/3 bg-gray-50">{label}</td>
      <td className="px-3 py-2 text-gray-800 font-medium">{value}</td>
    </tr>
  )
}

function Chip({ children, color = 'gray' }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-800',
    green:  'bg-green-100 text-green-800',
    teal:   'bg-teal-100 text-teal-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray:   'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`text-sm font-medium px-3 py-1 rounded-full ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

function ELabel({ children }) {
  return <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</label>
}

function EField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <ELabel>{label}</ELabel>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )
}

function EPill({ children, active, onClick, color = 'blue' }) {
  const activeClass = color === 'yellow'
    ? 'bg-yellow-400 text-yellow-900 font-semibold'
    : 'bg-blue-600 text-white font-semibold'
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors ${active ? activeClass : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}
