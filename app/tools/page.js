import Link from 'next/link'

const TOOLS = [
  {
    href:    '/tools/lot',
    emoji:   '📦',
    title:   'Lot Value Calculator',
    desc:    'Build a lot from your collection or enter cards manually, then get total value and a suggested buy/sell price.',
    tags:    ['Buying', 'Selling', 'Negotiation'],
    color:   'border-blue-200 hover:border-blue-400 hover:bg-blue-50/40',
  },
  {
    href:    '/tools/centering',
    emoji:   '📐',
    title:   'Centering Calculator',
    desc:    "Upload a card photo and Claude Vision measures all four borders to estimate centering ratios and PSA grade impact.",
    tags:    ['Grading', 'Vision AI'],
    color:   'border-purple-200 hover:border-purple-400 hover:bg-purple-50/40',
  },
  {
    href:    '/tools/grading',
    emoji:   '🏅',
    title:   'Grading Recommendations',
    desc:    'AI scans your ungraded collection and ranks which cards deliver the best ROI when submitted to PSA or BGS.',
    tags:    ['Grading', 'ROI', 'PSA'],
    color:   'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50/40',
  },
  {
    href:    '/tools/appraise',
    emoji:   '🔎',
    title:   'Card Appraiser',
    desc:    "Search by keyword or snap a photo — get real eBay sold prices + AI estimate instantly. Perfect for card shows and flea markets.",
    tags:    ['eBay Sales', 'Vision AI', 'Quick Lookup'],
    color:   'border-green-200 hover:border-green-400 hover:bg-green-50/40',
  },
]

export default function ToolsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-widest">🛠️ Tools</h1>
        <p className="text-gray-500 mt-1">Standalone card tools — no collection required.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map(({ href, emoji, title, desc, tags, color }) => (
          <Link
            key={href}
            href={href}
            className={`block border-2 rounded-2xl p-5 transition-all ${color}`}
          >
            <p className="text-4xl mb-2">{emoji}</p>
            <p className="font-black text-lg">{title}</p>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">{desc}</p>
            <div className="flex gap-1.5 flex-wrap mt-3">
              {tags.map((t) => (
                <span key={t} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* Buying assistant cross-link */}
      <div className="mt-6 bg-[#0f1b35] text-white rounded-2xl p-5 flex items-center gap-4">
        <span className="text-4xl">🔭</span>
        <div>
          <p className="font-black">Buying Assistant</p>
          <p className="text-blue-300 text-sm">Rate any deal 1-10 or get AI buying suggestions by sport and budget.</p>
        </div>
        <Link href="/scout" className="ml-auto bg-blue-600 text-white text-sm font-black px-4 py-2 rounded-xl hover:bg-blue-500 transition-colors flex-shrink-0">
          Open →
        </Link>
      </div>
    </div>
  )
}
