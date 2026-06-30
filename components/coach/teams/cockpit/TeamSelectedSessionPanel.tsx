'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  MapPin,
  Printer,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n/client'
import { roleSurfaceClass } from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_TYPE_COLORS,
  TEAM_EVENT_TYPE_LABELS,
  TEAM_EVENT_TYPE_LABELS_SV,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'
import type { RailMember } from './TeamRosterRail'
import { type Locale, type ScheduleEvent, workoutPrintHref } from './TeamSchedulePane'

interface TeamSelectedSessionPanelProps {
  event: ScheduleEvent | null
  members: RailMember[]
  locale: Locale
  businessSlug: string
  teamId: string
  onClear: () => void
}

function dateLocale(locale: Locale) {
  return locale === 'sv' ? 'sv-SE' : 'en-GB'
}

function typeLabel(type: string, locale: Locale): string {
  const labels = locale === 'sv' ? TEAM_EVENT_TYPE_LABELS_SV : TEAM_EVENT_TYPE_LABELS
  return labels[type as TeamEventType] ?? type
}

function typeColor(type: string): string {
  return TEAM_EVENT_TYPE_COLORS[type as TeamEventType] ?? 'bg-gray-500'
}

function formatTimeRange(event: ScheduleEvent, locale: Locale, allDayLabel: string) {
  const start = new Date(event.startDate)
  const date = start.toLocaleDateString(dateLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  if (event.allDay) return `${date} - ${allDayLabel}`

  const startTime = start.toLocaleTimeString(dateLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endTime = event.endDate
    ? new Date(event.endDate).toLocaleTimeString(dateLocale(locale), {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return endTime ? `${date} ${startTime}-${endTime}` : `${date} ${startTime}`
}

function formatDuration(value: number | null | undefined) {
  if (!value) return null
  if (value > 300) return `${Math.round(value / 60)} min`
  return `${value} min`
}

function formatCompletedAt(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return null
  return new Date(value).toLocaleDateString(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
  })
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function assignmentStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'COMPLETED':
      return t('statusCompleted')
    case 'SKIPPED':
      return t('statusSkipped')
    case 'SCHEDULED':
    case 'ASSIGNED':
    case 'PENDING':
      return t('statusAssigned')
    case 'IN_PROGRESS':
    case 'ACTIVE':
      return t('statusActive')
    case 'MODIFIED':
      return t('statusModified')
    default:
      return t('statusPending')
  }
}

function assignmentStatusClass(status: string) {
  if (status === 'COMPLETED') return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
  if (status === 'SKIPPED') return 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
  if (status === 'IN_PROGRESS' || status === 'ACTIVE' || status === 'SCHEDULED' || status === 'ASSIGNED' || status === 'PENDING') {
    return 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200'
  }
  return 'border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
}

function needsContent(event: ScheduleEvent) {
  if (!PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)) return false
  if (event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId) return false
  return event.contentStatus !== 'CONTENT_READY' || !event.linkedWorkoutId
}

function contentState(event: ScheduleEvent, t: (key: string) => string) {
  if (event.assignedBroadcastId || event.contentStatus === 'ASSIGNED') {
    return {
      label: t('contentAssigned'),
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    }
  }
  if (event.linkedWorkoutId && event.contentStatus === 'CONTENT_READY') {
    return {
      label: t('contentReady'),
      className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    }
  }
  if (needsContent(event)) {
    return {
      label: t('contentMissing'),
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    }
  }
  return {
    label: t('contentPlanned'),
    className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
  }
}

export function TeamSelectedSessionPanel({
  event,
  members,
  locale,
  businessSlug,
  teamId,
  onClear,
}: TeamSelectedSessionPanelProps) {
  const t = useTranslations('coach.pages.teamDetail.cockpit.sessionPanel')

  if (!event) return null

  const membersById = new Map(members.map((member) => [member.id, member]))
  const summary = event.assignmentSummary
  const athletes = summary?.athletes ?? []
  const missingAthletes = summary?.missingAthletes ?? []
  const totalAssigned = summary?.totalAssigned ?? athletes.length
  const totalCompleted = summary?.totalCompleted ?? athletes.filter((athlete) => athlete.status === 'COMPLETED').length
  const completionRate = summary?.completionRate ?? (totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0)
  const printHref = workoutPrintHref(event, businessSlug)
  const content = contentState(event, t)
  const showMissingContent = needsContent(event)
  const teamStrengthHref = `/${businessSlug}/coach/teams/${teamId}/kiosk?${new URLSearchParams({
    date: formatDateParam(new Date(event.startDate)),
  })}`

  return (
    <div className={roleSurfaceClass()}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {t('title')}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', typeColor(event.type))} />
            <h3 className="truncate text-base font-semibold dark:text-white">{event.title}</h3>
            <Badge variant="outline" className="text-[10px]">
              {typeLabel(event.type, locale)}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeRange(event, locale, t('allDay'))}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </span>
            )}
            {event.responsibleCoach?.name && (
              <span className="inline-flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                {event.responsibleCoach.name}
              </span>
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
          <Metric label={t('completion')} value={`${totalCompleted}/${totalAssigned}`} />
          <Metric label={t('missing')} value={summary?.missingAssignmentCount ?? missingAthletes.length} />
          <Metric label={t('content')} value={content.label} valueClassName={content.className} />
        </div>

        {summary && totalAssigned > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('completion')}</span>
              <span className="tabular-nums">{completionRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted dark:bg-white/10">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }} />
            </div>
          </div>
        )}

        {event.linkedWorkoutName && (
          <div className="rounded-md border bg-background/70 p-3 text-sm dark:border-white/10 dark:bg-slate-950/30">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5" />
              {t('linkedWorkout')}
            </div>
            <div className="mt-1 truncate font-medium dark:text-white">{event.linkedWorkoutName}</div>
          </div>
        )}

        {showMissingContent && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{t('missingContentTitle')}</div>
              <div className="text-xs opacity-80">{t('missingContentDetail')}</div>
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={`/${businessSlug}/coach/teams/${teamId}/calendar`}>
              <CalendarDays className="h-4 w-4" />
              {t('calendar')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={teamStrengthHref}>
              <Dumbbell className="h-4 w-4" />
              {t('focus')}
            </Link>
          </Button>
          {printHref ? (
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href={printHref}>
                <Printer className="h-4 w-4" />
                {t('print')}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href={`/${businessSlug}/coach/teams/${teamId}/calendar`}>
                <Dumbbell className="h-4 w-4" />
                {t('planContent')}
              </Link>
            </Button>
          )}
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold dark:text-white">{t('participants')}</h4>
            {summary && (
              <span className="text-xs text-muted-foreground">
                {t('completionValue', { completed: totalCompleted, total: totalAssigned })}
              </span>
            )}
          </div>
          {athletes.length === 0 ? (
            <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground dark:border-white/10">
              {t('noParticipants')}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {athletes.slice(0, 8).map((athlete) => {
                const fallback = membersById.get(athlete.athleteId)
                const jerseyNumber = athlete.jerseyNumber ?? fallback?.jerseyNumber ?? null
                const position = athlete.position ?? fallback?.position ?? null
                const duration = formatDuration(athlete.duration)
                const completedAt = formatCompletedAt(athlete.completedAt, locale)
                return (
                  <div key={athlete.assignmentId ?? athlete.athleteId} className="rounded-md border bg-background/70 p-3 dark:border-white/10 dark:bg-slate-950/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium dark:text-white">
                          {jerseyNumber != null ? `#${jerseyNumber} ` : ''}
                          {athlete.athleteName ?? fallback?.name ?? t('unknownPlayer')}
                        </div>
                        {position && (
                          <div className="text-xs text-muted-foreground">{position}</div>
                        )}
                      </div>
                      <Badge variant="outline" className={cn('shrink-0 text-[10px]', assignmentStatusClass(athlete.status))}>
                        {athlete.status === 'COMPLETED' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {assignmentStatusLabel(athlete.status, t)}
                      </Badge>
                    </div>
                    {(athlete.rpe || duration || completedAt) && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {athlete.rpe && <span>RPE {athlete.rpe}/10</span>}
                        {duration && <span>{duration}</span>}
                        {completedAt && <span>{t('completedAt', { date: completedAt })}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {missingAthletes.length > 0 && (
          <section>
            <h4 className="mb-2 text-sm font-semibold dark:text-white">{t('missingPlayers')}</h4>
            <div className="flex flex-wrap gap-2">
              {missingAthletes.slice(0, 8).map((athlete) => (
                <Badge key={athlete.athleteId} variant="outline" className="bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {athlete.jerseyNumber ? `#${athlete.jerseyNumber} ` : ''}{athlete.athleteName}
                </Badge>
              ))}
              {missingAthletes.length > 8 && (
                <Badge variant="outline">+{missingAthletes.length - 8}</Badge>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="rounded-md border bg-background/70 p-2.5 dark:border-white/10 dark:bg-slate-950/30">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-1 inline-flex min-h-6 items-center rounded-md text-sm font-semibold dark:text-white', valueClassName && `border px-2 ${valueClassName}`)}>
        {value}
      </div>
    </div>
  )
}
