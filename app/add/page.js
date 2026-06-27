'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS_BY_LEAGUE } from './teams'

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

const emptyForm = () => ({
  cardName: '', player: '', year: '', brand: '', set: '', cardNumber: '',
  parallel: '', sport: '', league: '', team: '', tags: [],
  serialNumber: '', rookie: false, numbered: false, printRun: '',
  condition: '', costPaid: '', estimatedValue: '',
  psa8Value: '', psa9Value: '', psa10Value: '',
  forSale: false, askingPrice: '', notes: '',
})

export default function AddCard() {
  const router = useRouter()
  const frontInputRef = useRef()
  const backInputRef = useRef()

  const [step, setStep] = useState('capture') // capture | capture-back | review | done
  const [photoMode, setPhotoMode] = useState('both') // 'both' | 'front-only'
  const [frontImg, setFrontImg] = useState(null)
  const [backImg, setBackImg] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [voiceText, setVoiceText] = useState('')
  const [voiceHints, setVoiceHints] = useState(null) // parsed voice fields used as hints to identify
  const [listening, setListening] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [identifying, setIdentifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  // ── Image upload ──────────────────────────────────────────────────
  async function uploadToCloudinary(file) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) return URL.createObjectURL(file)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)
    fd.append('folder', 'eetee-cards')
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: fd }
    )
    const data = await res.json()
    if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed')
    return data.secure_url
  }

  async function handlePhoto(e, side) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ''
    const preview = URL.createObjectURL(file)

    if (side === 'front') {
      setFrontImg({ preview, url: preview, uploading: true })
      setError('')
      setUploading(true)
      try {
        const url = await uploadToCloudinary(file)
        setFrontImg({ preview, url })
        if (photoMode === 'both') {
          // Move to back-capture step — user will tap button to open camera for back
          setStep('capture-back')
        } else {
          // Front only — identify immediately
          await identifyCard(url)
        }
      } catch {
        setError('Image upload failed — please check Cloudinary settings or try again.')
        setFrontImg({ preview, url: preview, uploadFailed: true })
        setStep('review')
      }
      setUploading(false)
    } else {
      // Back image
      setBackImg({ preview, url: preview })
      try {
        const url = await uploadToCloudinary(file)
        setBackImg({ preview, url })
        if (frontImg?.url) {
          await identifyCardWithBack(frontImg.url, url, true)
        }
      } catch {
        // Back upload failed — go to review anyway
        setStep('review')
      }
    }
  }

  async function identifyCard(imageUrl) {
    setIdentifying(true)
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, hints: voiceHints || undefined }),
      })
      if (!res.ok) throw new Error('Identification failed')
      const data = await res.json()
      setForm((prev) => ({
        ...prev,
        cardName: data.cardName || '',
        player: data.player || '',
        year: data.year?.toString() || '',
        brand: data.brand || '',
        set: data.set || '',
        cardNumber: data.cardNumber || '',
        parallel: data.parallel || '',
        sport: data.sport || '',
        league: data.league || '',
        team: data.team || '',
        tags: data.tags || [],
        serialNumber: data.serialNumber || '',
        rookie: Boolean(data.rookie),
        numbered: Boolean(data.numbered),
        printRun: data.printRun?.toString() || '',
        condition: data.condition || '',
        notes: data.notes || '',
      }))
    } catch {
      setError('Could not auto-identify card — please fill in details manually.')
    }
    setIdentifying(false)
    setStep('review')
  }

  async function identifyCardWithBack(frontUrl, backUrl, moveToReview = false) {
    setIdentifying(true)
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: frontUrl, backImageUrl: backUrl, hints: voiceHints || undefined }),
      })
      if (!res.ok) throw new Error('Identification failed')
      const data = await res.json()
      setForm((prev) => ({
        ...prev,
        cardName: data.cardName || prev.cardName,
        player: data.player || prev.player,
        year: data.year?.toString() || prev.year,
        brand: data.brand || prev.brand,
        set: data.set || prev.set,
        cardNumber: data.cardNumber || prev.cardNumber,
        parallel: data.parallel || prev.parallel,
        sport: data.sport || prev.sport,
        league: data.league || prev.league,
        team: data.team || prev.team,
        tags: data.tags?.length ? data.tags : prev.tags,
        serialNumber: data.serialNumber || prev.serialNumber,
        rookie: data.rookie !== undefined ? Boolean(data.rookie) : prev.rookie,
        numbered: data.numbered !== undefined ? Boolean(data.numbered) : prev.numbered,
        printRun: data.printRun?.toString() || prev.printRun,
        condition: data.condition || prev.condition,
        notes: data.notes || prev.notes,
      }))
    } catch {}
    setIdentifying(false)
    if (moveToReview) setStep('review')
  }

  // ── Voice input ───────────────────────────────────────────────────
  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Voice input is not supported in this browser. Try Chrome, or type the details below.')
      return
    }
    const recognition = new SR()
    recognition.continuous = false
    recognition.lang = 'en-US'
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (e) => setVoiceText(e.results[0][0].transcript)
    recognition.onerror = () => setListening(false)
    recognition.start()
  }

  async function processVoice(jumpToReview = false) {
    if (!voiceText.trim()) return
    setIdentifying(true)
    setError('')
    try {
      const res = await fetch('/api/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceText }),
      })
      const data = await res.json()
      if (jumpToReview) {
        // Legacy path: voice-only entry, no photo
        setForm((prev) => ({ ...prev, ...data }))
        setStep('review')
      } else {
        // New path: voice as pre-hint before photo
        setVoiceHints(data)
        // Pre-fill form too so user can see/edit before photo
        setForm((prev) => ({ ...prev, ...data }))
      }
    } catch {
      if (jumpToReview) {
        setError('Could not parse voice input — please fill in manually.')
        setStep('review')
      } else {
        setError('Could not parse voice — hints will not be used.')
      }
    }
    setIdentifying(false)
  }

  // ── Save to Airtable ──────────────────────────────────────────────
  async function handleSave() {
    if (!form.player.trim()) { setError('Player name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: parseInt(form.year) || null,
          printRun: parseInt(form.printRun) || null,
          costPaid: parseFloat(form.costPaid) || null,
          estimatedValue: parseFloat(form.estimatedValue) || null,
          psa8Value: parseFloat(form.psa8Value) || null,
          psa9Value: parseFloat(form.psa9Value) || null,
          psa10Value: parseFloat(form.psa10Value) || null,
          askingPrice: parseFloat(form.askingPrice) || null,
          frontImageUrl: frontImg?.url || '',
          backImageUrl: backImg?.url || '',
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setStep('done')
    } catch {
      setError('Could not save card — please try again.')
    }
    setSaving(false)
  }

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }))
  const toggleTag = (tag) =>
    setForm((p) => ({
      ...p,
      tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag],
    }))

  function resetAll() {
    setStep('capture')
    setPhotoMode('both')
    setFrontImg(null)
    setBackImg(null)
    setForm(emptyForm())
    setVoiceText('')
    setVoiceHints(null)
    setError('')
  }

  // ── Team dropdown helper ──────────────────────────────────────────
  function TeamField() {
    const teamList = TEAMS_BY_LEAGUE[form.league]
    if (teamList) {
      // AI may return a team name not in our list — add it as an option so it shows
      const aiTeamNotInList = form.team && !teamList.includes(form.team)
      return (
        <select
          value={form.team}
          onChange={(e) => set('team', e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white"
        >
          <option value="">Select team...</option>
          {aiTeamNotInList && (
            <option value={form.team}>{form.team} (auto-detected)</option>
          )}
          {teamList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )
    }
    return (
      <input
        type="text"
        value={form.team}
        onChange={(e) => set('team', e.target.value)}
        placeholder="e.g. Los Angeles Lakers"
        className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400"
      />
    )
  }

  // ── Done ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-black">Card Added!</h2>
        <p className="text-gray-500 mt-2 mb-6">
          <strong>{form.player || 'Card'}</strong> is now in your collection.
        </p>
        <div className="flex gap-3">
          <button onClick={resetAll} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">
            + Add Another
          </button>
          <button onClick={() => router.push('/collection')} className="border border-gray-300 px-6 py-3 rounded-xl font-semibold">
            View Collection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      {/* Always-mounted hidden inputs */}
      <input ref={frontInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handlePhoto(e, 'front')} />
      <input ref={backInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handlePhoto(e, 'back')} />

      <h1 className="text-xl font-black uppercase tracking-widest mb-4">Add New Card</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* ── Step 1: Capture Front ── */}
      {step === 'capture' && (
        <div className="space-y-4">
          {/* Photo mode toggle */}
          <div className="bg-gray-100 rounded-2xl p-1 flex">
            {[
              { mode: 'both', label: '📸 Front & Back', desc: 'Recommended — better card ID' },
              { mode: 'front-only', label: '📸 Front Only', desc: 'Faster entry' },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setPhotoMode(mode)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  photoMode === mode
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {photoMode === 'both' && (
            <p className="text-xs text-center text-blue-600 -mt-2">
              You'll photograph the front, then flip and photograph the back
            </p>
          )}

          {/* Camera */}
          <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">📷</div>
            <p className="font-bold text-gray-800 mb-1">
              {photoMode === 'both' ? 'Step 1 of 2 — Front of Card' : 'Take a Photo'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Photos go straight to the cloud — nothing saved to your phone's storage.
            </p>
            <button
              onClick={() => frontInputRef.current.click()}
              disabled={uploading || identifying}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
            >
              {uploading ? '⬆️  Uploading...' : identifying ? '🔍  Identifying card...' : '📸  Take Photo or Choose Image'}
            </button>
          </div>

          <div className="flex items-center gap-3 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-200" />
            or use voice entry
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Voice */}
          <div className="border border-purple-200 bg-purple-50 rounded-2xl p-4">
            <p className="font-bold text-gray-700 mb-0.5">🎤 Voice + Photo (Saves AI Cost)</p>
            <p className="text-xs text-gray-500 mb-3">
              Speak the details you know, then take a photo — Claude only confirms what it sees (card #, condition, parallel).
              <br/>Example: <em>"2003 Topps Chrome LeBron James rookie"</em>
            </p>
            {voiceHints && (
              <div className="bg-green-100 border border-green-300 rounded-xl px-3 py-2 mb-2 flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <div className="text-xs text-green-800">
                  <strong>Voice hints ready:</strong> {[voiceHints.year, voiceHints.brand, voiceHints.set, voiceHints.player, voiceHints.parallel].filter(Boolean).join(' ')}
                  <button onClick={() => { setVoiceHints(null); setVoiceText('') }} className="ml-2 underline text-green-600">clear</button>
                </div>
              </div>
            )}
            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Tap the mic or type card details..."
              className="w-full border border-purple-200 rounded-xl p-3 text-sm h-16 resize-none focus:outline-none focus:border-purple-400 bg-white"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={startVoice}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  listening ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {listening ? '🔴  Listening...' : '🎤  Start Listening'}
              </button>
              <button
                onClick={() => processVoice(false)}
                disabled={!voiceText.trim() || identifying}
                className="flex-1 py-2.5 bg-purple-900 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-purple-800 transition-colors"
              >
                {identifying ? 'Parsing...' : 'Set Hints →'}
              </button>
            </div>
            {voiceText.trim() && !voiceHints && (
              <button
                onClick={() => processVoice(true)}
                disabled={identifying}
                className="w-full mt-2 py-2 border border-gray-300 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-100 transition-colors"
              >
                Skip photo — enter manually from voice only
              </button>
            )}
          </div>

          <button
            onClick={() => setStep('review')}
            className="w-full border border-gray-300 py-3 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Enter Details Manually
          </button>
        </div>
      )}

      {/* ── Step 1b: Capture Back ── */}
      {step === 'capture-back' && (
        <div className="space-y-4">
          {/* Front thumbnail */}
          <div className="flex gap-4 items-center bg-green-50 border border-green-200 rounded-2xl p-4">
            {frontImg && (
              <img src={frontImg.preview} className="w-16 aspect-[3/4] object-cover rounded-lg flex-shrink-0" alt="Front" />
            )}
            <div>
              <p className="font-bold text-green-800">✅ Front captured!</p>
              <p className="text-sm text-green-700 mt-0.5">
                {uploading ? 'Uploading...' : 'Now flip the card over for the back.'}
              </p>
            </div>
          </div>

          {/* Back capture */}
          <div className="border-2 border-dashed border-orange-300 bg-orange-50 rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">🔄</div>
            <p className="font-bold text-gray-800 mb-1">Step 2 of 2 — Back of Card</p>
            <p className="text-xs text-gray-500 mb-4">
              The back helps identify the card number, stats, and other details.
            </p>
            <button
              onClick={() => backInputRef.current.click()}
              disabled={uploading || identifying}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
            >
              {identifying ? '🔍  Identifying card...' : '📸  Photograph Back of Card'}
            </button>
          </div>

          <button
            onClick={() => identifyCard(frontImg?.url)}
            disabled={!frontImg?.url || identifying}
            className="w-full border border-gray-300 py-3 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Skip back photo →
          </button>
        </div>
      )}

      {/* ── Step 2: Review & Edit ── */}
      {step === 'review' && (
        <div className="space-y-4">
          {identifying && (
            <div className="bg-blue-50 text-blue-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <span className="animate-spin inline-block">🔍</span> Identifying card with AI...
            </div>
          )}

          {/* Images */}
          <div className="grid grid-cols-2 gap-3">
            {/* Front */}
            <div>
              {frontImg ? (
                <div className="relative cursor-pointer" onClick={() => frontInputRef.current.click()}>
                  <img src={frontImg.preview} className="w-full aspect-[3/4] object-cover rounded-xl" alt="Front" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 rounded-xl transition-colors" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Front ✎</span>
                </div>
              ) : (
                <div onClick={() => frontInputRef.current.click()}
                  className="w-full aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50">
                  <span className="text-3xl">📷</span>
                  <span className="text-xs mt-1">Add Front</span>
                </div>
              )}
            </div>
            {/* Back */}
            <div>
              {backImg ? (
                <div className="relative cursor-pointer" onClick={() => backInputRef.current.click()}>
                  <img src={backImg.preview} className="w-full aspect-[3/4] object-cover rounded-xl" alt="Back" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Back ✎</span>
                </div>
              ) : (
                <div onClick={() => backInputRef.current.click()}
                  className="w-full aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50">
                  <span className="text-3xl">📷</span>
                  <span className="text-xs mt-1">Add Back</span>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <Field label="Player Name *" value={form.player} onChange={(v) => set('player', v)} />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Year" value={form.year} onChange={(v) => set('year', v)} type="number" placeholder="2017" />
              <Field label="Card #" value={form.cardNumber} onChange={(v) => set('cardNumber', v)} placeholder="269" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand (Manufacturer)</Label>
                <select value={form.brand} onChange={(e) => set('brand', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                  <option value="">Select brand...</option>
                  {BRANDS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <Field label="Set (Product Line)" value={form.set} onChange={(v) => set('set', v)} placeholder="Prizm, Donruss..." />
            </div>
            <Field label="Parallel / Variant" value={form.parallel} onChange={(v) => set('parallel', v)} placeholder="Silver Prizm, Gold, etc." />

            {/* Sport + League — pick league first to get team dropdown */}
            <div>
              <Label>Sport</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SPORTS.map((s) => (
                  <Pill key={s} active={form.sport === s} onClick={() => set('sport', s)}>{s}</Pill>
                ))}
              </div>
            </div>
            <div>
              <Label>League</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {LEAGUES.map((l) => (
                  <Pill key={l} active={form.league === l} onClick={() => {
                    set('league', l)
                    // Clear team when league changes so user picks from new list
                    if (TEAMS_BY_LEAGUE[l] && !TEAMS_BY_LEAGUE[l].includes(form.team)) {
                      set('team', '')
                    }
                  }}>{l}</Pill>
                ))}
              </div>
            </div>

            {/* Team — dropdown if league has a list, otherwise text */}
            <div>
              <Label>Team</Label>
              <TeamField />
            </div>

            {/* Rookie + Numbered checkboxes */}
            <div className="flex gap-3">
              <label className="flex items-center gap-2 flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-3 cursor-pointer">
                <input type="checkbox" checked={form.rookie} onChange={(e) => set('rookie', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                <span className="text-yellow-800 font-semibold text-sm">⭐ Rookie Card</span>
              </label>
              <label className="flex items-center gap-2 flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3 cursor-pointer">
                <input type="checkbox" checked={form.numbered} onChange={(e) => set('numbered', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-orange-800 font-semibold text-sm">🔢 Numbered</span>
              </label>
            </div>

            {form.numbered && (
              <Field label="Print Run" value={form.printRun} onChange={(v) => set('printRun', v)} type="number" placeholder="e.g. 99, 249, 999" />
            )}

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ALL_TAGS.map((t) => (
                  <Pill key={t} active={form.tags.includes(t)} color="yellow" onClick={() => toggleTag(t)}>{t}</Pill>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <Label>Condition</Label>
              <select value={form.condition} onChange={(e) => set('condition', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-400 bg-white">
                <option value="">Select condition...</option>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost Paid ($)" value={form.costPaid} onChange={(v) => set('costPaid', v)} type="number" placeholder="0.00" />
              <Field label="Est. Value ($)" value={form.estimatedValue} onChange={(v) => set('estimatedValue', v)} type="number" placeholder="0.00" />
            </div>

            {/* Grading ROI */}
            <div>
              <Label>Graded Values (for ROI tracking)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Field label="PSA 8 $" value={form.psa8Value} onChange={(v) => set('psa8Value', v)} type="number" placeholder="—" />
                <Field label="PSA 9 $" value={form.psa9Value} onChange={(v) => set('psa9Value', v)} type="number" placeholder="—" />
                <Field label="PSA 10 $" value={form.psa10Value} onChange={(v) => set('psa10Value', v)} type="number" placeholder="—" />
              </div>
            </div>

            {/* For Sale */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <input type="checkbox" id="forSale" checked={form.forSale} onChange={(e) => set('forSale', e.target.checked)} className="w-4 h-4 accent-green-600" />
              <label htmlFor="forSale" className="text-green-800 font-semibold text-sm flex-1 cursor-pointer">List for Sale</label>
              {form.forSale && (
                <input type="number" value={form.askingPrice} onChange={(e) => set('askingPrice', e.target.value)}
                  placeholder="Asking $" className="border border-green-300 rounded-lg px-2 py-1 text-sm w-28 focus:outline-none bg-white" />
              )}
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                placeholder="Any additional details..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm h-16 resize-none focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('capture')} className="border border-gray-300 px-4 py-3 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50">
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.player.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : '✓ Add to Collection'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small reusable components ─────────────────────────────────────
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

function Pill({ children, active, onClick, color = 'blue' }) {
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
