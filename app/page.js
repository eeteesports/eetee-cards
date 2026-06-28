'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import CardModal from '@/components/CardModal'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_400/')
}

export default function PublicHome() {
  const [cards, setCards] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cards?forSale=true')
      .then((r) => r.json())
      .then((d) => { setCards(d.records || []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative bg-[#0f1b35] text-white overflow-hidden">
        {/* Large watermark logo — far right, half-cropped */}
        <img
          src="https://res.cloudinary.com/dgfukcdmz/image/upload/eetee-cards/eetee-logo.png"
          alt=""
          aria-hidden="true"
          className="absolute -right-16 top-1/2 -translate-y-1/2 w-80 h-80 object-cover rounded-full opacity-10 pointer-events-none select-none"
        />
        {/* Subtle radial glow behind the logo */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Decorative circles — top-left cluster */}
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -top-4 -left-4 w-32 h-32 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute top-6 left-6 w-16 h-16 rounded-full bg-blue-600/20 pointer-events-none" />

        {/* Diagonal stripe accent */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, white 0px, white 1px, transparent 1px, transparent 24px)',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 flex flex-col items-center text-center">
          <img
            src="https://res.cloudinary.com/dgfukcdmz/image/upload/eetee-cards/eetee-logo.png"
            alt="eetee Sports"
            className="w-28 h-28 rounded-full object-cover ring-4 ring-white/20 mb-6 shadow-2xl"
          />
          <h1 className="text-5xl md:text-6xl font-black tracking-widest uppercase mb-3">
            eetee Sports
          </h1>
          <p className="text-blue-300 text-lg mb-2 max-w-md">
            A personal collection of sports cards — curated, graded, and ready to find new homes.
          </p>
          <p className="text-blue-400 text-sm mb-8">Detroit roots. Card collector since the '90s.</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/store"
              className="bg-white text-[#0f1b35] font-black px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-lg"
            >
              🏷️ Browse Cards for Sale
            </Link>
            <a
              href="mailto:thomas.j.evan@gmail.com"
              className="border border-white/30 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors"
            >
              ✉️ Make an Offer
            </a>
          </div>
        </div>
      </div>

      {/* For Sale Preview */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-xl uppercase tracking-wide">Cards for Sale</h2>
          <Link href="/store" className="text-blue-600 text-sm font-semibold hover:underline">
            View all →
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && cards.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-4xl mb-3">🃏</p>
            <p className="text-gray-400 text-sm">No cards listed for sale right now.</p>
            <p className="text-gray-400 text-sm mt-1">
              <a href="mailto:thomas.j.evan@gmail.com" className="text-blue-600 hover:underline">
                Reach out
              </a>{' '}
              if you're interested in something specific.
            </p>
          </div>
        )}

        {!loading && cards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {cards.map((card) => {
              const f = card.fields
              return (
                <div
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                >
                  <div className="aspect-[3/4] bg-gray-50 overflow-hidden">
                    {f['Front Image URL'] ? (
                      <img
                        src={cardImg(f['Front Image URL'])}
                        alt={f.Player}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🃏</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm text-gray-900 truncate">{f.Player}</p>
                    <p className="text-xs text-gray-400 truncate">{[f.Year, f.Set].filter(Boolean).join(' · ')}</p>
                    {f['Asking Price'] && (
                      <p className="text-sm font-black text-green-600 mt-1">${Number(f['Asking Price']).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-400">
          <span>© eetee Sports</span>
          <div className="flex gap-4">
            <a href="mailto:thomas.j.evan@gmail.com" className="hover:text-gray-600 transition-colors">Contact</a>
            <Link href="/store" className="hover:text-gray-600 transition-colors">Store</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Admin</Link>
          </div>
        </div>
      </div>

      {selected && (
        <CardModal card={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
