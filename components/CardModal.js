'use client'
import { useEffect, useState } from 'react'

// Apply Cloudinary trim+pad transformation so card fills frame cleanly
function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_800/')
}

const SPORTS = ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'Other']
const LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'MLS', 'Other']
const ALL_TAGS = ['Refractor', 'Auto', 'Patch', 'Short Print', 'Prizm']
const BRANDS = ['Panini', 'Topps', 'Upper Deck', 'Bowman', 'Fleer', 'Score', 'Leaf', 'Donruss', 'SkyBox', 'O-Pee-Chee', 'Pacific', 'Playoff', 'Pro Set', 'Stadium Club', 'SP', 'Other']
const CONDITIONS = [
  'Raw - Mint', 'Raw - Near Mint', 'Raw - Excellent', 'Raw - Good', 'Raw - Poor',
  'PSA 6', 'PSA 7', 'PSA 8', 'PSA 9', 'PSA 10',
  'BGS 8', 'BGS 9', 'BGS 9.5', 'BGS 10',
  'SGC 8', 'SGC 9', 'SGC 10',
]

export default function CardModal({ card, onClose, onRefresh }) {
  const f = card.fields
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    'Player': f['Player'] || '',
    'Year': f['Year']?.toString() || '',
    'Brand': f['Brand'] || '',
    'Set': f['Set'] || '',
    'Card Number': f['Card Number'] || '',
    'Parallel / Variant': f['Parallel / Variant'] || '',
    'Sport': f['Sport'] || '',
    'League': f['League'] || '',
    'Team': f['Team'] || '',
    'Tags': f['Tags'] || [],
    'Serial Number': f['Serial Number'] || '',
    'Rookie': f['Rookie'] || false,
    'Numbered': f['Numbered'] || false,
    'Print Run': f['Print Run']?.toString() || '',
    'Condition': f['Condition'] || '',
    'Cost Paid': f['Cost Paid']?.toString() || '',
    'Estimated Value': f['Estimated Value']?.toString() || '',
    'PSA 8 Value': f['PSA 8 Value']?.toString() || '',
    'PSA 9 Value': f['PSA 9 Value']?.toString() || '',
    'PSA 10 Value': f['PSA 10 Value']?.toString() || '',
    'For Sale': f['For Sale'] || false,
    'Asking Price': f['Asking Price']?.toString() || '',
    'Notes': f['Notes'] || '',
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
        'Player': form['Player'],
        'Year': form['Year'] ? Number(form['Year']) : undefined,
        'Brand': form['Brand'],
        'Set': form['Set'],
        'Card Number': form['Card Number'],
        'Parallel / Variant': form['Parallel / Variant'],
        'Sport': form['Sport'],
        'League': form['League'],
        'Team': form['Team'],
        'Tags': form['Tags'],
        'Serial Number': form['Serial Number'],
        'Rookie': form['Rookie'],
        'Numbered': form['Numbered'],
        'Print Run': form['Print Run'] ? Number(form['Print Run']) : undefined,
        'Condition': form['Condition'],
        'Cost Paid': form['Cost Paid'] ? parseFloat(form['Cost Paid']) : undefined,
        'Estimated Value': form['Estimated Value'] ? parseFloat(form['Estimated Value']) : undefined,
        'PSA 8 Value': form['PSA 8 Value'] ? parseFloat(form['PSA 8 Value']) : undefined,
        'PSA 9 Value': form['PSA 9 Value'] ? parseFloat(form['PSA 9 Value']) : undefined,
        'PSA 10 Value': form['PSA 10 Value'] ? parseFloat(form['PSA 10 Value']) : undefined,
        'For Sale': form['For Sale'],
        'Asking Price': form['Asking Price'] ? parseFloat(form['Asking Price']) : undefined,
        'Notes': form['Notes'],
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
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving…' : '✓ Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setError('') }}
                  className="text-gray-500 text-sm px-3 py-1.5 rounded-lg border border-gray-200"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-semibold text-blue-600 border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50"
              >
                ✏️ Edit
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none font-light">
            ×
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Images */}
        <div className="px-5 pt-4 flex gap-3">
          {f['Front Image URL'] ? (
            <img
              src={cardImg(f['Front Image URL'])}
              alt={f.Player}
              className={`rounded-xl object-cover ${f['Back Image URL'] ? 'w-1/2 aspect-[3/4]' : 'w-full aspect-[3/4]'}`}
            />
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
              <EField label="Team" value={form['Team']} onChange={(v) => set('Team', v)} placeholder="e.g. Los Angeles Lakers" />
              <EField label="Serial Number" value={form['Serial Number']} onChange={(v) => set('Serial Number', v)} placeholder="45/99" />

              <div>
                <ELabel>Sport</ELabel>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {SPORTS.map((s) => (
                    <EPill key={s} active={form['Sport'] === s} onClick={() => set('Sport', s)}>{s}</EPill>
                  ))}
                </div>
              </div>

              <div>
                <ELabel>League</ELabel>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {LEAGUES.map((l) => (
                    <EPill key={l} active={form['League'] === l} onClick={() => set('League', l)}>{l}</EPill>
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
                  {ALL_TAGS.map((t) => (
                    <EPill key={t} active={form['Tags'].includes(t)} color="yellow" onClick={() => toggleTag(t)}>{t}</EPill>
                  ))}
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
            <>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">{f.Player}</h2>
                <p className="text-gray-500 mt-0.5">
                  {[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {f.Sport && <Chip color="blue">{f.Sport}</Chip>}
                {f.League && <Chip color="blue">{f.League}</Chip>}
                {f.Team && <Chip color="gray">{f.Team}</Chip>}
                {f.Rookie && <Chip color="yellow">⭐ Rookie</Chip>}
                {f.Numbered && <Chip color="orange">🔢 {f['Print Run'] ? `/${f['Print Run']}` : 'Numbered'}</Chip>}
                {f.Condition && <Chip color="green">{f.Condition}</Chip>}
                {f['Card Number'] && <Chip color="gray">#{f['Card Number']}</Chip>}
                {f['Parallel / Variant'] && <Chip color="purple">{f['Parallel / Variant']}</Chip>}
                {f['Serial Number'] && <Chip color="orange">{f['Serial Number']}</Chip>}
                {f.Tags?.map((t) => <Chip key={t} color="gray">{t}</Chip>)}
              </div>

              {(f['Cost Paid'] != null || f['Estimated Value'] != null) && (
                <div className="grid grid-cols-2 gap-3">
                  {f['Cost Paid'] != null && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Cost</p>
                      <p className="font-bold text-xl mt-0.5">${Number(f['Cost Paid']).toLocaleString()}</p>
                    </div>
                  )}
                  {f['Estimated Value'] != null && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Value</p>
                      <p className={`font-bold text-xl mt-0.5 ${gain != null && gain > 0 ? 'text-green-600' : gain != null && gain < 0 ? 'text-red-500' : ''}`}>
                        ${Number(f['Estimated Value']).toLocaleString()}
                      </p>
                      {gain != null && (
                        <p className={`text-xs font-medium ${gain >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {gain >= 0 ? '+' : ''}${gain.toLocaleString()} gain
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(f['PSA 8 Value'] || f['PSA 9 Value'] || f['PSA 10 Value']) && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Graded Values</p>
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

              {f['For Sale'] && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-700 font-semibold text-sm uppercase tracking-wide">Listed for Sale</p>
                  {f['Asking Price'] && (
                    <p className="text-2xl font-black text-green-700 mt-0.5">
                      ${Number(f['Asking Price']).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

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
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    teal: 'bg-teal-100 text-teal-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    gray: 'bg-gray-100 text-gray-700',
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
