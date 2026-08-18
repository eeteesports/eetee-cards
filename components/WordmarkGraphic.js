// Hero wordmark (2026-08-18) — replaces the plain <h1>eetee Cards</h1> +
// <p>tagline</p> pairing, which read as default-template text next to the
// logo icon. This composes the two into one designed lockup: a soft card-
// shape badge behind the wordmark, a divider rule, and the tagline in a
// smaller, quieter weight — meant to read like real storefront signage
// rather than a slide title. Divider is royal blue, not gold — a design
// pass (2026-08-18) rationed gold sitewide to price/deal contexts only,
// so a purely decorative rule shouldn't compete with that.
export default function WordmarkGraphic({ className = '' }) {
  return (
    <svg
      viewBox="0 0 460 120"
      className={className}
      role="img"
      aria-label="eetee Cards — A family run sports hobby"
    >
      <defs>
        <linearGradient id="wm-card-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2151d3" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#132c68" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Two overlapping "card" shapes, faint, purely decorative — echoes
          the product without illustrating a literal card front. */}
      <rect x="6" y="14" width="60" height="82" rx="8" fill="url(#wm-card-fill)" stroke="#132c68" strokeOpacity="0.12" transform="rotate(-8 36 55)" />
      <rect x="18" y="10" width="60" height="82" rx="8" fill="url(#wm-card-fill)" stroke="#132c68" strokeOpacity="0.16" transform="rotate(4 48 51)" />

      <text
        x="100" y="58"
        style={{ font: '600 44px var(--font-display), sans-serif', letterSpacing: '-0.01em' }}
        fill="#1f2937"
      >
        eetee <tspan fill="#132c68">Cards</tspan>
      </text>

      {/* Royal divider rule */}
      <rect x="101" y="70" width="46" height="3" rx="1.5" fill="#2151d3" />

      <text
        x="100" y="95"
        style={{ font: '500 17px var(--font-sans), sans-serif' }}
        fill="#6b7280"
      >
        A family run sports hobby
      </text>
    </svg>
  )
}
