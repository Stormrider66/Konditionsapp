'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_TYPE_COLORS,
  TEAM_EVENT_TYPE_LABELS,
  TEAM_EVENT_TYPE_LABELS_SV,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'

type Locale = 'en' | 'sv'

interface ScheduleEvent {
  id: string
  title: string
  type: string
  location: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  contentStatus?: string
  linkedWorkoutId?: string | null
  linkedWorkoutType?: string | null
  assignedBroadcastId?: string | null
  assignmentSummary?: {
    totalAssigned: number
    totalCompleted: number
  } | null
}

interface TeamSchedulePaneProps {
  teamId: string
  businessSlug: string
  locale: Locale
}

type EventStatus = 'upcoming' | 'active' | 'done'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function typeLabel(type: string, locale: Locale): string {
  const map = locale === 'sv' ? TEAM_EVENT_TYPE_LABELS_SV : TEAM_EVENT_TYPE_LABELS
  return map[type as TeamEventType] ?? type
}

function typeColor(type: string): string {
  return TEAM_EVENT_TYPE_COLORS[type as TeamEventType] ?? 'bg-gray-500'
}

function formatTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(startIso: string, endIso: string | null): string | null {
  if (!endIso) return null
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  if (minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

function eventStatus(event: ScheduleEvent, now: Date, viewedDay: Date): EventStatus {
  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000)
  if (event.allDay) {
    const day = startOfDay(viewedDay).getTime()
    const todayDay = startOfDay(now).getTime()
    if (day < todayDay) return 'done'
    if (day > todayDay) return 'upcoming'
    return 'active'
  }
  if (now < start) return 'upcoming'
  if (now > end) return 'done'
  return 'active'
}

/** A physical session with no workout attached yet — a real operational gap. */
function needsContent(event: ScheduleEvent): boolean {
  if (!PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)) return false
  if (event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId) return false
  return event.contentStatus !== 'CONTENT_READY' || !event.linkedWorkoutId
}

function studioHref(
  event: ScheduleEvent,
  teamId: string,
  businessSlug: string
): string | null {
  if (!event.linkedWorkoutId) return null
  const base = `/${businessSlug}/coach`
  const query = new URLSearchParams({
    fromTeamCalendar: 'true',
    teamEventId: event.id,
    teamId,
    date: event.startDate,
    eventTitle: event.title,
  })
  switch (event.type) {
    case 'STRENGTH':
    case 'PREHAB':
    case 'PLYOMETRICS':
      return `${base}/strength?${query}`
    case 'CARDIO':
    case 'INTERVAL_SESSION':
      return `${base}/cardio?${query}`
    case 'HYBRID':
      return `${base}/hybrid-studio?${query}`
    case 'AGILITY':
      return `${base}/agility-studio?${query}`
    default:
      return null
  }
}

