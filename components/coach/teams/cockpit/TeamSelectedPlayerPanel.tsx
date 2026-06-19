'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n/client'
import { rosterStatusReason } from '@/lib/coach/roster-dot-status'
import { cn } from '@/lib/utils'
import type { DayCoverage, RailMember } from './TeamRosterRail'
import type { Locale, ScheduleEvent } from './TeamSchedulePane'

interface TeamSelectedPlayerPanelProps {
  member: RailMember | null
  locale: Locale
  viewedDate: Date
  dayEvents: ScheduleEvent[]
  upcomingEvents: ScheduleEvent[]
  dayCoverage: DayCoverage | undefined
  upcomingLoading: boolean
  businessSlug: string
  teamId: string
  onAssign: (memberId: string) => void
  onClear: () => void
}

const DOT_COLOR: Record<RailMember['statusLevel'], string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
}

const STATUS_BADGE: Record<RailMember['statusLevel'], string> = {
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
}

const COMPLETED_STATUSES = new Set(['COMPLETED'])
const ACTIVE_STATUSES = new Set(['PENDING', 'SCHEDULED', 'MODIFIED', 'ASSIGNED', 'ACTIVE'])

function dateLocale(locale: Locale) {
  return locale === 'sv' ? 'sv-SE' : 'en-GB'
}

function formatEventTime(event: ScheduleEvent, locale: Locale, allDayLabel: string) {
  const start = new Date(event.startDate)
  const date = start.toLocaleDateString(dateLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  if (event.allDay) return `${date} - ${allDayLabel}`

  const time = start.toLocaleTimeString(dateLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

function assignmentStatus(event: ScheduleEvent, memberId: string) {
  return event.assignmentSummary?.athletes?.find((athlete) => athlete.athleteId === memberId)?.status ?? null
}

function statusLabel(status: string | null, t: (key: string) => string) {
  if (status && COMPLETED_STATUSES.has(status)) return t('statusCompleted')
  if (status && ACTIVE_STATUSES.has(status)) return t('statusAssigned')
  return t('statusPlanned')
}

function statusClassName(status: string | null) {
  if (status && COMPLETED_STATUSES.has(status)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
  }
  if (status && ACTIVE_STATUSES.has(status)) {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200'
  }
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
}

export function TeamSelectedPlayerPanel({
  member,
  locale,
  viewedDate,
  dayEvents,
  upcomingEvents,
  dayCoverage,
  upcomingLoading,
  businessSlug,
  teamId,
  onAssign,
  onClear,
}: TeamSelectedPlayerPanelProps) {
  const t = useTranslations('coach.pages.teamDetail.cockpit.playerPanel')

  if (!member) return null

  const todayCount = (dayCoverage?.active ?? 0) + (dayCoverage?.completed ?? 0)
  const viewedDateLabel = viewedDate.toLocaleDateString(dateLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const statusReason = rosterStatusReason(member)

  return (
    <div className="rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            {t('title')}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DOT_COLOR[member.statusLevel])} />
            <h3 className="truncate text-base font-semibold dark:text-white">
              {member.jerseyNumber != null ? `#${member.jerseyNumber} ` : ''}{member.name}
            </h3>
            {member.position && (
              <Badge variant="outline" className="text-[10px]">
                {member.position}
              </Badge>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={t('clear')}
          title={t('clear')}
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label={t('sessionsToday')} value={todayCount} />
          <Metric
            label={t('status')}
            value={t(`statusReason.${statusReason}`)}
            valueClassName={STATUS_BADGE[member.statusLevel]}
          />
          <Metric
            label={t('restrictions')}
            value={member.activeRestrictionCount > 0 ? `${member.activeRestrictionCount}R` : t('none')}
            icon={member.activeRestrictionCount > 0 ? <ShieldAlert className="h-3.5 w-3.5" /> : null}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={`/${businessSlug}/coach/clients/${member.id}`}>
              <UserRound className="h-4 w-4" />
              {t('profile')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={`/${businessSlug}/coach/athletes/${member.id}/calendar`}>
              <CalendarDays className="h-4 w-4" />
              {t('calendar')}
            </Link>
          </Button>
          <Button type="button" size="sm" className="justify-start" onClick={() => onAssign(member.id)}>
            <Plus className="h-4 w-4" />
            {t('assign')}
          </Button>
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={`/${businessSlug}/coach/teams/${teamId}/chat`}>
              <MessageSquare className="h-4 w-4" />
              {t('teamChat')}
            </Link>
          </Button>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold dark:text-white">{t('viewedDay')}</h4>
            <span className="text-xs text-muted-foreground">{viewedDateLabel}</span>
          </div>
          <EventList
            memberId={member.id}
            events={dayEvents}
            emptyText={t('noSessionsToday')}
            allDayLabel={t('allDay')}
            locale={locale}
            t={t}
          />
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold dark:text-white">{t('nextSevenDays')}</h4>
            {upcomingLoading && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 animate-pulse" />
                {t('loading')}
              </span>
            )}
          </div>
          <EventList
            memberId={member.id}
            events={upcomingEvents}
            emptyText={t('noUpcoming')}
            allDayLabel={t('allDay')}
            locale={locale}
            t={t}
          />
        </section>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  valueClassName,
  icon,
}: {
  label: string
  value: string | number
  valueClassName?: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-md border bg-background/70 p-2.5 dark:border-white/10 dark:bg-slate-950/30">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-1 inline-flex min-h-6 items-center gap-1 rounded-md text-sm font-semibold dark:text-white', valueClassName && `border px-2 ${valueClassName}`)}>
        {icon}
        {value}
      </div>
    </div>
  )
}

function EventList({
  memberId,
  events,
  emptyText,
  allDayLabel,
  locale,
  t,
}: {
  memberId: string
  events: ScheduleEvent[]
  emptyText: string
  allDayLabel: string
  locale: Locale
  t: (key: string) => string
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground dark:border-white/10">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 5).map((event) => {
        const status = assignmentStatus(event, memberId)
        return (
          <div key={event.id} className="rounded-md border bg-background/70 p-3 dark:border-white/10 dark:bg-slate-950/30">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium dark:text-white">{event.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatEventTime(event, locale, allDayLabel)}
                </div>
              </div>
              <Badge variant="outline" className={cn('shrink-0 text-[10px]', statusClassName(status))}>
                {status && COMPLETED_STATUSES.has(status) && <CheckCircle2 className="mr-1 h-3 w-3" />}
                {statusLabel(status, t)}
              </Badge>
            </div>
          </div>
        )
      })}
      {events.length > 5 && (
        <div className="text-xs text-muted-foreground">
          {t('moreEvents').replace('{count}', String(events.length - 5))}
        </div>
      )}
    </div>
  )
}
