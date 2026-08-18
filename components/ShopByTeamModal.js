'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS_BY_LEAGUE } from '@/app/add/teams'

// Two-step "Shop by Team" picker for the homepage hero (added 2026-08-17).
// League -> Team, using the same canonical roster as the Add Card page
// and the league-backfill script — one source of truth for team names.
// "Non-Sports" has no roster (there's no team to pick), so choosing it
// jumps straight to /shop filtered to non-sport cards.
const LEAGUE_OPTIONS = [
  { key: 'NFL', label: 'NFL' },
  { key: 'NBA', label: 'NBA' },
  { key: 'MLB', label: 'MLB' },
  { key: 'NCAA Football', label: 'NCAAF' },
  { key: 'NCAA Basketball', label: 'NCAAB' },
  { key: 'Non-Sports', label: 'Non-Sports' },
]

export default function ShopByTeamModal({ onClose }) {
  const router = useRouter()
  const [league, setLeague] = useState('')
  const [team, setTeam] = useState('')

  const teams = useMemo(() => (league && league !== 'Non-Sports' ? TEAMS_BY_LEAGUE[league] || [] : []), [league])

  function chooseLeague(key) {
    setLeague(key)
    setTeam('')
    if (key === 'Non-Sports') {
      router.push('/shop?sport=Other')
    }
  }

  function goTeam(t) {
    router.push(`/shop?league=${encodeURIComponent(league)}&team=${encodeURIComponent(t)}`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-semibold text-lg text-gray-900">Shop by Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Pick a league, then a team.</p>

        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">League</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {LEAGUE_OPTIONS.map((l) => (
            <button
              key={l.key}
              onClick={() => chooseLeague(l.key)}
              className={`text-sm font-semibold px-2 py-2 rounded-lg border transition-colors ${
                league === l.key
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-navy-300'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {teams.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Team</p>
            <select
              value={team}
              onChange={(e) => { setTeam(e.target.value); if (e.target.value) goTeam(e.target.value) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-navy-400 bg-white"
            >
              <option value="">Select a team…</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </>
        )}
      </div>
    </div>
  )
}
