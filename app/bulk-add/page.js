'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS_BY_LEAGUE } from '@/app/add/teams'

// ── Constants ─────────────────────────────────────────────────────────────────
const LEAGUES   = ['NFL', 'NBA', 'MLB', 'NHL', 'MLS', 'NCAA Football', 'NCAA Basketball', 'Other']
const SPORTS    = ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'Other']
const BRANDS    = ['Panini', 'Topps', 'Upper Deck', 'Bowman', 'Fleer', 'Score', 'Leaf', 'Donruss', 'SkyBox', 'O-Pee-Chee', 'Pacific', 'Playoff', 'Pro Set', 'Stadium Club', 'SP', 'Other']
const CONDITIONS = [
  'Raw - Mint', 'Raw - Near Mint', 'Raw - Excellent', 'Raw - Good', 'Raw - Poor',
  'PSA 6', 'PSA 7', 'PSA 8', 'PSA 9', 'PSA 10',
  'BGS 8', 'BGS 9', 'BGS 9.5', 'BGS 10',
]
const CLOUD_NAME   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dgfukcdmz'
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'eetee-cards-unsigned'

function emptyFields(shared = {}) {
  return {
    player: '', year: shared.year || '', brand: shared.brand || '',
    set: shared.set || '', cardNumber: '', parallel: '',
    sport: shared.sport || '', league: shared.league || '',
    team: shared.team || '', rookie: false, numbered: false,
    printRun: '', serialNumber: '', condition: shared.condition || '',
    tags: [], notes: '', estimatedValue: '', costPaid: '',
    forSale: false, askingPrice: '',
  }
}

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', 'eetee-cards')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!data.secure_url) throw new Error('Upload failed')
  return data.secure_url
}

