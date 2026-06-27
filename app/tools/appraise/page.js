'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'

const TREND_ICON = { rising: '↑', falling: '↓', stable: '→', unknown: '–' }
const TREND_COLOR = { rising: 'text-green-600', falling: 'text-red-500', stable: 'text-gray-500', unknown: 'text-gray-400' }

async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'eetee-cards-unsigned')
  const res = await fetch('https://api.cloudinary.com/v1_1/dgfukcdmz/image/upload', {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!data.secure_url) throw new Error('Upload failed')
  return data.secure_url
}

export default function AppraisePage() {
  const [frontSrc, setFrontSrc]   = useState(null)
  const [backSrc, setBackSrc]     = useState(null)
  const [frontFile, setFrontFile] = useState(null)
  const [backFile, setBackFile]   = useState(null)
  const [appraising, setAppraising] = useState(false)
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
    if (!frontFile) return
    setAppraising(true)
    setError(null)
    setResult(null)
    try {
      const [frontUrl, backUrl] = await Promise.all([
        uploadToCloudinary(frontFile),
        backFile ? uploadToCloudinary(backFile) : Promise.resolve(null),
      ])
      const res = await fetch('/api/appraise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontImageUrl: frontUrl, backImageUrl: backUrl }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Appraisal failed')
    } finally {
      setAppraising(false)
    }
  }

  function reset() {
    setFrontSrc(null)
    setBackSrc(null)
    setFrontFile(null)
    setBackFile(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/tools" className="text-gray-400 hover:text-gray-700 text-sm">← Tools</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-black uppercase tracking-widest">🔎 Photo Appraiser</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Drop a card photo for instant identification and value estimate — no need to add it to your collection.
        Perfect for card shows and flea markets.
      </p>

      {!result && (
        <>
          {/* Photo inputs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">Front *</p>
              <div
                onClick={() => frontRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors aspect-[3/4] flex flex-col items-center justify-center ${
                  frontSrc ? 'border-blue-300' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                {frontSrc ? (
                  <img src={frontSrc} alt="Front" className="max-h-full object-contain rounded-lg" />
                ) : (
                  <>
                    <span className="text-3xl">🃏</span>
                    <p className="text-xs text-gray-400 mt-1">Tap to add front</p>
                  </>
                )}
              </div>
              <input ref={frontRef} type="file" accept="image/*" className="hidden" onChange={handleFront} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-1">Back (optional)</p>
              <div
                onClick={() => backRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors aspect-[3/4] flex flex-col items-center justify-center ${
                  backSrc ? 'border-blue-300' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                {backSrc ? (
                  <img src={backSrc} alt="Back" className="max-h-full object-contain rounded-lg" />
                ) : (
                  <>
                    <span className="text-3xl">🔄</span>
                    <p className="text-xs text-gray-400 mt-1">Tap to add back</p>
                  </>
                )}
              </div>
              <input ref={backRef} type="file" accept="image/*" className="hidden" onChange={handleBack} />
            </div>
          </div>

          <button
            onClick={appraise}
            disabled={!frontFile || appraising}
            className="w-full bg-[#0f1b35] text-white py-4 rounded-2xl font-black uppercase tracking-wide text-lg disabled:opacity-40 hover:bg-blue-900 transition-colors"
          >
            {appraising ? '🔍 Appraising...' : '🔎 Appraise This Card'}
          </button>

          {appraising && (
            <div className="mt-6 text-center text-gray-500 text-sm">
              <div className="inline-block w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-2" />
              <p>Claude is identifying and valuing your card...</p>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
          <button onClick={reset} className="block mt-2 text-red-400 underline text-xs">Try again</button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Image + identity */}
          <div className="grid grid-cols-2 gap-3">
            {frontSrc && <img src={frontSrc} alt="Front" className="rounded-2xl object-contain border border-gray-200" />}
            {backSrc  && <img src={backSrc}  alt="Back"  className="rounded-2xl object-contain border border-gray-200" />}
          </div>

          {/* Value hero */}
          <div className="bg-[#0f1b35] text-white rounded-2xl p-5">
            <p className="text-blue-300 text-xs font-black uppercase tracking-widest">Estimated Value</p>
            {result.estimatedValue ? (
              <>
                <p className="text-5xl font-black mt-1">${result.estimatedValue.toLocaleString()}</p>
                {(result.valueLow || result.valueHigh) && (
                  <p className="text-blue-300 text-sm mt-0.5">
                    Range: ${result.valueLow?.toLocaleString()} – ${result.valueHigh?.toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-black mt-1 text-gray-400">Value unknown</p>
            )}
            <div className="flex gap-3 mt-2 flex-wrap">
              {result.trend && result.trend !== 'unknown' && (
                <span className={`text-sm font-bold ${result.trend === 'rising' ? 'text-green-300' : result.trend === 'falling' ? 'text-red-300' : 'text-gray-400'}`}>
                  {TREND_ICON[result.trend]} {result.trend}
                </span>
              )}
              <span className="text-blue-300 text-xs self-end">Confidence: {result.confidence}</span>
            </div>
          </div>

          {/* Card identity */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="font-black text-sm uppercase tracking-wide mb-3">Card Identification</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {[
                ['Player',    result.player],
                ['Year',      result.year],
                ['Brand',     result.brand],
                ['Set',       result.set],
                ['Parallel',  result.parallel],
                ['Sport',     result.sport],
                ['League',    result.league],
                ['Team',      result.team],
                ['Card #',    result.cardNumber],
                ['Condition', result.condition],
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

          {/* Notes */}
          {result.notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <p className="text-sm text-gray-700">{result.notes}</p>
            </div>
          )}

          {/* Grading note */}
          {result.worthGrading && result.gradingNote && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="font-black text-xs uppercase tracking-wide text-green-700 mb-1">🏅 Worth Grading</p>
              <p className="text-sm text-green-800">{result.gradingNote}</p>
            </div>
          )}

          <button onClick={reset} className="w-full border border-gray-200 text-gray-500 py-2 rounded-2xl text-sm hover:bg-gray-50 transition-colors">
            Appraise another card
          </button>
        </div>
      )}
    </div>
  )
}
