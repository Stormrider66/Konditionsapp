'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, Search, Check, CheckCheck, Plus } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import type { RosterDotLevel } from '@/lib/coach/roster-dot-status'

export interface RailMember {
  id: string
  jerseyNumber: number | null
  name: string
  position: string | null
  /** Blended medical + readiness + ACWR status (computed server-side). */
  statusLevel: RosterDotLevel
  /** Active restriction count, for the "R" marker. */
  activeRestrictionCount: number
}

/** Per-member session coverage on the viewed day, derived from that day's events. */
export interface DayCoverage {
  active: number
  completed: number
}

interface TeamRosterRailProps {
  members: RailMember[]
  /** Link to the full Trupp tab. */
  rosterHref: string
  /** Session coverage for the viewed day, keyed by member id. */
  coverageByMember: Map<string, DayCoverage>
  /** Distinct positions present in the squad, for the filter dropdown. */
  positions: string[]
  positionFilter: string | null
  onPositionFilterChange: (position: string | null) => void
  /** The player the coach clicked, if any. */
  selectedPlayerId: string | null
  onSelectPlayer: (memberId: string) => void
  /** Participants of the selected session — highlight these, dim the rest. */
  sessionParticipantIds: Set<string> | null
  /** Quick-assign link for the selected player when they have no session today. */
  quickAssignHref: string | null
}

type SortKey = 'position' | 'number'

const DOT_COLOR: Record<RosterDotLevel, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
}

export function TeamRosterRail({
  members,
  rosterHref,
  coverageByMember,
  positions,
  positionFilter,
  onPositionFilterChange,
  selectedPlayerId,
  onSelectPlayer,
  sessionParticipantIds,
  quickAssignHref,
}: TeamRosterRailProps) {
  const t = useTranslations('coach.pages.teamDetail')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('position')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = members.filter((m) => {
      if (positionFilter && m.position !== positionFilter) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        (m.position?.toLowerCase().includes(q) ?? false) ||
        (m.jerseyNumber != null && String(m.jerseyNumber).includes(q))
      )
    })

    return [...list].sort((a, b) => {
      if (sort === 'number') {
        return (a.jerseyNumber ?? Number.MAX_SAFE_INTEGER) - (b.jerseyNumber ?? Number.MAX_SAFE_INTEGER)
      }
      const posA = a.position ?? '~'
      const posB = b.position ?? '~'
      if (posA !== posB) return posA.localeCompare(posB, 'sv')
      return (a.jerseyNumber ?? Number.MAX_SAFE_INTEGER) - (b.jerseyNumber ?? Number.MAX_SAFE_INTEGER)
    })
  }, [members, query, sort, positionFilter])

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
        {positions.length > 0 && (
          <select
            value={positionFilter ?? ''}
            onChange={(event) => onPositionFilterChange(event.target.value || null)}
            aria-label={t('cockpit.rail.filterPosition')}
            className="rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-slate-900"
          >
            <option value="">{t('cockpit.rail.allPositions')}</option>
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        )}
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
          filtered.map((member) => (
            <RosterRow
              key={member.id}
              member={member}
              coverage={coverageByMember.get(member.id)}
              selected={selectedPlayerId === member.id}
              highlighted={
                selectedPlayerId === member.id ||
                (sessionParticipantIds?.has(member.id) ?? false)
              }
              dimmed={sessionParticipantIds != null && !sessionParticipantIds.has(member.id)}
              onSelect={() => onSelectPlayer(member.id)}
              quickAssignHref={selectedPlayerId === member.id ? quickAssignHref : null}
              quickAssignLabel={t('cockpit.rail.quickAssign')}
            />
          ))
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

function RosterRow({
  member,
  coverage,
  selected,
  highlighted,
  dimmed,
  onSelect,
  quickAssignHref,
  quickAssignLabel,
}: {
  member: RailMember
  coverage: DayCoverage | undefined
  selected: boolean
  highlighted: boolean
  dimmed: boolean
  onSelect: () => void
  quickAssignHref: string | null
  quickAssignLabel: string
}) {
  const active = coverage?.active ?? 0
  const completed = coverage?.completed ?? 0
  const done = completed > 0 && active === 0
  const assigned = active > 0
  const statusColor = DOT_COLOR[member.statusLevel]

  return (
    <div
      className={cn(
        'transition',
        highlighted && 'bg-blue-50 dark:bg-blue-500/10',
        selected && 'ring-1 ring-inset ring-blue-400',
        dimmed && 'opacity-40'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="grid w-full grid-cols-[2rem_1fr_2.5rem_2.5rem_3.5rem] items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted/60 dark:hover:bg-white/5"
      >
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
      </button>
      {quickAssignHref && (
        <div className="px-4 pb-2">
          <Link
            href={quickAssignHref}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3 w-3" />
            {quickAssignLabel}
          </Link>
        </div>
      )}
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