export function TeamSchedulePane({ teamId, businessSlug, locale }: TeamSchedulePaneProps) {
  const t = useTranslations('coach.pages.teamDetail.cockpit.schedule')
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewedDate, setViewedDate] = useState<Date>(() => startOfDay(new Date()))
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const dayStartIso = useMemo(() => startOfDay(viewedDate).toISOString(), [viewedDate])

  useEffect(() => {
    const controller = new AbortController()
    const dayStart = new Date(dayStartIso)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const params = new URLSearchParams({
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
      businessSlug,
    })

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/coach/teams/${teamId}/events?${params}`, {
          headers: { 'x-business-slug': businessSlug },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        setEvents(Array.isArray(data.events) ? data.events : [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(true)
        setEvents([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [teamId, businessSlug, dayStartIso])

  const stepDay = useCallback((delta: number) => {
    setViewedDate((current) => startOfDay(new Date(current.getTime() + delta * DAY_MS)))
  }, [])

  const isToday = startOfDay(viewedDate).getTime() === today.getTime()

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      }),
    [events]
  )

  // `now` is captured when the day's events (re)load, so statuses stay stable
  // within a render pass while still refreshing on navigation/refetch.
  const { counts, now } = useMemo(() => {
    const current = new Date()
    const acc = { active: 0, upcoming: 0, done: 0 }
    for (const event of sorted) {
      acc[eventStatus(event, current, viewedDate)] += 1
    }
    return { counts: acc, now: current }
  }, [sorted, viewedDate])

  const dateLabel = viewedDate.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2 font-semibold dark:text-white">
          <CalendarClock className="h-4 w-4 text-blue-500" />
          {t('title')}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => stepDay(-1)}
            aria-label={t('prevDay')}
            className="rounded-md p-1 hover:bg-muted dark:hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewedDate(today)}
            className={cn(
              'rounded-md px-2 py-1 text-sm font-medium',
              isToday ? 'text-blue-600 dark:text-blue-400' : 'hover:bg-muted dark:hover:bg-white/5'
            )}
          >
            {isToday ? t('today') : dateLabel}
          </button>
          <button
            type="button"
            onClick={() => stepDay(1)}
            aria-label={t('nextDay')}
            className="rounded-md p-1 hover:bg-muted dark:hover:bg-white/5"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs dark:border-white/10">
        <SummaryChip label={t('chipEvents')} value={sorted.length} />
        <SummaryChip label={t('chipActive')} value={counts.active} tone="emerald" />
        <SummaryChip label={t('chipUpcoming')} value={counts.upcoming} tone="blue" />
        <SummaryChip label={t('chipDone')} value={counts.done} tone="muted" />
      </div>

      <div className="space-y-3 p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{t('error')}</p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm font-medium dark:text-white">{t('emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
            <Link
              href={`/${businessSlug}/coach/teams/${teamId}/calendar`}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('assignCta')}
            </Link>
          </div>
        ) : (
          sorted.map((event) => (
            <ScheduleCard
              key={event.id}
              event={event}
              status={eventStatus(event, now, viewedDate)}
              locale={locale}
              teamId={teamId}
              businessSlug={businessSlug}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SummaryChip({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'emerald' | 'blue' | 'muted'
}) {
  const toneClass = {
    default: 'bg-muted text-foreground dark:bg-white/10 dark:text-white',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    muted: 'bg-muted text-muted-foreground dark:bg-white/5',
  }[tone]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', toneClass)}>
      <span className="tabular-nums">{value}</span>
      {label}
    </span>
  )
}

function ScheduleCard({
  event,
  status,
  locale,
  teamId,
  businessSlug,
  t,
}: {
  event: ScheduleEvent
  status: EventStatus
  locale: Locale
  teamId: string
  businessSlug: string
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  const duration = event.allDay ? null : formatDuration(event.startDate, event.endDate)
  const summary = event.assignmentSummary
  const completionPct =
    summary && summary.totalAssigned > 0
      ? Math.round((summary.totalCompleted / summary.totalAssigned) * 100)
      : 0
  const href = studioHref(event, teamId, businessSlug)
  const gap = needsContent(event)

  const statusClass = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    done: 'bg-muted text-muted-foreground dark:bg-white/5',
  }[status]
  const statusLabel = {
    active: t('statusActive'),
    upcoming: t('statusUpcoming'),
    done: t('statusDone'),
  }[status]

  return (
    <div className="rounded-md border p-3 dark:border-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold dark:text-white">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', typeColor(event.type))} />
            <span className="truncate">{event.title}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium">
              {event.allDay ? t('allDay') : formatTime(event.startDate, locale)}
              {duration ? ` · ${duration}` : ''}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 dark:bg-white/10">
              {typeLabel(event.type, locale)}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', statusClass)}>
          {statusLabel}
        </span>
      </div>

      {summary && summary.totalAssigned > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t('participants', { completed: summary.totalCompleted, total: summary.totalAssigned })}
            </span>
            <span className="tabular-nums">{completionPct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/10">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      )}

      {(gap || href) && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {gap && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('needsContent')}
            </span>
          )}
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {t('viewSession')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
