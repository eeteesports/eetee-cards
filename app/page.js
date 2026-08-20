'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import CardModal from '@/components/CardModal'
import CardBadges from '@/components/CardBadges'
import TeamPicker from '@/components/TeamPicker'
import TeamShopBox from '@/components/TeamShopBox'
import WordmarkGraphic from '@/components/WordmarkGraphic'
import { PRICE_BINS, binForPrice } from '@/lib/priceBins'
import { formatPrice } from '@/lib/format'
import { DEALS } from '@/lib/deals'

function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_600/')
}

// Fisher-Yates — used to keep "Fresh Rookies" and "Under $1" from being
// 100% whichever team Evan's mid-batch on (he uploads inventory
// team-by-team, and both rows were otherwise just the newest matches).
function shuffled(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SPORT_TILES = [
  { sport: 'Football',   icon: '🏈' },
  { sport: 'Basketball', icon: '🏀' },
  { sport: 'Baseball',   icon: '⚾' },
  { sport: 'Hockey',     icon: '🏒' },
  { sport: 'Soccer',     icon: '⚽' },
]

// Curated landing page (brand refresh, 2026-08-17) — replaces the old
// homepage, which dropped visitors straight into the full filterable
// inventory grid (that experience now lives at /shop, unchanged). Modeled
// loosely on keegskards.com's home-vs-/shop split and, per Evan's ask, an
// Amazon-style landing: categories up top, a search bar that goes
// anywhere, and a few curated rows rather than one giant grid. One fetch
// of all for-sale cards (already sorted newest-first by the API) powers
// every section below — no extra round trips.
export default function Home() {
  const router = useRouter()
  const { add, remove, items } = useCart()
  const cartCount = items.length
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/cards?forSale=true')
      .then((r) => r.json())
      .then((d) => { setCards(d.records || []); setLoading(false) })
  }, [])

  function submitSearch(e) {
    e.preventDefault()
    router.push(search.trim() ? `/shop?q=${encodeURIComponent(search.trim())}` : '/shop')
  }

  const recentlyAdded = cards.slice(0, 12)
  // Randomized (not just newest-first) so a single upload batch — Evan
  // adds inventory team-by-team — doesn't make these rows look like the
  // catalog is one team. Reshuffles on each fresh page load, but memoized
  // on `cards` so it doesn't reshuffle out from under someone mid-browse
  // (cart clicks, search typing, etc. re-render without a new fetch).
  const deals = useMemo(() => shuffled(cards.filter((c) => {
    const p = c.fields['Asking Price']
    return p != null && p <= 1
  })).slice(0, 12), [cards])
  const rookies = useMemo(() => shuffled(cards.filter((c) => c.fields.Rookie)).slice(0, 12), [cards])

  const sportCounts = cards.reduce((acc, c) => {
    const s = c.fields.Sport
    if (s) acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const dollarDeal = DEALS.find((d) => d.binKey === 'one-dollar')
  const fiftyCentDeal = DEALS.find((d) => d.binKey === 'fifty-cent')

  return (
    <div className="min-h-screen bg-royal-600">
      {/* Header — full-bleed, no side rails here */}
      <div className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/eetee-logo.png" alt="eetee Cards" className="w-9 h-9 object-contain" />
            <p className="font-display font-semibold text-lg tracking-tight">eetee Cards</p>
          </Link>

          <form onSubmit={submitSearch} className="flex-1 min-w-[200px] max-w-xl">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players, sets, teams, brands…"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 flex-shrink-0">
            <TeamPicker />
            <Link href="/cart" className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">
              <span className="text-lg">🛒</span>
              <span className="text-sm font-semibold hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-navy-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Category quick-nav — sport + price, Amazon-style */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <Link href="/shop" className="flex-shrink-0 text-xs font-semibold bg-white text-navy-900 px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors">
            Shop All
          </Link>
          {SPORT_TILES.map(({ sport, icon }) => (
            <Link key={sport} href={`/shop?sport=${sport}`}
              className="flex-shrink-0 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
              {icon} {sport}
            </Link>
          ))}
          <span className="w-px h-4 bg-white/20 flex-shrink-0" />
          {PRICE_BINS.slice(0, 4).map((b) => (
            <Link key={b.key} href={`/shop?bin=${b.key}`}
              className="flex-shrink-0 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
              {b.shortLabel}
            </Link>
          ))}
        </div>
      </div>

      {/* Rail-framed content column — the royal-600 page background shows
          as side rails on wide viewports, matching Evan's mockup. Runs
          the full remaining page height (hero through footer). */}
      <div className="max-w-7xl mx-auto bg-gray-50">
        {/* Welcome hero — logo watermark, Shop Now CTA, 4 quick-nav boxes */}
        <div className="relative overflow-hidden border-b border-gray-100">
          <img
            src="/eetee-logo-watermark.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute -left-24 top-1/2 -translate-y-1/2 w-[420px] max-w-none opacity-[0.035] grayscale"
          />
          <div className="relative px-4 py-10 text-center">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <img src="/eetee-logo.png" alt="" className="w-20 h-20 object-contain flex-shrink-0" />
              <WordmarkGraphic className="h-24 w-auto max-w-full" />
            </div>

            {/* One unified row of equal-weight tiles — a separate "Shop Now"
                button above this row used to compete with it for primary-
                action attention; now Shop Now IS the first tile. Shop by
                Team moved to its own section below (see "Shop by Team"),
                since its two-dropdown interaction didn't match the plain
                single-click feel of its old siblings here. */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
              <ValueBox href="/shop" icon="🛍️" label="Shop Now" sub="Browse everything" />
              <ValueBox href="/shop?priceMin=25" icon="💎" label="High End Cards" sub="$25 and up" />
              <ValueBox
                href="/shop?bin=one-dollar" icon="💵" label="$1 Value Box"
                ribbon={dollarDeal ? `${dollarDeal.buyQty} for ${dollarDeal.freeQty} free` : null}
              />
              <ValueBox
                href="/shop?bin=fifty-cent" icon="🪙" label="50¢ Value Box"
                ribbon={fiftyCentDeal ? `${fiftyCentDeal.buyQty} for ${fiftyCentDeal.freeQty} free` : null}
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-8 space-y-10">
          {/* Rookie hero band */}
          {rookies.length > 0 && (
            <Row
              title="Fresh Rookies"
              eyebrow="Just landed"
              href="/shop?rookie=true"
              cards={rookies}
              loading={loading}
              items={items}
              onAdd={add}
              onRemove={remove}
              onOpen={setSelected}
            />
          )}

          <Row
            title="Recently Added"
            eyebrow="New to the collection"
            href="/shop"
            cards={recentlyAdded}
            loading={loading}
            items={items}
            onAdd={add}
            onRemove={remove}
            onOpen={setSelected}
          />

          {deals.length > 0 && (
            <Row
              title="Under $1"
              eyebrow="Deals"
              href="/shop?bin=one-dollar"
              cards={deals}
              loading={loading}
              items={items}
              onAdd={add}
              onRemove={remove}
              onOpen={setSelected}
            />
          )}

          {/* Shop by sport tiles */}
          {Object.keys(sportCounts).length > 1 && (
            <div>
              <h2 className="font-display font-semibold text-xl text-gray-900 mb-3">Shop by Sport</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {SPORT_TILES.filter(({ sport }) => sportCounts[sport]).map(({ sport, icon }) => (
                  <Link key={sport} href={`/shop?sport=${sport}`}
                    className="bg-white border border-gray-200 rounded-2xl p-5 text-center hover:border-navy-300 hover:shadow-md transition-all group">
                    <div className="text-3xl mb-2">{icon}</div>
                    <p className="font-display font-semibold text-sm text-gray-900 group-hover:text-navy-700">{sport}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sportCounts[sport]} cards</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Shop by Team — moved out of the top quick-action row (its two-
              dropdown interaction didn't match the single-click feel of
              the other tiles there); paired here with Shop by Sport since
              they're the same idea (browse by category), just a level
              deeper. */}
          <div>
            <h2 className="font-display font-semibold text-xl text-gray-900 mb-3">Shop by Team</h2>
            <TeamShopBox />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200">
          <div className="px-4 py-6 flex items-center justify-between text-sm text-gray-400 flex-wrap gap-2">
            <span>© eetee Cards</span>
            <div className="flex gap-4">
              <a href="mailto:eeteecards@gmail.com" className="hover:text-gray-600 transition-colors">Contact</a>
              <Link href="/login" className="hover:text-gray-600 transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Link href="/cart" className="flex items-center gap-3 bg-navy-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-semibold text-sm hover:bg-navy-800 transition-colors">
            <span>🛒</span>
            <span>{cartCount} card{cartCount !== 1 ? 's' : ''} in cart</span>
            <span className="bg-gold-400 text-navy-900 text-xs px-2 py-0.5 rounded-lg font-bold">View Cart →</span>
          </Link>
        </div>
      )}

      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// One of the three link-based hero boxes (Team box is its own component —
// it needs interactive dropdowns, not just a link). Gradient + shadow +
// an icon "chip" instead of a bare emoji — a flat solid-color rounded
// rectangle read as a slide-deck placeholder, not a real storefront tile.
function ValueBox({ href, icon, label, sub, ribbon }) {
  return (
    <Link
      href={href}
      className="group relative block bg-gradient-to-br from-royal-500 to-royal-700 rounded-2xl p-4 text-white
        shadow-[0_8px_20px_-6px_rgba(19,44,104,0.55)] ring-1 ring-white/10
        transition-all duration-150 hover:shadow-[0_14px_28px_-8px_rgba(19,44,104,0.65)] hover:-translate-y-0.5"
    >
      {ribbon && (
        <span className="absolute top-2.5 right-2.5 bg-gold-400 text-navy-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          {ribbon}
        </span>
      )}
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl mb-2.5 group-hover:bg-white/20 transition-colors">
        {icon}
      </div>
      <p className="font-display font-semibold text-sm">{label}</p>
      {sub && <p className="text-xs text-royal-100 mt-0.5">{sub}</p>}
    </Link>
  )
}

// One horizontally-scrolling curated row — used for Rookies / Recently
// Added / Deals. All three sections share the exact same card treatment
// as /shop's grid (badges, price, +Cart) just laid out in a rack.
function Row({ title, eyebrow, href, cards, loading, items, onAdd, onRemove, onOpen }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-navy-500">{eyebrow}</p>
          <h2 className="font-display font-semibold text-xl text-gray-900">{title}</h2>
        </div>
        <Link href={href} className="text-sm font-semibold text-navy-700 hover:underline flex-shrink-0">
          See all →
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-40 flex-shrink-0 bg-white rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-100" />
              <div className="p-2.5 space-y-2">
                <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {cards.map((card) => {
            const f = card.fields
            const inCart = items.some((i) => i.id === card.id)
            const bin = binForPrice(f['Asking Price'])
            return (
              <div key={card.id} className="w-40 flex-shrink-0 bg-white rounded-b-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150">
                <div className="relative cursor-pointer" onClick={() => onOpen(card)}>
                  <CardBadges fields={f} size="sm" />
                  {/* Square corners on the photo itself — corner sharpness is real grading signal. */}
                  {f['Front Image URL'] ? (
                    <img src={cardImg(f['Front Image URL'])} alt={f.Player} className="w-full aspect-[3/4] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-3xl text-gray-300">🃏</div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="font-semibold text-xs truncate text-gray-900">{f.Player || 'Unknown'}</p>
                  {f['Parallel / Variant'] && (
                    <p className="text-royal-600 text-[11px] font-bold truncate mt-0.5">{f['Parallel / Variant']}</p>
                  )}
                  <p className="text-gray-400 text-[11px] truncate mt-0.5">{[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}</p>
                  {bin && (bin.key === 'fifty-cent' || bin.key === 'one-dollar') && (
                    <span className="inline-block mt-1 text-[10px] bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded-full font-semibold">{bin.label}</span>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="font-display font-semibold text-navy-900 text-xs">
                      {f['Asking Price'] != null ? formatPrice(f['Asking Price']) : 'Contact'}
                    </p>
                    {f['Asking Price'] == null ? (
                      <a href={`mailto:eeteecards@gmail.com?subject=${encodeURIComponent(`Pricing for ${f.Player || 'a card'}`)}`}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-green-300 text-green-700 hover:bg-green-50 transition-colors">
                        ✉️ Ask
                      </a>
                    ) : (
                      <button
                        onClick={() => inCart ? onRemove(card.id) : onAdd(card)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                          inCart ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {inCart ? '✓' : '+ Cart'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
