'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, Search, Check, CheckCheck } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'

export interface RailMember {
  id: string
  jerseyNumber: number | null
  name: string
  position: string | null
  /** Active (not-yet-done) sessions on the viewed day. */
  todayWorkoutCount: number
  /** Completed sessions on the viewed day. */
  todayCompletedCount: number
  activeInjuryCount: number
  activeRestrictionCount: number
}

interface TeamRosterRailProps {
  members: RailMember[]
  /** Link to the full Trupp tab. */
  rosterHref: string
}

type SortKey = 'position' | 'number'

export function TeamRosterRail({ members, rosterHref }: TeamRosterRailProps) {
  const t = useTranslations('coach.pages.teamDetail')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('position')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            (m.position?.toLowerCase().includes(q) ?? false) ||
            (m.jerseyNumber != null && String(m.jerseyNumber).includes(q))
        )
      : members

    return [...list].sort((a, b) => {
      if (sort === 'number') {
        return (a.jerseyNumber ?? Number.MAX_SAFE_INTEGER) - (b.jerseyNumber ?? Number.MAX_SAFE_INTEGER)
      }
      const posA = a.position ?? '~'
      const posB = b.position ?? '~'
      if (posA !== posB) return posA.localeCompare(posB, 'sv')
      return (a.jerseyNumber ?? Number.MAX_SAFE_INTEGER) - (b.jerseyNumber ?? Number.MAX_SAFE_INTEGER)
    })
  }, [members, query, sort])

  return (
    <div className="rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2 font-semibold dark:text-white">
          <Users className="h-4 w-4" />
          {t('cockpit.rail.title', { count: members.length })}
        </div>
        <Link href={rosterHref} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          {t('cockpit.rail.viewAll')}
        </Link>
      </div>

      <div className="flex items-center gap-2 px-4 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('cockpit.rail.searchPlaceholder')}
            className="w-full rounded-md border bg-transparent py-1.5 pl-7 pr-2 text-sm outline-none focus:border-blue-400 dark:border-white/10"
          />
        </div>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          aria-label={t('cockpit.rail.sortLabel')}
          className="rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-slate-900"
        >
          <option value="position">{t('cockpit.rail.sortPosition')}</option>
          <option value="number">{t('cockpit.rail.sortNumber')}</option>
        </select>
      </div>

      <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3.5rem] items-center gap-2 border-b px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground dark:border-white/10">
        <span>#</span>
        <span>{t('cockpit.rail.colName')}</span>
        <span>{t('cockpit.rail.colPos')}</span>
        <span className="text-center">{t('cockpit.rail.colWorkout')}</span>
        <span className="text-center">{t('cockpit.rail.colStatus')}</span>
      </div>

      <div className="max-h-[28rem] divide-y overflow-y-auto dark:divide-white/5">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {t('cockpit.rail.empty')}
          </p>
        ) : (
          filtered.map((member) => <RosterRow key={member.id} member={member} />)
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2 text-[11px] text-muted-foreground dark:border-white/10">
        <LegendDot className="bg-emerald-500" label={t('cockpit.rail.legendHealthy')} />
        <LegendDot className="bg-amber-500" label={t('cockpit.rail.legendLimited')} />
        <LegendDot className="bg-red-500" label={t('cockpit.rail.legendInjured')} />
        <span>{t('cockpit.rail.legendRestrictions')}</span>
      </div>
    </div>
  )
}

function RosterRow({ member }: { member: RailMember }) {
  const done = member.todayCompletedCount > 0 && member.todayWorkoutCount === 0
  const assigned = member.todayWorkoutCount > 0
  const statusColor =
    member.activeInjuryCount > 0
      ? 'bg-red-500'
      : member.activeRestrictionCount > 0
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  return (
    <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3.5rem] items-center gap-2 px-4 py-2 text-sm">
      <span className="tabular-nums text-muted-foreground">{member.jerseyNumber ?? '–'}</span>
      <span className="truncate dark:text-white">{member.name}</span>
      <span className="text-muted-foreground">{member.position ?? '–'}</span>
      <span className="flex justify-center">
        {done ? (
          <CheckCheck className="h-4 w-4 text-emerald-500" />
        ) : assigned ? (
          <Check className="h-4 w-4 text-blue-500" />
        ) : (
          <span className="text-muted-foreground">–</span>
        )}
      </span>
      <span className="flex items-center justify-center gap-1">
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusColor)} />
        {member.activeRestrictionCount > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {member.activeRestrictionCount}R
          </span>
        )}
      </span>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-2 w-2 rounded-full', className)} />
      {label}
    </span>
  )
}
