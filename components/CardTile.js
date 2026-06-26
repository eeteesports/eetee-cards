export default function CardTile({ card, onClick }) {
  const f = card.fields

  const conditionColor =
    f.Condition?.includes('PSA 10') || f.Condition?.includes('BGS 10')
      ? 'bg-blue-100 text-blue-800'
      : f.Condition?.includes('PSA 9') || f.Condition?.includes('BGS 9')
      ? 'bg-teal-100 text-teal-800'
      : f.Condition?.includes('PSA 8') || f.Condition?.includes('BGS 8')
      ? 'bg-green-100 text-green-800'
      : f.Condition?.includes('Mint')
      ? 'bg-green-100 text-green-800'
      : f.Condition?.includes('Near Mint')
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-600'

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
    >
      {/* Image area */}
      <div className="relative">
        {f['For Sale'] && (
          <span className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
            FOR SALE
          </span>
        )}
        {f.Condition && (
          <span className={`absolute top-2 right-2 z-10 text-xs font-semibold px-2 py-0.5 rounded ${conditionColor}`}>
            {f.Condition}
          </span>
        )}
        {f['Front Image URL'] ? (
          <img
            src={f['Front Image URL']}
            alt={f.Player}
            className="w-full aspect-[3/4] object-cover"
          />
        ) : (
          <div className="w-full aspect-[3/4] bg-gray-100 flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl">🃏</span>
            <span className="text-xs mt-1">No Image</span>
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-3">
        <p className="font-bold text-sm truncate text-gray-900">{f.Player || 'Unknown Player'}</p>
        <p className="text-gray-500 text-xs truncate mt-0.5">
          {[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}
        </p>

        <div className="flex flex-wrap gap-1 mt-2">
          {f.Sport && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {f.Sport}
            </span>
          )}
          {f.Tags?.slice(0, 1).map((t) => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>

        {f['Estimated Value'] != null && (
          <p className="text-right font-bold text-sm mt-2 text-gray-800">
            ${Number(f['Estimated Value']).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
