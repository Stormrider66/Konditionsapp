'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, CopyPlus, Dumbbell, Heart, Users, Zap, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslations } from '@/i18n/client'
import { roleSurfaceClass } from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'
import type { DayCoverage, RailMember } from './TeamRosterRail'
import type { Locale } from './TeamSchedulePane'

export interface QueueCopyWorkout {
  workoutType: 'strength' | 'cardio' | 'hybrid' | 'agility'
  workoutId: string
  workoutName?: string | null
}

interface TeamUnplannedPlayersQueueProps {
  members: RailMember[]
  coverageByMember: Map<string, DayCoverage>
  loading: boolean
  locale: Locale
  viewedDate: Date
  businessSlug: string
  teamId: string
  copyWorkout: QueueCopyWorkout | null
  onAssignSelected: (athleteIds: string[], workout?: QueueCopyWorkout) => void
}

function dateLocale(locale: Locale) {
  return locale === 'sv' ? 'sv-SE' : 'en-GB'
}

function builderHref({
  businessSlug,
  teamId,
  athleteIds,
  kind,
}: {
  businessSlug: string
  teamId: string
  athleteIds: string[]
  kind: 'strength' | 'cardio' | 'hybrid'
}) {
  const path = kind === 'hybrid' ? 'hybrid-studio' : kind
  const params = new URLSearchParams({
    teamId,
    athleteIds: athleteIds.join(','),
    source: 'team-unplanned',
  })
  return `/${businessSlug}/coach/${path}?${params.toString()}`
}

export function TeamUnplannedPlayersQueue({
  members,
  coverageByMember,
  loading,
  locale,
  viewedDate,
  businessSlug,
  teamId,
  copyWorkout,
  onAssignSelected,
}: TeamUnplannedPlayersQueueProps) {
  const t = useTranslations('coach.pages.teamDetail.cockpit.unplannedQueue')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const unplannedMembers = useMemo(() => {
    return members
      .filter((member) => member.hasAthleteAccount !== false)
      .filter((member) => {
        const coverage = coverageByMember.get(member.id)
        return !coverage || (coverage.active === 0 && coverage.completed === 0)
      })
      .sort((a, b) => {
        const posA = a.position ?? '~'
        const posB = b.position ?? '~'
        if (posA !== posB) return posA.localeCompare(posB, 'sv')
        return (a.jerseyNumber ?? Number.MAX_SAFE_INTEGER) - (b.jerseyNumber ?? Number.MAX_SAFE_INTEGER)
      })
  }, [coverageByMember, members])

  const unplannedIds = useMemo(() => new Set(unplannedMembers.map((member) => member.id)), [unplannedMembers])
  const activeSelectedIds = useMemo(
    () => Array.from(selectedIds).filter((id) => unplannedIds.has(id)),
    [selectedIds, unplannedIds]
  )
  const activeSelectedSet = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds])
  const selectedCount = activeSelectedIds.length
  const allSelected = unplannedMembers.length > 0 && activeSelectedIds.length === unplannedMembers.length

  const positionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    unplannedMembers.forEach((member) => {
      const position = member.position ?? t('noPosition')
      counts.set(position, (counts.get(position) ?? 0) + 1)
    })
    return Array.from(counts.entries())
  }, [t, unplannedMembers])

  if (loading || unplannedMembers.length === 0) {
    return null
  }

  const viewedDateLabel = viewedDate.toLocaleDateString(dateLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const toggleMember = (memberId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds((current) => {
      if (allSelected) {
        const next = new Set(current)
        unplannedMembers.forEach((member) => next.delete(member.id))
        return next
      }
      return new Set([...current, ...unplannedMembers.map((member) => member.id)])
    })
  }

  return (
    <div className={roleSurfaceClass('mb-4')}>
      <div className="flex flex-col gap-3 border-b px-4 py-3 dark:border-white/10 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold dark:text-white">
            <Users className="h-4 w-4 text-blue-500" />
            {t('title', { count: unplannedMembers.length })}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle', { date: viewedDateLabel })}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {positionCounts.map(([position, count]) => (
              <Badge key={position} variant="outline" className="text-[10px]">
                {position} {count}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
            {allSelected ? t('clearSelection') : t('selectAll')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('selected', { count: selectedCount })}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {unplannedMembers.map((member) => (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-3 rounded-md border bg-background/70 p-3 text-left transition-colors hover:border-blue-300 dark:border-white/10 dark:bg-slate-950/30',
                activeSelectedSet.has(member.id) && 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'
              )}
            >
              <Checkbox
                checked={activeSelectedSet.has(member.id)}
                onCheckedChange={() => toggleMember(member.id)}
                aria-label={t('selectPlayer', { name: member.name })}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium dark:text-white">
                  {member.jerseyNumber != null ? `#${member.jerseyNumber} ` : ''}{member.name}
                </div>
                <div className="text-xs text-muted-foreground">{member.position ?? t('noPosition')}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-md border bg-background/70 p-3 dark:border-white/10 dark:bg-slate-950/30">
          <Button
            type="button"
            className="w-full justify-start"
            size="sm"
            disabled={selectedCount === 0}
            onClick={() => onAssignSelected(activeSelectedIds)}
          >
            <CalendarPlus className="h-4 w-4" />
            {t('assignExisting')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={selectedCount === 0 || !copyWorkout}
            onClick={() => {
              if (copyWorkout) onAssignSelected(activeSelectedIds, copyWorkout)
            }}
            title={copyWorkout?.workoutName ?? t('copyNeedsSession')}
          >
            <CopyPlus className="h-4 w-4" />
            {t('copySelectedSession')}
          </Button>
          <div className="grid gap-2 pt-1">
            <CreateWorkoutButton
              disabled={selectedCount === 0}
              href={builderHref({ businessSlug, teamId, athleteIds: activeSelectedIds, kind: 'strength' })}
              icon={Dumbbell}
              label={t('createStrength')}
            />
            <CreateWorkoutButton
              disabled={selectedCount === 0}
              href={builderHref({ businessSlug, teamId, athleteIds: activeSelectedIds, kind: 'cardio' })}
              icon={Heart}
              label={t('createCardio')}
            />
            <CreateWorkoutButton
              disabled={selectedCount === 0}
              href={builderHref({ businessSlug, teamId, athleteIds: activeSelectedIds, kind: 'hybrid' })}
              icon={Zap}
              label={t('createHybrid')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateWorkoutButton({
  disabled,
  href,
  icon: Icon,
  label,
}: {
  disabled: boolean
  href: string
  icon: LucideIcon
  label: string
}) {
  if (disabled) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-full justify-start" disabled>
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    )
  }

  return (
    <Button asChild variant="outline" size="sm" className="w-full justify-start">
      <Link href={href}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  )
}
