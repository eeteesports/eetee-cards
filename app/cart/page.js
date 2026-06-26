'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_400/')
}

export default function CartPage() {
  const { items, remove, clear } = useCart()

  const [offerAmounts, setOfferAmounts] = useState({}) // { [cardId]: amount string }
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const setOffer = (id, val) => setOfferAmounts((p) => ({ ...p, [id]: val }))
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const totalAsking = items.reduce((s, c) => s + (c.fields?.['Asking Price'] || 0), 0)
  const totalOffered = items.reduce((s, c) => {
    const custom = parseFloat(offerAmounts[c.id])
    return s + (isNaN(custom) ? (c.fields?.['Asking Price'] || 0) : custom)
  }, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        buyerName: form.name,
        buyerEmail: form.email,
        buyerPhone: form.phone,
        message: form.message,
        items: items.map((c) => {
          const custom = parseFloat(offerAmounts[c.id])
          return {
            cardName: c.fields?.['Card Name'] || c.fields?.['Player'],
            player: c.fields?.['Player'],
            askingPrice: c.fields?.['Asking Price'] || 0,
            offerAmount: isNaN(custom) ? null : custom,
          }
        }),
      }
      const res = await fetch('/api/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Send failed')
      clear()
      setDone(true)
    } catch {
      setError('Something went wrong — please try again or email eeteesports@gmail.com directly.')
    }
    setSubmitting(false)
  }

  // ── Done state ──
  if (done) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-black">Offer Sent!</h2>
        <p className="text-gray-500 mt-2 max-w-sm">
          Evan will review your offer and reach out to you by email. Keep an eye on your inbox!
        </p>
        <Link href="/collection" className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm">
          Keep Browsing
        </Link>
      </div>
    )
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-4">🛒</div>
        <h2 className="text-2xl font-black">Your cart is empty</h2>
        <p className="text-gray-500 mt-2">Browse the collection and add cards you're interested in.</p>
        <Link href="/collection?forSale=true" className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm">
          Browse Cards for Sale
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black uppercase tracking-widest">🛒 Your Cart</h1>
        <button onClick={clear} className="text-sm text-red-400 hover:text-red-600 font-medium">
          Clear all
        </button>
      </div>

      {/* Card list */}
      <div className="space-y-3 mb-6">
        {items.map((card) => {
          const f = card.fields || {}
          const askingPrice = f['Asking Price']
          return (
            <div key={card.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4">
              {/* Image */}
              <div className="flex-shrink-0 w-16">
                {f['Front Image URL'] ? (
                  <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover rounded-lg" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center text-2xl">🃏</div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{f.Player || 'Unknown Player'}</p>
                <p className="text-sm text-gray-500 truncate">{[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}</p>
                {f['Parallel / Variant'] && (
                  <p className="text-xs text-purple-600 font-medium mt-0.5">{f['Parallel / Variant']}</p>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Asking</p>
                    <p className="font-bold text-gray-800">
                      {askingPrice ? `$${Number(askingPrice).toLocaleString()}` : 'Make offer'}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium">Your offer (optional)</p>
                    <div className="relative mt-0.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={offerAmounts[card.id] || ''}
                        onChange={(e) => setOffer(card.id, e.target.value)}
                        placeholder={askingPrice ? askingPrice.toString() : '0'}
                        className="w-full border border-gray-200 rounded-lg pl-6 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Remove */}
              <button onClick={() => remove(card.id)} className="text-gray-300 hover:text-red-400 text-xl self-start flex-shrink-0">
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Asking</p>
          <p className="text-xl font-black">${totalAsking.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Your Total Offer</p>
          <p className={`text-xl font-black ${totalOffered < totalAsking ? 'text-blue-600' : 'text-green-600'}`}>
            ${totalOffered.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Buyer form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <h2 className="font-black text-lg uppercase tracking-wide">Your Info</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Your Name *" value={form.name} onChange={(v) => setF('name', v)} placeholder="John Smith" />
          <Field label="Email *" value={form.email} onChange={(v) => setF('email', v)} type="email" placeholder="john@email.com" />
        </div>
        <Field label="Phone (optional)" value={form.phone} onChange={(v) => setF('phone', v)} type="tel" placeholder="555-555-5555" />

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message (optional)</label>
          <textarea
            value={form.message}
            onChange={(e) => setF('message', e.target.value)}
            placeholder="Any questions, bundle requests, or context about your offer…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 mt-1 text-sm h-24 resize-none focus:outline-none focus:border-blue-400"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-black text-base disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Sending offer…' : `💰 Send Offer — $${totalOffered.toLocaleString()}`}
        </button>

        <p className="text-xs text-center text-gray-400">
          Evan will review your offer and respond to your email directly.
        </p>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
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
