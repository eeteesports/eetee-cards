'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

// "Pick your team" nav entry — Evan's most-requested browse path from real
// buyer conversations ("well, what [team] cards do you have?"). Only lists
// teams that actually have for-sale inventory right now (derived from the
// live for-sale cards, not the full static league roster in app/add/teams.js
// which would show teams with zero cards).
export default function TeamPicker({ className = '' }) {
  const [open, setOpen] = useState(false)
  const [teams, setTeams] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    fetch('/api/cards?forSale=true')
      .then((r) => r.json())
      .then((d) => {
        const counts = {}
        for (const c of d.records || []) {
          const t = c.fields?.Team
          if (!t) continue
          counts[t] = (counts[t] || 0) + 1
        }
        const list = Object.entries(counts)
          .map(([team, count]) => ({ team, count }))
          .sort((a, b) => b.count - a.count)
        setTeams(list)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (teams.length === 0) return null

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
      >
        🏈 Pick Your Team <span className="text-[10px] opacity-70">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 max-h-96 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-2">
          {teams.map(({ team, count }) => (
            <Link
              key={team}
              href={`/team/${encodeURIComponent(team)}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-sm text-gray-800 transition-colors"
            >
              <span className="font-medium truncate">{team}</span>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
