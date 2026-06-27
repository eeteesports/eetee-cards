'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { TEAMS_BY_LEAGUE } from '@/app/add/teams'

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

export default function CardModal({ card, onClose, onRefresh }) {
  const f = card.fields
  const { add, remove, items } = useCart()
  const inCart = items.some((i) => i.id === card.id)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [centeringLoading, setCenteringLoading] = useState(false)
  const [refreshingValue, setRefreshingValue] = useState(false)

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
  const toggleTag = (tag) =>
    setForm((p) => ({
      ...p,
      'Tags': p['Tags'].includes(tag)
        ? p['Tags'].filter((t) => t !== tag)
        : [...p['Tags'], tag],
    }))

  const gain = editing
    ? (parseFloat(form['Estimated Value']) || 0) - (parseFloat(form['Cost Paid']) || 0)
    : f['Estimated Value'] && f['Cost Paid']
    ? f['Estimated Value'] - f['Cost Paid']
    : null

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

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
        // Immediately PATCH to Airtable
        await fetch(`/api/cards?id=${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: card.id, 'Centering L/R': lr, 'Centering T/B': tb, 'Centering Grade': gr }),
        })
        // Update local form too
        setForm((p) => ({ ...p, 'Centering L/R': lr, 'Centering T/B': tb, 'Centering Grade': gr }))
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
        await fetch(`/api/cards?id=${card.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: card.id,
            'Estimated Value': data.estimatedValue,
            'Value Notes': data.notes || '',
          }),
        })
        setForm((p) => ({
          ...p,
          'Estimated Value': data.estimatedValue.toString(),
          'Value Notes': data.notes || '',
        }))
        if (onRefresh) onRefresh()
      }
    } catch {}
    setRefreshingValue(false)
  }

  const centeringGrade = editing ? form['Centering Grade'] : f['Centering Grade']
  const centeringLR    = editing ? form['Centering L/R']   : f['Centering L/R']
  const centeringTB    = editing ? form['Centering T/B']   : f['Centering T/B']
  const valueNotes     = editing ? form['Value Notes']     : f['Value Notes']
  const centeringColors = CENTERING_GRADE_COLOR[centeringGrade] || 'text-gray-600 bg-gray-50 border-gray-200'

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pt-3 px-4 pb-2 border-b border-gray-100">
          <div className="flex gap-2">
            {editing ? (
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
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none font-light">×</button>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        {/* Images */}
        <div className="px-5 pt-4 flex gap-3">
          {f['Front Image URL'] ? (
            <img src={cardImg(f['Front Image URL'])} alt={f.Player}
              className={`rounded-xl object-cover ${f['Back Image URL'] ? 'w-1/2 aspect-[3/4]' : 'w-full aspect-[3/4]'}`} />
          ) : (
            <div className="w-full aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              <div className="text-center"><span className="text-5xl block">🃏</span><span className="text-sm mt-2 block">No Image</span></div>
            </div>
          )}
          {f['Back Image URL'] && (
            <img src={cardImg(f['Back Image URL'])} alt="Back" className="w-1/2 aspect-[3/4] rounded-xl object-cover" />
          )}
        </div>

        <div className="p-5 space-y-4">
          {editing ? (
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
              {/* Title */}
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">{f.Player}</h2>
                <p className="text-gray-500 mt-0.5">
                  {[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* All detail chips */}
              <div className="flex flex-wrap gap-2">
                {f.Sport    && <Chip color="blue">{f.Sport}</Chip>}
                {f.League   && <Chip color="blue">{f.League}</Chip>}
                {f.Team     && <Chip color="gray">{f.Team}</Chip>}
                {f['Parallel / Variant'] && <Chip color="purple">{f['Parallel / Variant']}</Chip>}
                {f.Rookie   && <Chip color="yellow">⭐ Rookie</Chip>}
                {f.Numbered && <Chip color="orange">🔢 {f['Print Run'] ? `/${f['Print Run']}` : 'Numbered'}</Chip>}
                {f['Serial Number'] && <Chip color="orange">{f['Serial Number']}</Chip>}
                {f.Condition && <Chip color="green">{f.Condition}</Chip>}
                {f['Card Number'] && <Chip color="gray">#{f['Card Number']}</Chip>}
                {f.Tags?.map((t) => <Chip key={t} color="gray">{t}</Chip>)}
              </div>

              {/* Value */}
              {(f['Cost Paid'] != null || f['Estimated Value'] != null) && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    {f['Cost Paid'] != null && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Cost Paid</p>
                        <p className="font-bold text-xl mt-0.5">${Number(f['Cost Paid']).toLocaleString()}</p>
                      </div>
                    )}
                    {f['Estimated Value'] != null && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide flex items-center justify-between gap-1">
                          <span>Est. Value</span>
                          <button onClick={refreshValue} disabled={refreshingValue} title="Refresh AI estimate"
                            className="text-blue-400 hover:text-blue-600 disabled:opacity-40 text-base leading-none">
                            {refreshingValue ? '⟳' : '🔄'}
                          </button>
                        </p>
                        <p className={`font-bold text-xl mt-0.5 ${gain != null && gain > 0 ? 'text-green-600' : gain != null && gain < 0 ? 'text-red-500' : ''}`}>
                          ${Number(f['Estimated Value']).toLocaleString()}
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
                  {(f['Value Notes'] || valueNotes) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">Why this value</p>
                      <p className="text-xs text-blue-900 leading-relaxed">{f['Value Notes'] || valueNotes}</p>
                    </div>
                  )}
                  {f['Estimated Value'] != null && !f['Value Notes'] && (
                    <button onClick={refreshValue} disabled={refreshingValue}
                      className="text-xs text-blue-500 hover:text-blue-700 underline disabled:opacity-40">
                      {refreshingValue ? 'Getting reasoning...' : 'Get value reasoning from AI →'}
                    </button>
                  )}
                </div>
              )}

              {/* Graded values */}
              {(f['PSA 8 Value'] || f['PSA 9 Value'] || f['PSA 10 Value']) && (
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

              {/* Centering */}
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

              {/* For sale */}
              {f['For Sale'] && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-green-700 font-semibold text-sm uppercase tracking-wide">Listed for Sale</p>
                      {f['Asking Price'] && (
                        <p className="text-2xl font-black text-green-700 mt-0.5">${Number(f['Asking Price']).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => inCart ? remove(card.id) : add(card)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                        inCart ? 'bg-green-200 text-green-800 hover:bg-red-100 hover:text-red-700' : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {inCart ? '✓ In Cart — Remove?' : '🛒 Add to Cart'}
                    </button>
                    {inCart && (
                      <Link href="/cart" onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-center bg-[#0f1b35] text-white hover:bg-blue-900 transition-colors">
                        View Cart & Offer →
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
