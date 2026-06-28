'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  HeartPulse,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { roleSurfaceClass } from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'
import type { Locale, ScheduleEvent } from './TeamSchedulePane'

export interface TeamActionSignals {
  injuredPlayers: string[]
  limitedPlayers: string[]
  withoutWorkoutPlayers: string[]
  highAcwrPlayers: string[]
}

interface TeamActionInboxProps {
  teamBasePath: string
  locale: Locale
  viewedDate: Date
  events: ScheduleEvent[]
  signals: TeamActionSignals
  missedFollowUps: number | null
}

type Tone = 'amber' | 'blue' | 'emerald' | 'red'

interface ActionItem {
  key: string
  tone: Tone
  icon: LucideIcon
  title: string
  detail: string
  href: string
  action: string
}

function dateLocale(locale: Locale) {
  return locale === 'sv' ? 'sv-SE' : 'en-GB'
}

function eventNeedsContent(event: ScheduleEvent) {
  if (!PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)) return false
  if (event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId) return false
  return event.contentStatus !== 'CONTENT_READY' || !event.linkedWorkoutId
}

function eventReadyToAssign(event: ScheduleEvent) {
  if (!PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)) return false
  if (event.assignedBroadcastId) return false
  return event.contentStatus === 'CONTENT_READY' && Boolean(event.linkedWorkoutId)
}

function listNames(names: string[], moreText: (count: number) => string) {
  if (names.length === 0) return ''
  const visible = names.slice(0, 3).join(', ')
  if (names.length <= 3) return visible
  return `${visible} ${moreText(names.length - 3)}`
}

export function TeamActionInbox({
  teamBasePath,
  locale,
  viewedDate,
  events,
  signals,
  missedFollowUps,
}: TeamActionInboxProps) {
  const t = useTranslations('coach.pages.teamDetail.cockpit.actionInbox')

  const missingContent = events.filter(eventNeedsContent)
  const readyToAssign = events.filter(eventReadyToAssign)
  const viewedDateLabel = viewedDate.toLocaleDateString(dateLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const moreNames = (count: number) => t('moreNames', { count })
  const items: ActionItem[] = []

  if (signals.injuredPlayers.length > 0) {
    items.push({
      key: 'injured',
      tone: 'red',
      icon: HeartPulse,
      title: t('injuredTitle', { count: signals.injuredPlayers.length }),
      detail: listNames(signals.injuredPlayers, moreNames),
      href: `${teamBasePath}/medical`,
      action: t('openHealth'),
    })
  }

  if (signals.limitedPlayers.length > 0) {
    items.push({
      key: 'limited',
      tone: 'amber',
      icon: HeartPulse,
      title: t('limitedTitle', { count: signals.limitedPlayers.length }),
      detail: listNames(signals.limitedPlayers, moreNames),
      href: `${teamBasePath}/medical`,
      action: t('openHealth'),
    })
  }

  if (signals.highAcwrPlayers.length > 0) {
    items.push({
      key: 'high-acwr',
      tone: 'amber',
      icon: AlertTriangle,
      title: t('highAcwrTitle', { count: signals.highAcwrPlayers.length }),
      detail: listNames(signals.highAcwrPlayers, moreNames),
      href: `${teamBasePath}/medical`,
      action: t('openHealth'),
    })
  }

  if (signals.withoutWorkoutPlayers.length > 0) {
    items.push({
      key: 'without-workout',
      tone: 'blue',
      icon: Users,
      title: t('withoutWorkoutTitle', { count: signals.withoutWorkoutPlayers.length }),
      detail: listNames(signals.withoutWorkoutPlayers, moreNames),
      href: `${teamBasePath}/trupp`,
      action: t('openRoster'),
    })
  }

  if (missingContent.length > 0) {
    items.push({
      key: 'missing-content',
      tone: 'amber',
      icon: Dumbbell,
      title: t('missingContentTitle', { count: missingContent.length }),
      detail: missingContent.slice(0, 2).map((event) => event.title).join(', '),
      href: `${teamBasePath}/calendar`,
      action: t('openCalendar'),
    })
  }

  if (readyToAssign.length > 0) {
    items.push({
      key: 'ready',
      tone: 'emerald',
      icon: Send,
      title: t('readyTitle', { count: readyToAssign.length }),
      detail: readyToAssign.slice(0, 2).map((event) => event.title).join(', '),
      href: `${teamBasePath}/calendar`,
      action: t('assignNow'),
    })
  }

  if ((missedFollowUps ?? 0) > 0) {
    items.push({
      key: 'missed-follow-up',
      tone: 'amber',
      icon: ClipboardCheck,
      title: t('missedTitle', { count: missedFollowUps ?? 0 }),
      detail: t('missedDetail'),
      href: `${teamBasePath}/uppfoljning`,
      action: t('openFollowUp'),
    })
  }

  return (
    <div className={roleSurfaceClass('mb-4')}>
      <div className="flex flex-col gap-2 border-b px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold dark:text-white">
            <ClipboardCheck className="h-4 w-4 text-blue-500" />
            {t('title')}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle', { date: viewedDateLabel })}</p>
        </div>
        {items.length === 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('clear')}
          </span>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ActionTile key={item.key} item={item} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          {t('empty')}
        </div>
      )}
    </div>
  )
}

function ActionTile({ item }: { item: ActionItem }) {
  const Icon = item.icon
  const toneClassName = {
    amber: 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20',
    blue: 'border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/20',
    red: 'border-red-200 bg-red-50 text-red-950 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20',
  }[item.tone]

  return (
    <Link
      href={item.href}
      className={cn('rounded-md border p-3 text-left transition-colors', toneClassName)}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{item.title}</div>
          <div className="mt-1 line-clamp-2 text-xs opacity-80">{item.detail}</div>
          <div className="mt-2 text-xs font-medium underline-offset-4 hover:underline">
            {item.action}
          </div>
        </div>
      </div>
    </Link>
  )
}