// ── Small UI helpers ──────────────────────────────────────────────────────────
function Label({ children }) {
  return <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</label>
}
function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )
}
function Pill({ children, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors ${active ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:     { label: 'Queued',      cls: 'bg-gray-100 text-gray-500' },
    uploading:   { label: 'Uploading…',  cls: 'bg-blue-100 text-blue-600 animate-pulse' },
    identifying: { label: 'AI…',         cls: 'bg-purple-100 text-purple-600 animate-pulse' },
    ready:       { label: '✓ Ready',     cls: 'bg-green-100 text-green-700' },
    error:       { label: '✗ Error',     cls: 'bg-red-100 text-red-600' },
    saved:       { label: '✓ Saved',     cls: 'bg-green-200 text-green-800' },
  }
  const { label, cls } = map[status] || map.pending
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BulkAddPage() {
  const router = useRouter()

  // Phase: 'type-select' | 'set-context' | 'shoot' | 'review' | 'saving' | 'done'
  const [phase, setPhase] = useState('type-select')
  const [batchType, setBatchType] = useState(null) // 'same-set' | 'mixed'

  // Shared context for same-set mode
  const [shared, setShared] = useState({ year: '', brand: '', set: '', sport: '', league: '', condition: '' })
  const setSharedField = (k, v) => setShared(p => ({ ...p, [k]: v }))

  // Cards array: { id, frontPreview, frontUrl, backPreview, backUrl, status, fields, error }
  const [cards, setCards] = useState([])
  const updateCard = useCallback((id, patch) =>
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c)), [])

  // Shoot phase state
  const [shootState, setShootState] = useState('front') // 'front' | 'back-prompt' | 'back'
  const [activeCardId, setActiveCardId] = useState(null) // card currently being photographed
  const frontInputRef = useRef(null)
  const backInputRef  = useRef(null)

  // Review phase state
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewForm, setReviewForm]   = useState(null)
  const setReviewField = (k, v) => setReviewForm(p => ({ ...p, [k]: v }))

  // Saving state
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0, errors: 0 })

  // ── Identification helper ──────────────────────────────────────────────────
  async function identifyCard(cardId, frontUrl, backUrl) {
    updateCard(cardId, { status: 'identifying' })
    const hints = batchType === 'same-set'
      ? { year: shared.year, brand: shared.brand, set: shared.set, sport: shared.sport, league: shared.league, condition: shared.condition }
      : {}
    try {
      const body = { imageUrl: frontUrl }
      if (backUrl) body.backImageUrl = backUrl
      if (Object.values(hints).some(Boolean)) body.hints = hints
      const res = await fetch('/api/identify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Identify failed')
      const data = await res.json()
      updateCard(cardId, {
        status: 'ready',
        fields: {
          player:      data.player || '',
          year:        data.year?.toString() || shared.year || '',
          brand:       data.brand || shared.brand || '',
          set:         data.set || shared.set || '',
          cardNumber:  data.cardNumber || '',
          parallel:    data.parallel || '',
          sport:       data.sport || shared.sport || '',
          league:      data.league || shared.league || '',
          team:        data.team || '',
          rookie:      Boolean(data.rookie),
          numbered:    Boolean(data.numbered),
          printRun:    data.printRun?.toString() || '',
          serialNumber: data.serialNumber || '',
          condition:   data.condition || shared.condition || '',
          tags:        data.tags || [],
          notes:       data.notes || '',
          estimatedValue: '', costPaid: '', forSale: false, askingPrice: '',
        },
      })
    } catch {
      updateCard(cardId, { status: 'error', error: 'Identification failed' })
    }
  }

  // ── Photo handlers ────────────────────────────────────────────────────────
  async function handleFrontPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const id = `card-${Date.now()}`
    const preview = URL.createObjectURL(file)
    const newCard = {
      id, frontPreview: preview, frontUrl: null,
      backPreview: null, backUrl: null,
      status: 'uploading',
      fields: emptyFields(batchType === 'same-set' ? shared : {}),
      error: null,
    }
    setCards(prev => [...prev, newCard])
    setActiveCardId(id)
    setShootState('back-prompt')

    // Upload in background
    try {
      const url = await uploadToCloudinary(file)
      updateCard(id, { frontUrl: url })
      // Start identification immediately (won't have back yet — that's OK for 'front' phase)
      // We'll re-identify if back is added, or just proceed
    } catch {
      updateCard(id, { status: 'error', error: 'Upload failed' })
    }
  }

  async function handleBackPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeCardId) return

    const preview = URL.createObjectURL(file)
    updateCard(activeCardId, { backPreview: preview, status: 'uploading' })

    const card = cards.find(c => c.id === activeCardId) || (await new Promise(r => setCards(prev => { r(prev.find(c => c.id === activeCardId)); return prev })))

    try {
      const backUrl = await uploadToCloudinary(file)
      updateCard(activeCardId, { backUrl })
      // Get current frontUrl from state
      setCards(prev => {
        const c = prev.find(x => x.id === activeCardId)
        if (c?.frontUrl) identifyCard(activeCardId, c.frontUrl, backUrl)
        return prev
      })
    } catch {
      updateCard(activeCardId, { status: 'error', error: 'Back upload failed' })
    }

    advanceToNextCard()
  }

  function skipBack() {
    // Identify with front only, then move on
    setCards(prev => {
      const c = prev.find(x => x.id === activeCardId)
      if (c?.frontUrl) identifyCard(activeCardId, c.frontUrl, null)
      else if (c?.status === 'uploading') {
        // Upload still in progress — set a flag and identify when upload completes
        // We'll handle this via a watcher in the uploading flow
      }
      return prev
    })
    advanceToNextCard()
  }

  function advanceToNextCard() {
    setShootState('front')
    setActiveCardId(null)
  }

  // When a card's front upload finishes and we've already moved past back-prompt, identify it
  // (handled by checking frontUrl + status in skipBack's setCards callback above)
  // Also handle the edge case: front uploaded AFTER skip — we need to trigger identification
  // We do this by watching in handleFrontPhoto: after upload, check if card already moved past back
  // For simplicity: if shootState is 'front' when upload completes, identify immediately
  async function handleFrontPhotoWithAutoIdentify(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const id = `card-${Date.now()}`
    const preview = URL.createObjectURL(file)
    const newCard = {
      id, frontPreview: preview, frontUrl: null,
      backPreview: null, backUrl: null,
      status: 'uploading',
      fields: emptyFields(batchType === 'same-set' ? shared : {}),
      error: null,
    }
    setCards(prev => [...prev, newCard])
    setActiveCardId(id)
    setShootState('back-prompt')

    try {
      const url = await uploadToCloudinary(file)
      updateCard(id, { frontUrl: url })
      // Card is now in back-prompt state; identification happens:
      // a) when user skips back (skipBack calls identifyCard with frontUrl)
      // b) when user adds back (handleBackPhoto calls identifyCard with both)
      // c) if we're in 'front' state (user already moved on), identify now
      setCards(prev => {
        const c = prev.find(x => x.id === id)
        // If card's back was already handled (backUrl set or status already changed), skip
        if (c && !c.backUrl && c.status === 'uploading') {
          // Upload just finished, back hasn't been added yet
          // Leave it — skip or add-back will trigger identify
          return prev.map(x => x.id === id ? { ...x, frontUrl: url } : x)
        }
        if (c && c.backUrl) {
          // Back was already uploaded — identify now
          identifyCard(id, url, c.backUrl)
        }
        return prev.map(x => x.id === id ? { ...x, frontUrl: url } : x)
      })
    } catch {
      updateCard(id, { status: 'error', error: 'Upload failed' })
    }
  }

  function finishShooting() {
    // Identify any cards still pending (front uploaded, no back, still in uploading state)
    setCards(prev => {
      prev.forEach(c => {
        if (c.frontUrl && c.status === 'uploading') {
          identifyCard(c.id, c.frontUrl, null)
        }
      })
      return prev
    })
    setReviewIndex(0)
    setReviewForm(cards[0]?.fields ? { ...cards[0].fields } : null)
    setPhase('review')
  }

  // ── Review helpers ────────────────────────────────────────────────────────
  function saveCurrentReview() {
    setCards(prev => prev.map((c, i) => i === reviewIndex ? { ...c, fields: { ...reviewForm } } : c))
  }

  function goToReviewCard(index) {
    saveCurrentReview()
    const target = cards[index]
    setReviewIndex(index)
    setReviewForm(target?.fields ? { ...target.fields } : emptyFields(batchType === 'same-set' ? shared : {}))
  }

  // ── Save all ──────────────────────────────────────────────────────────────
  async function saveAll() {
    saveCurrentReview()
    setPhase('saving')
    setSaveProgress({ done: 0, total: cards.length, errors: 0 })

    const finalCards = cards.map((c, i) => i === reviewIndex ? { ...c, fields: reviewForm } : c)
    let errors = 0
    for (let i = 0; i < finalCards.length; i++) {
      const c = finalCards[i]
      const f = c.fields || {}
      try {
        const body = {
          cardName: [f.year, f.brand, f.set, f.player, f.parallel].filter(Boolean).join(' '),
          player: f.player || '',
          year: f.year ? Number(f.year) : undefined,
          brand: f.brand || '',
          set: f.set || '',
          cardNumber: f.cardNumber || '',
          parallel: f.parallel || '',
          sport: f.sport || '',
          league: f.league || '',
          team: f.team || '',
          rookie: Boolean(f.rookie),
          numbered: Boolean(f.numbered),
          printRun: f.printRun ? Number(f.printRun) : undefined,
          serialNumber: f.serialNumber || '',
          condition: f.condition || '',
          tags: f.tags || [],
          notes: f.notes || '',
          costPaid: f.costPaid ? parseFloat(f.costPaid) : undefined,
          estimatedValue: f.estimatedValue ? parseFloat(f.estimatedValue) : undefined,
          forSale: Boolean(f.forSale),
          askingPrice: f.askingPrice ? parseFloat(f.askingPrice) : undefined,
          frontImageUrl: c.frontUrl || '',
          backImageUrl: c.backUrl || '',
        }
        const res = await fetch('/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Save failed')
        updateCard(c.id, { status: 'saved' })
      } catch {
        errors++
        updateCard(c.id, { status: 'error', error: 'Save failed' })
      }
      setSaveProgress(p => ({ ...p, done: i + 1, errors }))
      await new Promise(r => setTimeout(r, 150)) // small delay between saves
    }
    setPhase('done')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Phase: Type select ────────────────────────────────────────────────────
  if (phase === 'type-select') {
    return (
      <div className="max-w-lg mx-auto p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-black uppercase tracking-widest">📦 Bulk Upload</h1>
          <p className="text-gray-500 text-sm mt-1">Shoot photos fast, review all at once, save everything in one go.</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => { setBatchType('same-set'); setPhase('set-context') }}
            className="w-full text-left bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-2xl p-5 transition-colors"
          >
            <p className="text-2xl mb-1">📦</p>
            <p className="font-black text-lg">Same Set / Same Box</p>
            <p className="text-gray-500 text-sm mt-1">All cards share Year, Brand, Set, Sport, League, and/or Condition. Set the context once — Claude only identifies player, parallel, and card number per card.</p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {['Faster AI', 'Lower cost', 'Box breaks', 'Set lots'].map(t => (
                <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{t}</span>
              ))}
            </div>
          </button>

          <button
            onClick={() => { setBatchType('mixed'); setPhase('shoot') }}
            className="w-full text-left bg-white border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-2xl p-5 transition-colors"
          >
            <p className="text-2xl mb-1">🎲</p>
            <p className="font-black text-lg">Mixed Batch</p>
            <p className="text-gray-500 text-sm mt-1">Cards from different sets, years, or sports. Claude identifies everything from each photo individually.</p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {['Full AI identification', 'Any sport', 'Flea market haul', 'Vintage mix'].map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{t}</span>
              ))}
            </div>
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: Set context (same-set only) ───────────────────────────────────
  if (phase === 'set-context') {
    return (
      <div className="max-w-lg mx-auto p-4 pb-24">
        <button onClick={() => setPhase('type-select')} className="text-gray-400 hover:text-gray-700 text-sm mb-4">← Back</button>
        <h1 className="text-xl font-black uppercase tracking-widest mb-1">Set Shared Context</h1>
        <p className="text-gray-500 text-sm mb-6">
          These fields apply to every card in this batch. Fill in what you know — the more you set here, the less Claude has to guess per card.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year" value={shared.year} onChange={v => setSharedField('year', v)} type="number" placeholder="2020" />
            <div>
              <Label>Brand</Label>
              <select value={shared.brand} onChange={e => setSharedField('brand', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                <option value="">Select…</option>
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <Field label="Set (Product Line)" value={shared.set} onChange={v => setSharedField('set', v)} placeholder="Select, Prizm, Chrome…" />

          <div>
            <Label>Sport</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {SPORTS.map(s => <Pill key={s} active={shared.sport === s} onClick={() => setSharedField('sport', s)}>{s}</Pill>)}
            </div>
          </div>

          <div>
            <Label>League</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {LEAGUES.map(l => <Pill key={l} active={shared.league === l} onClick={() => setSharedField('league', l)}>{l}</Pill>)}
            </div>
          </div>

          <div>
            <Label>Condition (if consistent)</Label>
            <select value={shared.condition} onChange={e => setSharedField('condition', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
              <option value="">Leave blank — vary per card</option>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Summary chip preview */}
          {(shared.year || shared.brand || shared.set || shared.sport || shared.league) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">Batch context preview</p>
              <div className="flex flex-wrap gap-1.5">
                {[shared.year, shared.brand, shared.set, shared.sport, shared.league, shared.condition]
                  .filter(Boolean)
                  .map((v, i) => <span key={i} className="text-xs bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{v}</span>)
                }
              </div>
              <p className="text-xs text-blue-600 mt-2">Claude will only identify: player, parallel, card #, rookie status, and any other details not listed above.</p>
            </div>
          )}

          <button
            onClick={() => setPhase('shoot')}
            className="w-full bg-[#0f1b35] text-white py-4 rounded-2xl font-black text-lg uppercase tracking-wide hover:bg-blue-900 transition-colors"
          >
            Start Shooting →
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: Shoot ─────────────────────────────────────────────────────────
  if (phase === 'shoot') {
    const readyCount    = cards.filter(c => c.status === 'ready').length
    const processingCount = cards.filter(c => c.status === 'identifying' || c.status === 'uploading').length

    return (
      <div className="max-w-lg mx-auto p-4 pb-32">
        {/* Always-mounted hidden inputs */}
        <input ref={frontInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={handleFrontPhotoWithAutoIdentify} />
        <input ref={backInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={handleBackPhoto} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest">
              {batchType === 'same-set'
                ? `📦 ${[shared.year, shared.brand, shared.set].filter(Boolean).join(' ') || 'Same Set Batch'}`
                : '🎲 Mixed Batch'}
            </h1>
            <p className="text-gray-500 text-sm">
              {cards.length === 0 ? 'Tap below to start' : `${cards.length} card${cards.length !== 1 ? 's' : ''} shot`}
              {processingCount > 0 && ` · ${processingCount} identifying…`}
              {readyCount > 0 && ` · ${readyCount} ready`}
            </p>
          </div>
          {cards.length > 0 && (
            <button onClick={finishShooting}
              className="bg-green-600 text-white text-sm font-black px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
              Review {cards.length} →
            </button>
          )}
        </div>

        {/* Main shoot area */}
        {shootState === 'front' && (
          <div
            onClick={() => frontInputRef.current?.click()}
            className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-2xl p-10 text-center cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <div className="text-6xl mb-3">📷</div>
            <p className="font-black text-gray-800 text-lg">Photograph Front</p>
            <p className="text-gray-500 text-sm mt-1">Tap anywhere here to open camera</p>
            {batchType === 'same-set' && shared.year && (
              <p className="text-blue-600 text-xs mt-2 font-medium">
                Shared context: {[shared.year, shared.brand, shared.set].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}

        {shootState === 'back-prompt' && (
          <div className="space-y-3">
            {/* Show the card just shot */}
            {(() => {
              const active = cards.find(c => c.id === activeCardId)
              return active ? (
                <div className="flex gap-3 items-center bg-green-50 border border-green-200 rounded-2xl p-4">
                  <img src={active.frontPreview} className="w-16 aspect-[3/4] object-cover rounded-xl flex-shrink-0" alt="Front" />
                  <div>
                    <p className="font-bold text-green-800">✅ Front captured!</p>
                    <p className="text-sm text-green-700">Add the back to help Claude find the card number.</p>
                  </div>
                </div>
              ) : null
            })()}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => backInputRef.current?.click()}
                className="border-2 border-orange-300 bg-orange-50 rounded-2xl p-5 text-center hover:bg-orange-100 transition-colors"
              >
                <div className="text-3xl mb-1">🔄</div>
                <p className="font-bold text-orange-800 text-sm">Add Back</p>
                <p className="text-orange-600 text-xs mt-0.5">Better card # detection</p>
              </button>
              <button
                onClick={skipBack}
                className="border-2 border-gray-200 bg-gray-50 rounded-2xl p-5 text-center hover:bg-gray-100 transition-colors"
              >
                <div className="text-3xl mb-1">⏩</div>
                <p className="font-bold text-gray-700 text-sm">Next Card</p>
                <p className="text-gray-500 text-xs mt-0.5">Front only — skip back</p>
              </button>
            </div>
          </div>
        )}

        {/* Thumbnail strip */}
        {cards.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Cards shot ({cards.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {cards.map((c, i) => (
                <div key={c.id} className="flex-shrink-0 relative">
                  <img src={c.frontPreview} className="w-14 aspect-[3/4] object-cover rounded-lg border-2 border-gray-200" alt={`Card ${i + 1}`} />
                  <div className="absolute -bottom-1 left-0 right-0 flex justify-center">
                    <StatusBadge status={c.status} />
                  </div>
                  {c.backPreview && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full text-white text-[8px] font-black flex items-center justify-center">B</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating finish button */}
        {cards.length >= 2 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
            <button onClick={finishShooting}
              className="bg-[#0f1b35] text-white font-black px-8 py-4 rounded-2xl shadow-2xl text-lg hover:bg-blue-900 transition-colors">
              Done — Review {cards.length} Cards →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Phase: Review ─────────────────────────────────────────────────────────
  if (phase === 'review') {
    const card = cards[reviewIndex]
    const isLast = reviewIndex === cards.length - 1
    const identifiedCount = cards.filter(c => c.status === 'ready' || c.status === 'saved').length
    const stillProcessing = cards.filter(c => c.status === 'identifying' || c.status === 'uploading').length

    // Sync reviewForm when switching cards
    function handleNext() {
      saveCurrentReview()
      if (isLast) {
        saveAll()
      } else {
        goToReviewCard(reviewIndex + 1)
      }
    }

    function handlePrev() {
      saveCurrentReview()
      goToReviewCard(reviewIndex - 1)
    }

    // Refresh form if card just finished identifying and form still has empty player
    // (happens when user reviews before AI finishes)
    const currentCard = cards[reviewIndex]
    if (currentCard?.status === 'ready' && reviewForm && !reviewForm.player && currentCard.fields?.player) {
      setReviewForm({ ...currentCard.fields })
    }

    return (
      <div className="max-w-lg mx-auto p-4 pb-32">
        {/* Progress header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-black uppercase tracking-widest">Review Card {reviewIndex + 1} of {cards.length}</h1>
            {stillProcessing > 0 && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full animate-pulse">
                {stillProcessing} still identifying…
              </span>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((reviewIndex + 1) / cards.length) * 100}%` }} />
          </div>
          {/* Mini thumbnail strip */}
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {cards.map((c, i) => (
              <button key={c.id} onClick={() => { saveCurrentReview(); goToReviewCard(i) }}
                className={`flex-shrink-0 relative transition-all ${i === reviewIndex ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                <img src={c.frontPreview} className="w-10 aspect-[3/4] object-cover rounded-lg" alt={`Card ${i + 1}`} />
                <div className="absolute -bottom-0.5 left-0 right-0 flex justify-center">
                  <StatusBadge status={c.status} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Card status banner */}
        {(card?.status === 'identifying' || card?.status === 'uploading') && (
          <div className="bg-purple-50 border border-purple-200 text-purple-700 text-sm px-4 py-2 rounded-xl mb-3 flex items-center gap-2">
            <span className="animate-spin">🔍</span>
            AI is identifying this card — fields will populate shortly. You can continue and come back.
          </div>
        )}
        {card?.status === 'error' && !card.fields?.player && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl mb-3">
            ⚠️ {card.error || 'Identification failed'} — please fill in fields manually.
          </div>
        )}

        {/* Images */}
        {card && (
          <div className="flex gap-3 mb-4">
            <img src={card.frontPreview} className={`rounded-xl object-cover ${card.backPreview ? 'w-1/2' : 'w-full'} aspect-[3/4]`} alt="Front" />
            {card.backPreview && <img src={card.backPreview} className="w-1/2 aspect-[3/4] rounded-xl object-cover" alt="Back" />}
          </div>
        )}

        {/* Edit form */}
        {reviewForm && (
          <div className="space-y-3">
            <Field label="Player Name *" value={reviewForm.player} onChange={v => setReviewField('player', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year" value={reviewForm.year} onChange={v => setReviewField('year', v)} type="number" placeholder="2020" />
              <Field label="Card #" value={reviewForm.cardNumber} onChange={v => setReviewField('cardNumber', v)} placeholder="269" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand</Label>
                <select value={reviewForm.brand} onChange={e => setReviewField('brand', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="">Select…</option>
                  {BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <Field label="Set" value={reviewForm.set} onChange={v => setReviewField('set', v)} />
            </div>
            <Field label="Parallel / Variant" value={reviewForm.parallel} onChange={v => setReviewField('parallel', v)} placeholder="Silver, Gold, Base…" />

            <div>
              <Label>League</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {LEAGUES.map(l => <Pill key={l} active={reviewForm.league === l} onClick={() => setReviewField('league', l)}>{l}</Pill>)}
              </div>
            </div>

            <div>
              <Label>Team</Label>
              {TEAMS_BY_LEAGUE[reviewForm.league] ? (
                <select value={reviewForm.team} onChange={e => setReviewField('team', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="">Select team…</option>
                  {reviewForm.team && !TEAMS_BY_LEAGUE[reviewForm.league].includes(reviewForm.team) && (
                    <option value={reviewForm.team}>{reviewForm.team}</option>
                  )}
                  {TEAMS_BY_LEAGUE[reviewForm.league].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input type="text" value={reviewForm.team} onChange={e => setReviewField('team', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400" />
              )}
            </div>

            <div className="flex gap-3">
              <label className="flex items-center gap-2 flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-3 cursor-pointer">
                <input type="checkbox" checked={reviewForm.rookie} onChange={e => setReviewField('rookie', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                <span className="text-yellow-800 font-semibold text-sm">⭐ Rookie</span>
              </label>
              <label className="flex items-center gap-2 flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 cursor-pointer">
                <input type="checkbox" checked={reviewForm.numbered} onChange={e => setReviewField('numbered', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-orange-800 font-semibold text-sm">🔢 Numbered</span>
              </label>
            </div>

            <div>
              <Label>Condition</Label>
              <select value={reviewForm.condition} onChange={e => setReviewField('condition', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                <option value="">Select…</option>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost Paid ($)" value={reviewForm.costPaid} onChange={v => setReviewField('costPaid', v)} type="number" placeholder="0.00" />
              <Field label="Est. Value ($)" value={reviewForm.estimatedValue} onChange={v => setReviewField('estimatedValue', v)} type="number" placeholder="0.00" />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <input type="checkbox" id={`forSale-${reviewIndex}`} checked={reviewForm.forSale}
                onChange={e => setReviewField('forSale', e.target.checked)} className="w-4 h-4 accent-green-600" />
              <label htmlFor={`forSale-${reviewIndex}`} className="text-green-800 font-semibold text-sm flex-1 cursor-pointer">List for Sale</label>
              {reviewForm.forSale && (
                <input type="number" value={reviewForm.askingPrice} onChange={e => setReviewField('askingPrice', e.target.value)}
                  placeholder="Asking $" className="border border-green-300 rounded-lg px-2 py-1 text-sm w-28 focus:outline-none bg-white" />
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <textarea value={reviewForm.notes} onChange={e => setReviewField('notes', e.target.value)} placeholder="Any additional details…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm h-12 resize-none focus:outline-none focus:border-blue-400" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 max-w-lg mx-auto">
          {reviewIndex > 0 && (
            <button onClick={handlePrev}
              className="border border-gray-300 text-gray-600 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              ← Prev
            </button>
          )}
          <button onClick={handleNext} disabled={!reviewForm?.player?.trim()}
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-colors disabled:opacity-40 ${
              isLast
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}>
            {isLast ? `✓ Save All ${cards.length} Cards` : `Next Card → (${reviewIndex + 2}/${cards.length})`}
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: Saving ─────────────────────────────────────────────────────────
  if (phase === 'saving') {
    const pct = saveProgress.total > 0 ? Math.round((saveProgress.done / saveProgress.total) * 100) : 0
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">💾</div>
        <h2 className="text-xl font-black">Saving your cards…</h2>
        <p className="text-gray-500 mt-1 mb-6">{saveProgress.done} of {saveProgress.total} saved</p>
        <div className="w-full max-w-xs bg-gray-100 rounded-full h-3">
          <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        {/* Live mini-grid */}
        <div className="flex gap-2 mt-6 flex-wrap justify-center">
          {cards.map((c, i) => (
            <div key={c.id} className="relative">
              <img src={c.frontPreview} className="w-10 aspect-[3/4] object-cover rounded-lg" alt={`Card ${i+1}`} />
              <div className="absolute -bottom-0.5 left-0 right-0 flex justify-center">
                <StatusBadge status={c.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Phase: Done ───────────────────────────────────────────────────────────
  if (phase === 'done') {
    const saved  = cards.filter(c => c.status === 'saved').length
    const errors = cards.filter(c => c.status === 'error').length
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-4">{errors === 0 ? '🎉' : '⚠️'}</div>
        <h2 className="text-2xl font-black">{saved} of {cards.length} Cards Added!</h2>
        {errors > 0 && <p className="text-red-500 mt-1">{errors} card{errors > 1 ? 's' : ''} failed to save.</p>}
        <p className="text-gray-500 mt-2 mb-6">
          {batchType === 'same-set' && shared.set ? `${shared.year} ${shared.brand} ${shared.set} batch complete.` : 'Batch upload complete.'}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => { setCards([]); setPhase('type-select') }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">
            Upload Another Batch
          </button>
          <button onClick={() => router.push('/collection')}
            className="border border-gray-300 px-6 py-3 rounded-xl font-bold">
            View Collection
          </button>
        </div>
      </div>
    )
  }

  return null
}
