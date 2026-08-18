'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS_BY_LEAGUE } from '@/app/add/teams'

// Inline League -> Team picker for the homepage hero's "Shop by Team" box
// (2026-08-17, rebuilt from a modal into an inline pair of dropdowns per
// Evan's mockup). Same canonical roster as the Add Card page and the
// league-backfill script — one source of truth. Landing on /shop sorted
// high-to-low is Evan's explicit ask: browsing a team you follow starts
// with "what's my best stuff", not the cheapest filler.
const LEAGUE_OPTIONS = [
  { key: 'NFL', label: 'NFL' },
  { key: 'NBA', label: 'NBA' },
  { key: 'MLB', label: 'MLB' },
  { key: 'NCAA Basketball', label: 'NCAAB' },
  { key: 'NCAA Football', label: 'NCAAF' },
  { key: 'MLS', label: 'Soccer' },
]

export default function TeamShopBox() {
  const router = useRouter()
  const [league, setLeague] = useState('')

  const teams = useMemo(() => (league ? TEAMS_BY_LEAGUE[league] || [] : []), [league])

  function goTeam(team) {
    if (!team) return
    router.push(`/shop?league=${encodeURIComponent(league)}&team=${encodeURIComponent(team)}&sort=price_desc`)
  }

  return (
    <div className="bg-royal-600 rounded-2xl p-4 text-white flex flex-col">
      <div className="text-2xl mb-1.5">🏟️</div>
      <p className="font-display font-semibold text-sm">Shop by Team</p>
      <p className="text-xs text-royal-100 mt-0.5 mb-3">Pick a league, then a team</p>

      <select
        value={league}
        onChange={(e) => setLeague(e.target.value)}
        className="w-full bg-white/10 border border-white/25 text-white rounded-lg px-2.5 py-2 text-xs mb-2 focus:outline-none focus:border-white/60 [&>option]:text-gray-900"
      >
        <option value="">League…</option>
        {LEAGUE_OPTIONS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
      </select>

      <select
        value=""
        onChange={(e) => goTeam(e.target.value)}
        disabled={!league}
        className="w-full bg-white/10 border border-white/25 text-white rounded-lg px-2.5 py-2 text-xs disabled:opacity-40 focus:outline-none focus:border-white/60 [&>option]:text-gray-900"
      >
        <option value="">{league ? 'Team…' : 'Pick a league first'}</option>
        {teams.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}
