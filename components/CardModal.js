'use client'
import { useEffect } from 'react'

// Apply Cloudinary trim+pad transformation so card fills frame cleanly
function cardImg(url) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', '/upload/e_trim:20,c_pad,ar_3:4,b_white,w_800/')
}

export default function CardModal({ card, onClose, onRefresh }) {
  const f = card.fields

  const gain = f['Estimated Value'] && f['Cost Paid']
    ? f['Estimated Value'] - f['Cost Paid']
    : null

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end pt-3 pr-4">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none font-light">
            ×
          </button>
        </div>

        {/* Images */}
        <div className="px-5 flex gap-3">
          {f['Front Image URL'] ? (
            <img
              src={cardImg(f['Front Image URL'])}
              alt={f.Player}
              className={`rounded-xl object-cover ${f['Back Image URL'] ? 'w-1/2 aspect-[3/4]' : 'w-full aspect-[3/4]'}`}
            />
          ) : (
            <div className="w-full aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              <div className="text-center"><span className="text-5xl block">🃏</span><span className="text-sm mt-2 block">No Image</span></div>
            </div>
          )}
          {f['Back Image URL'] && (
            <img src={cardImg(f['Back Image URL'])} alt="Back" className="w-1/2 aspect-[3/4] rounded-xl object-cover" />
          )}
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{f.Player}</h2>
            <p className="text-gray-500 mt-0.5">
              {[f.Year, f.Brand, f.Set].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-2">
            {f.Sport && <Chip color="blue">{f.Sport}</Chip>}
            {f.Condition && <Chip color="green">{f.Condition}</Chip>}
            {f['Card Number'] && <Chip color="gray">#{f['Card Number']}</Chip>}
            {f['Parallel / Variant'] && <Chip color="purple">{f['Parallel / Variant']}</Chip>}
            {f['Serial Number'] && <Chip color="orange">{f['Serial Number']}</Chip>}
            {f.Tags?.map((t) => <Chip key={t} color="gray">{t}</Chip>)}
          </div>

          {/* Cost / Value */}
          {(f['Cost Paid'] != null || f['Estimated Value'] != null) && (
            <div className="grid grid-cols-2 gap-3">
              {f['Cost Paid'] != null && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Cost</p>
                  <p className="font-bold text-xl mt-0.5">${Number(f['Cost Paid']).toLocaleString()}</p>
                </div>
              )}
              {f['Estimated Value'] != null && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Value</p>
                  <p className={`font-bold text-xl mt-0.5 ${gain != null && gain > 0 ? 'text-green-600' : gain != null && gain < 0 ? 'text-red-500' : ''}`}>
                    ${Number(f['Estimated Value']).toLocaleString()}
                  </p>
                  {gain != null && (
                    <p className={`text-xs font-medium ${gain >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {gain >= 0 ? '+' : ''}${gain.toLocaleString()} gain
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grading ROI */}
          {(f['PSA 8 Value'] || f['PSA 9 Value'] || f['PSA 10 Value']) && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Graded Values</p>
              <div className="grid grid-cols-3 gap-2">
                {f['PSA 8 Value'] && (
                  <div className="bg-green-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">PSA 8</p>
                    <p className="font-bold text-sm">${Number(f['PSA 8 Value']).toLocaleString()}</p>
                  </div>
                )}
                {f['PSA 9 Value'] && (
                  <div className="bg-teal-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">PSA 9</p>
                    <p className="font-bold text-sm">${Number(f['PSA 9 Value']).toLocaleString()}</p>
                  </div>
                )}
                {f['PSA 10 Value'] && (
                  <div className="bg-blue-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">PSA 10</p>
                    <p className="font-bold text-sm">${Number(f['PSA 10 Value']).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* For Sale banner */}
          {f['For Sale'] && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 font-semibold text-sm uppercase tracking-wide">Listed for Sale</p>
              {f['Asking Price'] && (
                <p className="text-2xl font-black text-green-700 mt-0.5">
                  ${Number(f['Asking Price']).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {f.Notes && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">{f.Notes}</p>
            </div>
          )}

          {f['Date Added'] && (
            <p className="text-xs text-gray-400 text-right">Added {f['Date Added']}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ children, color = 'gray' }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    teal: 'bg-teal-100 text-teal-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    gray: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`text-sm font-medium px-3 py-1 rounded-full ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}
