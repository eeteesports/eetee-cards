'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'

const GRADE_COLOR = {
  '10': 'text-green-600 bg-green-50 border-green-200',
  '9':  'text-green-600 bg-green-50 border-green-200',
  '8':  'text-blue-600 bg-blue-50 border-blue-200',
  '7':  'text-yellow-600 bg-yellow-50 border-yellow-200',
  '6':  'text-orange-600 bg-orange-50 border-orange-200',
  '5':  'text-red-600 bg-red-50 border-red-200',
}

function CenteringVisual({ left, right, top, bottom }) {
  if (!left) return null
  const totalH = left + right || 100
  const totalV = top + bottom || 100
  const leftPct  = (left  / totalH * 100).toFixed(1)
  const rightPct = (right / totalH * 100).toFixed(1)
  const topPct   = (top   / totalV * 100).toFixed(1)
  const botPct   = (bottom / totalV * 100).toFixed(1)

  return (
    <div className="relative w-48 h-64 mx-auto my-4">
      {/* Outer card */}
      <div className="absolute inset-0 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center">
        {/* Inner design area */}
        <div
          className="bg-gradient-to-br from-blue-400 to-blue-700 rounded"
          style={{
            width:  `${Math.max(20, 100 - left - right) * 0.7}%`,
            height: `${Math.max(20, 100 - top - bottom) * 0.7}%`,
            marginLeft: `${(left - right) * 0.3}%`,
            marginTop:  `${(top - bottom) * 0.3}%`,
          }}
        />
      </div>
      {/* Labels */}
      <div className="absolute -top-5 w-full text-center text-xs font-bold text-gray-500">Top {topPct}%</div>
      <div className="absolute -bottom-5 w-full text-center text-xs font-bold text-gray-500">Bottom {botPct}%</div>
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 whitespace-nowrap" style={{writingMode:'vertical-rl', transform:'rotate(180deg)'}}>L {leftPct}%</div>
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 whitespace-nowrap" style={{writingMode:'vertical-rl'}}>R {rightPct}%</div>
    </div>
  )
}

export default function CenteringPage() {
  const [imgSrc, setImgSrc]       = useState(null)
  const [imgFile, setImgFile]     = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    setResult(null)
    setError(null)

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setImgSrc(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!imgFile) return
    setAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      // Upload to Cloudinary first
      const formData = new FormData()
      formData.append('file', imgFile)
      formData.append('upload_preset', 'eetee-cards-unsigned')
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/dgfukcdmz/image/upload`, {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadData.secure_url) throw new Error('Upload failed')

      // Analyze centering
      const res = await fetch('/api/centering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.secure_url }),
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

  const gradeColors = result ? (GRADE_COLOR[result.grade] || 'text-gray-600 bg-gray-50 border-gray-200') : ''

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/tools" className="text-gray-400 hover:text-gray-700 text-sm">← Tools</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-black uppercase tracking-widest">📐 Centering Calculator</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Upload a card photo to get an AI-powered centering analysis and estimated grade impact.
      </p>

      {/* Upload */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
      >
        {imgSrc ? (
          <img src={imgSrc} alt="Card" className="max-h-48 mx-auto rounded-xl object-contain" />
        ) : (
          <>
            <p className="text-4xl mb-2">🃏</p>
            <p className="text-gray-500 text-sm">Tap to upload card photo</p>
            <p className="text-gray-400 text-xs mt-1">Works best with a clear, well-lit front image showing all four borders</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {imgSrc && !result && (
        <button
          onClick={analyze}
          disabled={analyzing}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-2xl font-black uppercase tracking-wide disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {analyzing ? '🔍 Analyzing...' : '📐 Analyze Centering'}
        </button>
      )}

      {imgSrc && result && (
        <button
          onClick={() => { setImgSrc(null); setImgFile(null); setResult(null) }}
          className="w-full mt-4 border border-gray-200 text-gray-500 py-2 rounded-2xl text-sm hover:bg-gray-50 transition-colors"
        >
          Analyze another card
        </button>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {analyzing && (
        <div className="mt-6 text-center text-gray-500 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-2" />
          <p>Claude is measuring borders...</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {/* Grade badge */}
          <div className={`border-2 rounded-2xl p-5 ${gradeColors}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-70">Centering Grade</p>
                <p className="text-5xl font-black mt-1">{result.grade}</p>
                <p className="text-sm font-bold mt-0.5">{result.gradeLabel}</p>
              </div>
              <div className="text-right space-y-1">
                <div className="text-2xl font-black">{result.leftRightRatio}</div>
                <p className="text-xs opacity-70">Left / Right</p>
                <div className="text-2xl font-black mt-1">{result.topBottomRatio}</div>
                <p className="text-xs opacity-70">Top / Bottom</p>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <p className="font-black text-sm uppercase tracking-wide text-center mb-2">Border Distribution</p>
            <CenteringVisual
              left={result.leftBorder}
              right={result.rightBorder}
              top={result.topBorder}
              bottom={result.bottomBorder}
            />
          </div>

          {/* Verdict */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="font-black text-sm uppercase tracking-wide mb-1">Analysis</p>
            <p className="text-gray-700 text-sm">{result.verdict}</p>
            <p className="text-xs text-gray-400 mt-2">Confidence: {result.confidence}</p>
          </div>

          {/* PSA reference */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="font-black text-sm uppercase tracking-wide mb-2">PSA Centering Standards</p>
            <div className="space-y-1">
              {[
                { grade: '10', req: '55/45', color: 'text-green-600' },
                { grade: '9',  req: '60/40', color: 'text-green-600' },
                { grade: '8',  req: '65/35', color: 'text-blue-600'  },
                { grade: '7',  req: '70/30', color: 'text-yellow-600' },
                { grade: '6',  req: '75/25', color: 'text-orange-600' },
              ].map(({ grade, req, color }) => (
                <div key={grade} className={`flex justify-between text-xs ${result.grade === grade ? 'font-black' : 'text-gray-500'}`}>
                  <span className={result.grade === grade ? color : ''}>PSA {grade}</span>
                  <span className={result.grade === grade ? color : ''}>{req} or better</span>
                  {result.grade === grade && <span className={color}>← You</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
