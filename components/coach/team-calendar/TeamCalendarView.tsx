'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateEventDialog } from './CreateEventDialog'
import { EditEventDialog } from './EditEventDialog'
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import {
  AthletePlanSummaryCard,
  getPlanBlockColor,
  type AthletePlanBlockSummary,
  type AthletePlanSummary,
} from '@/components/athlete-plans/AthletePlanSummaryCard'
import Link from 'next/link'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPE_COLORS,
  teamEventContentOwnerLabel,
  teamEventContentStatusLabel,
  teamEventTypeLabel,
  type TeamCalendarLocale,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
  isTeamEventType,
} from '@/lib/team-calendar/event-types'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Clock,
  Download,
  ExternalLink,
  Trash2,
  Plus,
  Filter,
  Send,
  TriangleAlert,
  Activity,
  CalendarDays,
  Dumbbell,
  Trophy,
  Sparkles,
  MessageSquareText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { PracticeBlock } from '@/lib/team-calendar/practice-plan'
import { inputDateValue } from '@/lib/team-calendar/date-time'
import { openCoachFloatingChat } from '@/lib/events/coach-floating-chat'
import { useLocale } from '@/i18n/client'
import { cn } from '@/lib/utils'

interface TeamEvent {
  id: string
  title: string
  description: string | null
  type: string
  location: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  contentStatus?: string
  contentOwner?: string | null
  practicePlan?: PracticeBlock[] | null
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
  linkedWorkoutName?: string | null
  assignedBroadcastId?: string | null
  assignedAt?: string | null
  assignmentSummary?: {
    totalAssigned: number
    totalCompleted: number
    completionRate: number
    athletes: Array<{
      assignmentId: string
      athleteId: string
      athleteName: string
      jerseyNumber: number | null
      position: string | null
      workoutType: string
      status: string
      completedAt: string | null
      rpe: number | null
      duration: number | null
      notes: string | null
    }>
  } | null
  createdBy: { name: string }
  intervalSession: { id: string; name: string; status: string } | null
}

interface TeamCalendarPermissions {
  role: string
  roleLabel: string
  canView: boolean
  creatableTypes: TeamEventType[]
  assignableContentTypes: TeamEventType[]
}

type PlanningFilter = 'all' | 'needsReview' | 'iceMissingPlan' | 'needsContent' | 'ready' | 'assigned' | 'ice' | 'physical'
type LoadLevel = 'low' | 'moderate' | 'high'
type CalendarViewMode = 'day' | 'week' | 'month'

function getTypeConfig(type: string, locale: TeamCalendarLocale) {
  if (isTeamEventType(type)) {
    return {
      label: teamEventTypeLabel(type, locale),
      color: TEAM_EVENT_TYPE_COLORS[type],
    }
  }
  return { label: locale === 'sv' ? 'Övrigt' : 'Other', color: 'bg-gray-500' }
}

function firstDescriptionLine(description: string | null): string | null {
  return description?.split('\n').map((line) => line.trim()).find(Boolean) ?? null
}

function dateLocale(locale: TeamCalendarLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function text(locale: TeamCalendarLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

function formatTime(iso: string, locale: TeamCalendarLocale): string {
  return new Date(iso).toLocaleTimeString(dateLocale(locale), { hour: '2-digit', minute: '2-digit' })
}

function eventDurationMinutes(event: TeamEvent): number | null {
  if (event.allDay || !event.endDate) return null
  const start = new Date(event.startDate).getTime()
  const end = new Date(event.endDate).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return Math.round((end - start) / 60000)
}

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

function getMonthDates(baseDate: Date): Date[] {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
  const dates: Date[] = []

  for (let day = 1; day <= end.getDate(); day++) {
    dates.push(new Date(start.getFullYear(), start.getMonth(), day))
  }

  return dates
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function planBlockForDate(blocks: AthletePlanBlockSummary[], date: Date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)

  return blocks.find((block) => {
    const start = new Date(block.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(block.endDate)
    end.setHours(23, 59, 59, 999)
    return day >= start && day <= end
  }) ?? null
}

function planningColumnFor(type: string): 'ice' | 'physical' | 'team' | 'other' | 'annual' {
  if (type === 'PRACTICE' || type === 'ICE_PRACTICE') return 'ice'
  if (['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY', 'PREHAB', 'PLYOMETRICS', 'INTERVAL_SESSION'].includes(type)) {
    return 'physical'
  }
  if (type === 'GAME' || type === 'TEST') return 'team'
  if (type === 'ANNUAL_PLAN') return 'annual'
  return 'other'
}

function compactEventText(event: TeamEvent, locale: TeamCalendarLocale): string {
  const time = event.allDay ? '' : formatTime(event.startDate, locale)
  const location = event.location ? ` ${event.location}` : ''
  return `${time}${time ? ' ' : ''}${event.title}${location}`
}

function eventNeedsContent(event: TeamEvent): boolean {
  if (!PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)) return false
  if (event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId) return false
  return event.contentStatus !== 'CONTENT_READY' || !event.linkedWorkoutId
}

function contentStatusLabel(status: string | undefined, locale: TeamCalendarLocale): string {
  if (status && TEAM_EVENT_CONTENT_STATUSES.some((candidate) => candidate === status)) {
    return teamEventContentStatusLabel(status as TeamEventContentStatus, locale)
  }
  return teamEventContentStatusLabel('PLANNED', locale)
}

function contentOwnerLabel(owner: string | null | undefined, locale: TeamCalendarLocale): string {
  if (owner && TEAM_EVENT_CONTENT_OWNERS.some((candidate) => candidate === owner)) {
    return teamEventContentOwnerLabel(owner as TeamEventContentOwner, locale)
  }
  return teamEventContentOwnerLabel('physical_trainer', locale)
}

function builderLinkForEvent(event: TeamEvent, teamId: string, businessSlug?: string): { href: string; label: string } | null {
  const coachBase = businessSlug ? `/${businessSlug}/coach` : '/coach'
  const query = new URLSearchParams({
    fromTeamCalendar: 'true',
    teamEventId: event.id,
    teamId,
    date: event.startDate,
    eventTitle: event.title,
  })

  if (event.type === 'STRENGTH' || event.type === 'PREHAB' || event.type === 'PLYOMETRICS') {
    return { href: `${coachBase}/strength?${query}`, label: 'Strength Studio' }
  }
  if (event.type === 'CARDIO' || event.type === 'INTERVAL_SESSION') {
    return { href: `${coachBase}/cardio?${query}`, label: 'Cardio Studio' }
  }
  if (event.type === 'HYBRID') {
    return { href: `${coachBase}/hybrid-studio?${query}`, label: 'Hybrid Studio' }
  }
  if (event.type === 'AGILITY') {
    return { href: `${coachBase}/agility-studio?${query}`, label: 'Agility Studio' }
  }
  return null
}

function assignmentProgressLabel(event: TeamEvent, locale: TeamCalendarLocale): string | null {
  if (!event.assignmentSummary) return null
  return `${event.assignmentSummary.totalCompleted}/${event.assignmentSummary.totalAssigned} ${text(locale, 'klara', 'completed')}`
}

function hasPracticePlan(event: TeamEvent): boolean {
  return Array.isArray(event.practicePlan) && event.practicePlan.length > 0
}

function isIcePracticeEvent(event: TeamEvent): boolean {
  return event.type === 'PRACTICE' || event.type === 'ICE_PRACTICE'
}

function isPhysicalEvent(event: TeamEvent): boolean {
  return PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)
}

function practiceBlockMinutes(event: TeamEvent): number {
  if (!Array.isArray(event.practicePlan)) return 0
  return event.practicePlan.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)
}

function getPlanningIssues(event: TeamEvent, locale: TeamCalendarLocale): string[] {
  const issues: string[] = []

  if (isIcePracticeEvent(event)) {
    if (!hasPracticePlan(event)) {
      issues.push(text(locale, 'Saknar blockplan', 'Missing block plan'))
    } else if (Array.isArray(event.practicePlan)) {
      const missingGroups = event.practicePlan.filter((block) => !block.groups?.trim()).length
      const missingEquipment = event.practicePlan.filter((block) => !block.equipment?.trim()).length
      const eventMinutes = eventDurationMinutes(event)
      const blockMinutes = practiceBlockMinutes(event)

      if (missingGroups > 0) {
        issues.push(text(locale, `${missingGroups} block saknar grupp`, `${missingGroups} blocks missing groups`))
      }
      if (missingEquipment > 0) {
        issues.push(text(locale, `${missingEquipment} block saknar material`, `${missingEquipment} blocks missing equipment`))
      }
      if (eventMinutes !== null && blockMinutes > 0 && Math.abs(eventMinutes - blockMinutes) >= 10) {
        issues.push(text(locale, `Blocktid ${blockMinutes} min / kalender ${eventMinutes} min`, `Block time ${blockMinutes} min / calendar ${eventMinutes} min`))
      }
    }
  }

  if (isPhysicalEvent(event) && event.contentStatus === 'CONTENT_READY' && !event.linkedWorkoutId && !event.assignedBroadcastId) {
    issues.push(text(locale, 'Markerad klar utan kopplat pass', 'Marked ready without a linked workout'))
  }

  return issues
}

function eventNeedsReview(event: TeamEvent, locale: TeamCalendarLocale): boolean {
  return getPlanningIssues(event, locale).length > 0
}

function sumEventMinutes(eventsToSum: TeamEvent[]): number {
  return eventsToSum.reduce((sum, event) => sum + (eventDurationMinutes(event) ?? 0), 0)
}

function eventLoadPoints(event: TeamEvent): number {
  const duration = eventDurationMinutes(event) ?? 60
  const durationFactor = Math.max(0.5, duration / 60)

  if (event.type === 'GAME') return 5
  if (event.type === 'TEST') return 3
  if (event.type === 'PRACTICE' || event.type === 'ICE_PRACTICE') return 2.5 * durationFactor
  if (event.type === 'STRENGTH' || event.type === 'PLYOMETRICS' || event.type === 'HYBRID' || event.type === 'AGILITY') {
    return 3 * durationFactor
  }
  if (event.type === 'CARDIO' || event.type === 'INTERVAL_SESSION') return 2.5 * durationFactor
  if (event.type === 'PREHAB') return 1 * durationFactor
  return 0.5 * durationFactor
}

function loadLevelFor(points: number): LoadLevel {
  if (points >= 6) return 'high'
  if (points >= 3) return 'moderate'
  return 'low'
}

function loadLevelLabel(level: LoadLevel, locale: TeamCalendarLocale): string {
  if (level === 'high') return text(locale, 'Hög', 'High')
  if (level === 'moderate') return text(locale, 'Medel', 'Moderate')
  return text(locale, 'Låg', 'Low')
}

function loadLevelClassName(level: LoadLevel): string {
  if (level === 'high') return 'border-red-200 bg-red-50 text-red-900'
  if (level === 'moderate') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-emerald-200 bg-emerald-50 text-emerald-900'
}

function getPlanningBadges(event: TeamEvent, locale: TeamCalendarLocale): Array<{
  key: string
  label: string
  icon: LucideIcon
  className: string
}> {
  const badges: Array<{
    key: string
    label: string
    icon: LucideIcon
    className: string
  }> = []

  if (isIcePracticeEvent(event)) {
    if (hasPracticePlan(event)) {
      badges.push({
        key: 'practice-plan',
        label: 'Plan',
        icon: ClipboardList,
        className: 'border-blue-300 bg-blue-50 text-blue-800',
      })
    } else {
      badges.push({
        key: 'missing-practice-plan',
        label: text(locale, 'Saknar plan', 'Missing plan'),
        icon: TriangleAlert,
        className: 'border-amber-300 bg-amber-50 text-amber-800',
      })
    }
  }

  if (eventNeedsReview(event, locale)) {
    badges.push({
      key: 'needs-review',
      label: text(locale, 'Kontroll', 'Review'),
      icon: TriangleAlert,
      className: 'border-orange-300 bg-orange-50 text-orange-800',
    })
  }

  if (isPhysicalEvent(event)) {
    if (event.assignedBroadcastId) {
      badges.push({
        key: 'assigned',
        label: assignmentProgressLabel(event, locale) ?? text(locale, 'Tilldelat', 'Assigned'),
        icon: Send,
        className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
      })
    } else if (event.linkedWorkoutId && event.contentStatus === 'CONTENT_READY') {
      badges.push({
        key: 'ready',
        label: text(locale, 'Klar', 'Ready'),
        icon: CheckCircle2,
        className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
      })
    } else if (eventNeedsContent(event)) {
      badges.push({
        key: 'needs-content',
        label: contentStatusLabel(event.contentStatus, locale),
        icon: TriangleAlert,
        className: 'border-amber-300 bg-amber-50 text-amber-800',
      })
    }
  }

  return badges
}

function PlanningBadges({ event, locale, compact = false }: { event: TeamEvent; locale: TeamCalendarLocale; compact?: boolean }) {
  const badges = getPlanningBadges(event, locale)
  if (badges.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : ''}`}>
      {badges.map((badge) => {
        const Icon = badge.icon
        return (
          <Badge
            key={badge.key}
            variant="outline"
            className={`shrink-0 gap-1 ${compact ? 'px-1 py-0 text-[10px]' : 'text-[10px]'} ${badge.className}`}
          >
            <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            {badge.label}
          </Badge>
        )
      })}
    </div>
  )
}

function eventMatchesPlanningFilter(event: TeamEvent, filter: PlanningFilter, locale: TeamCalendarLocale): boolean {
  if (filter === 'all') return true
  if (filter === 'needsReview') return eventNeedsReview(event, locale)
  if (filter === 'iceMissingPlan') return isIcePracticeEvent(event) && !hasPracticePlan(event)
  if (filter === 'needsContent') return eventNeedsContent(event)
  if (filter === 'ready') return isPhysicalEvent(event) && Boolean(event.linkedWorkoutId) && event.contentStatus === 'CONTENT_READY' && !event.assignedBroadcastId
  if (filter === 'assigned') return Boolean(event.assignedBroadcastId)
  if (filter === 'ice') return isIcePracticeEvent(event)
  if (filter === 'physical') return isPhysicalEvent(event)
  return true
}

const PLANNING_FILTERS: Array<{ value: PlanningFilter; label: Record<TeamCalendarLocale, string> }> = [
  { value: 'all', label: { en: 'All', sv: 'Alla' } },
  { value: 'needsReview', label: { en: 'Review', sv: 'Kontroll' } },
  { value: 'iceMissingPlan', label: { en: 'Missing ice plan', sv: 'Saknar isplan' } },
  { value: 'needsContent', label: { en: 'Needs content', sv: 'Behöver innehåll' } },
  { value: 'ready', label: { en: 'Ready physical', sv: 'Klara fys' } },
  { value: 'assigned', label: { en: 'Assigned', sv: 'Tilldelade' } },
  { value: 'ice', label: { en: 'Ice', sv: 'Is' } },
  { value: 'physical', label: { en: 'Physical', sv: 'Fys' } },
]

const PLANNING_QUICK_TYPES: Array<{ type: TeamEventType; title: Record<TeamCalendarLocale, string>; label: string }> = [
  { type: 'STRENGTH', title: { en: 'Strength', sv: 'Styrka' }, label: 'Strength' },
  { type: 'CARDIO', title: { en: 'Conditioning', sv: 'Kondition' }, label: 'Conditioning' },
  { type: 'PREHAB', title: { en: 'Stability / Prehab', sv: 'Stabilitet / Prehab' }, label: 'Prehab' },
  { type: 'PLYOMETRICS', title: { en: 'Plyometrics', sv: 'Plyometri' }, label: 'Plyo' },
  { type: 'HYBRID', title: { en: 'Hybrid', sv: 'Hybrid' }, label: 'Hybrid' },
  { type: 'AGILITY', title: { en: 'Agility', sv: 'Agility' }, label: 'Agility' },
  { type: 'TEST', title: { en: 'Test', sv: 'Test' }, label: 'Test' },
]

interface TeamCalendarViewProps {
  teamId: string
  teamName: string
  businessSlug?: string
  initialTeamPlans?: AthletePlanSummary[]
}

export function TeamCalendarView({
  teamId,
  teamName,
  businessSlug,
  initialTeamPlans = [],
}: TeamCalendarViewProps) {
  const locale: TeamCalendarLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [teamPlans, setTeamPlans] = useState<AthletePlanSummary[]>(initialTeamPlans)
  const [loading, setLoading] = useState(true)
  const [weekBase, setWeekBase] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [planningFilter, setPlanningFilter] = useState<PlanningFilter>('all')
  const [queueOwnerFilter, setQueueOwnerFilter] = useState<'all' | TeamEventContentOwner>('all')
  const [queueStatusFilter, setQueueStatusFilter] = useState<'open' | TeamEventContentStatus>('open')
  const [calendarPermissions, setCalendarPermissions] = useState<TeamCalendarPermissions | null>(null)
  const [assigningEventId, setAssigningEventId] = useState<string | null>(null)

  const weekDates = getWeekDates(weekBase)
  const monthDates = getMonthDates(weekBase)
  const creatableTypes = calendarPermissions?.creatableTypes ?? []
  const assignableContentTypes = calendarPermissions?.assignableContentTypes ?? []
  const isStaffPlanningView = creatableTypes.length > 0 || assignableContentTypes.length > 0
  const dayStart = new Date(weekBase)
  dayStart.setHours(0, 0, 0, 0)
  const rangeStart = viewMode === 'month' ? monthDates[0] : viewMode === 'week' ? weekDates[0] : dayStart
  const rangeEnd = new Date(viewMode === 'month' ? monthDates[monthDates.length - 1] : viewMode === 'week' ? weekDates[6] : dayStart)
  rangeEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(weekDates[6])
  weekEnd.setHours(23, 59, 59, 999)
  const today = new Date()
  const activeTeamPlan = teamPlans.find((plan) => {
    const start = new Date(plan.startDate)
    const end = new Date(plan.endDate)
    return plan.status === 'ACTIVE' && start <= today && end >= today
  }) ?? null

  // Stabilize the ISO strings outside the dep array — react-hooks v6
  // requires deps to be simple expressions (no method calls).
  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()
  const isPhysicalTrainerCalendar = calendarPermissions?.role === 'PHYSICAL_TRAINER'
  const canCreateType = (type: TeamEventType) => creatableTypes.includes(type)
  const canAssignContentType = (type: string) => assignableContentTypes.includes(type as TeamEventType)
  const contentQueue = events
    .filter(eventNeedsContent)
    .filter((event) => queueOwnerFilter === 'all' || event.contentOwner === queueOwnerFilter)
    .filter((event) => queueStatusFilter === 'open' || event.contentStatus === queueStatusFilter)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const allOpenContentQueue = events.filter(eventNeedsContent)
  const readyAssignmentQueue = events
    .filter((event) => (
      isPhysicalEvent(event) &&
      event.contentStatus === 'CONTENT_READY' &&
      Boolean(event.linkedWorkoutId) &&
      !event.assignedBroadcastId &&
      canAssignContentType(event.type)
    ))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const planningReviewQueue = events
    .filter((event) => eventNeedsReview(event, locale))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const visibleEvents = isStaffPlanningView
    ? events.filter((event) => eventMatchesPlanningFilter(event, planningFilter, locale))
    : events
  const planningFilterCounts = PLANNING_FILTERS.reduce<Record<PlanningFilter, number>>((acc, filter) => {
    acc[filter.value] = events.filter((event) => eventMatchesPlanningFilter(event, filter.value, locale)).length
    return acc
  }, {
    all: 0,
    needsReview: 0,
    iceMissingPlan: 0,
    needsContent: 0,
    ready: 0,
    assigned: 0,
    ice: 0,
    physical: 0,
  })
  const weekEvents = events.filter((event) => {
    const eventDate = new Date(event.startDate)
    return eventDate >= weekDates[0] && eventDate <= weekEnd
  })
  const selectedDayEvents = visibleEvents.filter((event) => isSameDay(new Date(event.startDate), dayStart))
  const weeklyIceEvents = weekEvents.filter(isIcePracticeEvent)
  const weeklyPhysicalEvents = weekEvents.filter(isPhysicalEvent)
  const weeklyGameEvents = weekEvents.filter((event) => event.type === 'GAME')
  const weeklyNeedsContent = weekEvents.filter(eventNeedsContent)
  const weeklyMissingIcePlans = weekEvents.filter((event) => isIcePracticeEvent(event) && !hasPracticePlan(event))
  const weeklyReadyToAssign = weekEvents.filter((event) => (
    isPhysicalEvent(event) &&
    event.contentStatus === 'CONTENT_READY' &&
    Boolean(event.linkedWorkoutId) &&
    !event.assignedBroadcastId
  ))
  const weeklyAssignedEvents = weekEvents.filter((event) => Boolean(event.assignedBroadcastId))
  const weeklyLoadPoints = weekEvents.reduce((sum, event) => sum + eventLoadPoints(event), 0)
  const weeklyLoadLevel = loadLevelFor(weeklyLoadPoints)
  const dayLoadSummaries = weekDates.map((date) => {
    const dayEvents = weekEvents.filter((event) => isSameDay(new Date(event.startDate), date))
    const points = dayEvents.reduce((sum, event) => sum + eventLoadPoints(event), 0)
    return {
      date,
      events: dayEvents,
      points,
      level: loadLevelFor(points),
    }
  })
  const orchestrationWarnings = [
    weeklyNeedsContent.length > 0
      ? text(locale, `${weeklyNeedsContent.length} fyspass saknar workout-innehåll.`, `${weeklyNeedsContent.length} physical sessions are missing workout content.`)
      : null,
    weeklyMissingIcePlans.length > 0
      ? text(locale, `${weeklyMissingIcePlans.length} ispass saknar blockplan.`, `${weeklyMissingIcePlans.length} ice sessions are missing a block plan.`)
      : null,
    ...weeklyGameEvents.flatMap((game) => {
      const gameDate = new Date(game.startDate)
      const previousDay = new Date(gameDate)
      previousDay.setDate(previousDay.getDate() - 1)
      const previousDayPhysical = weeklyPhysicalEvents.filter((event) => isSameDay(new Date(event.startDate), previousDay))
      const previousDayLoad = previousDayPhysical.reduce((sum, event) => sum + eventLoadPoints(event), 0)
      if (previousDayLoad < 3) return []
      return [
        text(
          locale,
          `Tung fys dagen före match: ${game.title} (${gameDate.toLocaleDateString(dateLocale(locale), { weekday: 'short', day: 'numeric', month: 'short' })}).`,
          `Heavy physical load the day before a game: ${game.title} (${gameDate.toLocaleDateString(dateLocale(locale), { weekday: 'short', day: 'numeric', month: 'short' })}).`
        ),
      ]
    }),
    ...dayLoadSummaries
      .filter((day) => day.level === 'high' && day.events.length >= 2)
      .map((day) => text(
        locale,
        `${day.date.toLocaleDateString(dateLocale(locale), { weekday: 'long', day: 'numeric', month: 'short' })} har hög totalbelastning.`,
        `${day.date.toLocaleDateString(dateLocale(locale), { weekday: 'long', day: 'numeric', month: 'short' })} has high total load.`
      )),
  ].filter(Boolean) as string[]
  const nextOrchestrationActions = [
    ...weeklyNeedsContent.slice(0, 3).map((event) => ({
      key: `content-${event.id}`,
      label: text(locale, 'Bygg innehåll', 'Build content'),
      event,
      tone: 'amber' as const,
    })),
    ...weeklyReadyToAssign.slice(0, 3).map((event) => ({
      key: `assign-${event.id}`,
      label: text(locale, 'Tilldela laget', 'Assign to team'),
      event,
      tone: 'emerald' as const,
    })),
    ...weeklyMissingIcePlans.slice(0, 3).map((event) => ({
      key: `ice-${event.id}`,
      label: text(locale, 'Komplettera isplan', 'Complete ice plan'),
      event,
      tone: 'blue' as const,
    })),
  ].slice(0, 6)

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        from: rangeStartIso,
        to: rangeEndIso,
      })
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events?${params}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
        setCalendarPermissions(data.calendarPermissions || null)
      }
    } catch {
      toast.error(text(locale, 'Kunde inte hämta händelser', 'Could not fetch events'))
    } finally {
      setLoading(false)
    }
  }, [teamId, businessSlug, rangeStartIso, rangeEndIso, locale])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const navigateWeek = (direction: number) => {
    const next = new Date(weekBase)
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + direction)
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() + direction)
    } else {
      next.setDate(next.getDate() + direction * 7)
    }
    setWeekBase(next)
    setLoading(true)
  }

  const goToday = () => {
    setWeekBase(new Date())
    setLoading(true)
  }

  const viewLabel = viewMode === 'month'
    ? weekBase.toLocaleDateString(dateLocale(locale), { month: 'long', year: 'numeric' })
    : viewMode === 'day'
      ? weekBase.toLocaleDateString(dateLocale(locale), { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
      : `${weekDates[0].toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' })} - ${weekDates[6].toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' })}`

  const previousLabel = viewMode === 'month'
    ? text(locale, 'Föregående månad', 'Previous month')
    : viewMode === 'day'
      ? text(locale, 'Föregående dag', 'Previous day')
      : text(locale, 'Föregående vecka', 'Previous week')

  const nextLabel = viewMode === 'month'
    ? text(locale, 'Nästa månad', 'Next month')
    : viewMode === 'day'
      ? text(locale, 'Nästa dag', 'Next day')
      : text(locale, 'Nästa vecka', 'Next week')

  const handleDelete = async (eventId: string) => {
    if (!confirm(text(locale, 'Ta bort händelse?', 'Delete event?'))) return
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events/${eventId}${params.size ? `?${params}` : ''}`, {
        method: 'DELETE',
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId))
        toast.success(text(locale, 'Händelse borttagen', 'Event deleted'))
        return
      }
      toast.error(text(locale, 'Kunde inte ta bort händelse', 'Could not delete event'))
    } catch {
      toast.error(text(locale, 'Kunde inte ta bort händelse', 'Could not delete event'))
    }
  }

  const handleAssignReadyWorkout = async (event: TeamEvent) => {
    if (!canAssignContentType(event.type) || !event.linkedWorkoutId) {
      toast.error(text(locale, 'Din roll kan inte tilldela det här passet', 'Your role cannot assign this workout'))
      return
    }

    setAssigningEventId(event.id)
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events/${event.id}/assign-workout${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({ notes: event.description || undefined }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      toast.success(text(locale, `Tilldelat till ${data.assignmentCount ?? 'laget'} spelare`, `Assigned to ${data.assignmentCount ?? 'the team'} players`))
      await fetchEvents()
    } catch {
      toast.error(text(locale, 'Kunde inte tilldela passet', 'Could not assign the workout'))
    } finally {
      setAssigningEventId(null)
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (businessSlug) params.set('businessSlug', businessSlug)
    window.open(`/api/coach/teams/${teamId}/events/export${params.size ? `?${params}` : ''}`, '_blank')
  }

  const openAiCalendarBrief = (focus: 'overview' | 'missingContent' | 'load' = 'overview') => {
    const from = rangeStartIso.slice(0, 10)
    const to = rangeEndIso.slice(0, 10)
    const focusInstruction = {
      overview: text(locale, 'Ge mig en kort prioriterad brief: risker, saknat innehåll, klara pass att tilldela och nästa steg.', 'Give me a short prioritized brief: risks, missing content, workouts ready to assign, and next steps.'),
      missingContent: text(locale, 'Fokusera på fys-pass som saknar innehåll och prioritera vilka som bör byggas först.', 'Focus on physical sessions missing content and prioritize what should be built first.'),
      load: text(locale, 'Fokusera på veckobelastning, matchnära risker och dagar som behöver justeras.', 'Focus on weekly load, game-adjacent risks, and days that should be adjusted.'),
    }[focus]

    openCoachFloatingChat(
      text(
        locale,
        `Läs lagkalendern för ${teamName} (teamId: ${teamId}) från ${from} till ${to}. Använd getTeamCalendarBriefing. ${focusInstruction}`,
        `Read the team calendar for ${teamName} (teamId: ${teamId}) from ${from} to ${to}. Use getTeamCalendarBriefing. ${focusInstruction}`
      )
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)} aria-label={previousLabel}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            {text(locale, 'Idag', 'Today')}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(1)} aria-label={nextLabel}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium capitalize">
            {viewLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-background p-0.5" aria-label={text(locale, 'Kalendervy', 'Calendar view')}>
            {([
              ['day', text(locale, 'Dag', 'Day')],
              ['week', text(locale, 'Vecka', 'Week')],
              ['month', text(locale, 'Månad', 'Month')],
            ] as Array<[CalendarViewMode, string]>).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3"
                onClick={() => {
                  setViewMode(mode)
                  setLoading(true)
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          {isStaffPlanningView && (
            <Button variant="outline" size="sm" onClick={() => openAiCalendarBrief()}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI-brief
            </Button>
          )}
          {isStaffPlanningView && (
            <CreateTeamPlanDialog
              teamId={teamId}
              teamName={teamName}
              businessSlug={businessSlug}
              onCreated={(plan) => setTeamPlans((current) => [plan, ...current])}
              trigger={
                <Button variant="outline" size="sm">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                  {text(locale, 'Blockplan', 'Block plan')}
                </Button>
              }
            />
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {text(locale, 'Exportera .ics', 'Export .ics')}
          </Button>
          {creatableTypes.length > 0 && (
            <CreateEventDialog
              teamId={teamId}
              businessSlug={businessSlug}
              onCreated={fetchEvents}
              allowedEventTypes={creatableTypes}
              defaultType={isPhysicalTrainerCalendar ? 'STRENGTH' : undefined}
              defaultTitle={isPhysicalTrainerCalendar ? text(locale, 'Fys', 'Physical session') : undefined}
              defaultContentStatus={isPhysicalTrainerCalendar ? 'NEEDS_CONTENT' : undefined}
              defaultContentOwner={isPhysicalTrainerCalendar ? 'physical_trainer' : undefined}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {isPhysicalTrainerCalendar ? text(locale, 'Nytt fyspass', 'New physical session') : text(locale, 'Ny händelse', 'New event')}
                </Button>
              }
            />
          )}
        </div>
      </div>

      {isStaffPlanningView && (
        <div className="rounded-lg border bg-background p-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {text(locale, 'Visa', 'Show')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLANNING_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={planningFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPlanningFilter(filter.value)}
                >
                  {filter.label[locale]}
                  <span className="ml-1 text-[10px] opacity-70">{planningFilterCounts[filter.value]}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isStaffPlanningView && viewMode === 'week' && (
        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4" />
                {text(locale, 'Veckans hockeyöversikt', 'Weekly hockey overview')}
              </div>
              <p className="text-xs text-muted-foreground">
                {text(locale, 'Samlar is, fys, matcher och planeringsstatus för veckan.', 'Combines ice, physical work, games, and planning status for the week.')}
              </p>
            </div>
            <Badge variant="outline" className={`mt-1 w-fit ${loadLevelClassName(weeklyLoadLevel)}`}>
              {text(locale, 'Belastning', 'Load')}: {loadLevelLabel(weeklyLoadLevel, locale)}
            </Badge>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {text(locale, 'Is', 'Ice')}
              </div>
              <div className="mt-1 text-2xl font-semibold">{weeklyIceEvents.length}</div>
              <div className="text-xs text-muted-foreground">{sumEventMinutes(weeklyIceEvents)} {text(locale, 'min planerat', 'min planned')}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Dumbbell className="h-3.5 w-3.5" />
                {text(locale, 'Fys', 'Physical')}
              </div>
              <div className="mt-1 text-2xl font-semibold">{weeklyPhysicalEvents.length}</div>
              <div className="text-xs text-muted-foreground">{sumEventMinutes(weeklyPhysicalEvents)} {text(locale, 'min planerat', 'min planned')}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" />
                {text(locale, 'Match', 'Game')}
              </div>
              <div className="mt-1 text-2xl font-semibold">{weeklyGameEvents.length}</div>
              <div className="text-xs text-muted-foreground">
                {weeklyGameEvents.length > 0
                  ? text(locale, 'Kontrollera toppning och återhämtning', 'Check tapering and recovery')
                  : text(locale, 'Ingen match i veckan', 'No game this week')}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {text(locale, 'Status', 'Status')}
              </div>
              <div className="mt-1 text-2xl font-semibold">{weeklyAssignedEvents.length}</div>
              <div className="text-xs text-muted-foreground">
                {text(locale, `${weeklyReadyToAssign.length} klara att tilldela · ${weeklyNeedsContent.length} saknar innehåll`, `${weeklyReadyToAssign.length} ready to assign · ${weeklyNeedsContent.length} missing content`)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-md border p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{text(locale, 'Daglig belastning', 'Daily load')}</div>
              <div className="grid grid-cols-7 gap-1.5">
                {dayLoadSummaries.map((day) => (
                  <button
                    key={day.date.toISOString()}
                    type="button"
                    className={`rounded-md border px-1.5 py-2 text-center ${loadLevelClassName(day.level)} hover:ring-1 hover:ring-primary/30`}
                    onClick={() => {
                      if (day.events[0]) setSelectedEvent(day.events[0])
                    }}
                  >
                    <div className="text-[10px] font-medium uppercase">
                      {day.date.toLocaleDateString(dateLocale(locale), { weekday: 'short' })}
                    </div>
                    <div className="text-base font-semibold">{day.events.length}</div>
                    <div className="text-[10px] opacity-75">{loadLevelLabel(day.level, locale)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <TriangleAlert className="h-3.5 w-3.5" />
                {text(locale, 'Veckosignaler', 'Weekly signals')}
              </div>
              {orchestrationWarnings.length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900">
                  {text(locale, 'Inga tydliga planeringsrisker för veckan.', 'No clear planning risks for the week.')}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {orchestrationWarnings.slice(0, 4).map((warning) => (
                    <div key={warning} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {nextOrchestrationActions.length > 0 && (
            <div className="mt-4 rounded-md border p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{text(locale, 'Nästa åtgärder', 'Next actions')}</div>
              <div className="flex flex-wrap gap-2">
                {nextOrchestrationActions.map((action) => {
                  const toneClassName = action.tone === 'emerald'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : action.tone === 'blue'
                      ? 'border-blue-200 bg-blue-50 text-blue-950'
                      : 'border-amber-200 bg-amber-50 text-amber-950'
                  return (
                    <button
                      key={action.key}
                      type="button"
                      className={`rounded-md border px-2.5 py-2 text-left text-xs shadow-sm ${toneClassName} hover:bg-background`}
                      onClick={() => setSelectedEvent(action.event)}
                    >
                      <div className="font-medium">{action.label}</div>
                      <div className="mt-0.5 opacity-75">
                        {new Date(action.event.startDate).toLocaleDateString(dateLocale(locale), { weekday: 'short', day: 'numeric', month: 'short' })} · {action.event.title}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isStaffPlanningView && activeTeamPlan && (
        <AthletePlanSummaryCard
          plan={activeTeamPlan}
          now={today}
          variant="team"
          action={
            <CreateTeamPlanDialog
              teamId={teamId}
              teamName={teamName}
              businessSlug={businessSlug}
              initialPlan={activeTeamPlan}
              onSaved={(plan) => setTeamPlans((current) => current.map((item) => item.id === plan.id ? plan : item))}
              trigger={<Button variant="outline" size="sm">{text(locale, 'Redigera', 'Edit')}</Button>}
            />
          }
        />
      )}

      {isStaffPlanningView && !activeTeamPlan && (
        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4" />
                {text(locale, 'Ingen aktiv blockplan', 'No active block plan')}
              </div>
              <p className="text-xs text-muted-foreground">
                {text(locale, 'Sätt säsongens faser först, fyll sedan kalendern med pass och matcher.', 'Set the season phases first, then fill the calendar with workouts and games.')}
              </p>
            </div>
            <CreateTeamPlanDialog
              teamId={teamId}
              teamName={teamName}
              businessSlug={businessSlug}
              onCreated={(plan) => setTeamPlans((current) => [plan, ...current])}
            />
          </div>
        </div>
      )}

      {isStaffPlanningView && planningReviewQueue.length > 0 && (
        <div className="rounded-lg border bg-orange-50/70 p-3 text-orange-950">
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TriangleAlert className="h-4 w-4" />
                {text(locale, 'Planeringskontroll', 'Planning review')}
              </div>
              <div className="text-xs text-orange-900/80">
                {text(locale, `${planningReviewQueue.length} pass har detaljer som bör kontrolleras innan publicering.`, `${planningReviewQueue.length} sessions have details that should be checked before publishing.`)}
              </div>
            </div>

            <div className="flex max-w-full flex-wrap gap-2">
              {planningReviewQueue.slice(0, 8).map((event) => {
                const issues = getPlanningIssues(event, locale)
                return (
                  <button
                    key={event.id}
                    type="button"
                    className="rounded-md border border-orange-300 bg-white/70 px-2.5 py-1.5 text-left text-xs shadow-sm hover:bg-white"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-orange-900/75">
                      {new Date(event.startDate).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' })} · {issues.slice(0, 2).join(' · ')}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isStaffPlanningView && readyAssignmentQueue.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-950">
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {text(locale, 'Färdiga pass att tilldela', 'Finished sessions ready to assign')}
              </div>
              <div className="text-xs text-emerald-900/80">
                {text(locale, `${readyAssignmentQueue.length} pass har kopplat workout-innehåll och kan skickas till laget.`, `${readyAssignmentQueue.length} sessions have linked workout content and can be sent to the team.`)}
              </div>
            </div>

            <div className="flex max-w-full flex-wrap gap-2">
              {readyAssignmentQueue.slice(0, 8).map((event) => {
                const typeConfig = getTypeConfig(event.type, locale)
                const isAssigning = assigningEventId === event.id
                return (
                  <div
                    key={event.id}
                    className="rounded-md border border-emerald-300 bg-white/75 px-2.5 py-2 text-xs shadow-sm"
                  >
                    <button
                      type="button"
                      className="block w-full text-left hover:text-emerald-700"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${typeConfig.color}`} />
                        <span className="font-medium">{event.title}</span>
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-800">
                          {typeConfig.label}
                        </Badge>
                      </div>
                      <div className="mt-1 text-emerald-900/75">
                        {new Date(event.startDate).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' })}
                        {!event.allDay && ` ${formatTime(event.startDate, locale)}`}
                      </div>
                      {event.linkedWorkoutName && (
                        <div className="mt-1 max-w-64 truncate text-emerald-900/75">
                          {event.linkedWorkoutName}
                        </div>
                      )}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={Boolean(assigningEventId)}
                        onClick={() => void handleAssignReadyWorkout(event)}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        {isAssigning ? text(locale, 'Tilldelar...', 'Assigning...') : text(locale, 'Tilldela laget', 'Assign to team')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSelectedEvent(event)}
                      >
                        {text(locale, 'Öppna', 'Open')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isStaffPlanningView && allOpenContentQueue.length > 0 && (
        <div className="rounded-lg border bg-amber-50/70 p-3 text-amber-950">
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Filter className="h-4 w-4" />
                    {text(locale, 'Fys-pass som behöver innehåll', 'Physical sessions that need content')}
                  </div>
                  <div className="text-xs text-amber-900/80">
                    {text(locale, `${allOpenContentQueue.length} planerade pass saknar kopplat workout-innehåll.`, `${allOpenContentQueue.length} planned sessions are missing linked workout content.`)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 border-amber-300 bg-white/70 px-2 text-xs text-amber-950 hover:bg-white"
                  onClick={() => openAiCalendarBrief('missingContent')}
                >
                  <MessageSquareText className="mr-1 h-3.5 w-3.5" />
                  {text(locale, 'Prioritera med AI', 'Prioritize with AI')}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={queueStatusFilter === 'open' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueStatusFilter('open')}
              >
                {text(locale, 'Alla öppna', 'All open')}
              </Button>
              <Button
                type="button"
                variant={queueStatusFilter === 'PLANNED' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueStatusFilter('PLANNED')}
              >
                {teamEventContentStatusLabel('PLANNED', locale)}
              </Button>
              <Button
                type="button"
                variant={queueStatusFilter === 'NEEDS_CONTENT' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueStatusFilter('NEEDS_CONTENT')}
              >
                {teamEventContentStatusLabel('NEEDS_CONTENT', locale)}
              </Button>
              <Button
                type="button"
                variant={queueOwnerFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueOwnerFilter('all')}
              >
                {text(locale, 'Alla roller', 'All roles')}
              </Button>
              {TEAM_EVENT_CONTENT_OWNERS.map((owner) => (
                <Button
                  key={owner}
                  type="button"
                  variant={queueOwnerFilter === owner ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setQueueOwnerFilter(owner)}
                >
                  {teamEventContentOwnerLabel(owner, locale)}
                </Button>
              ))}
            </div>

            <div className="flex max-w-full flex-wrap gap-2">
              {contentQueue.length === 0 ? (
                <div className="text-xs text-amber-900/75">{text(locale, 'Inga pass matchar filtret.', 'No sessions match the filter.')}</div>
              ) : (
                contentQueue.slice(0, 8).map((event) => {
                  const builderLink = builderLinkForEvent(event, teamId, businessSlug)
                  const typeConfig = getTypeConfig(event.type, locale)
                  return (
                    <div
                      key={event.id}
                      className="relative rounded-md border border-amber-300 bg-white/70 px-2.5 py-2 pr-8 text-xs shadow-sm"
                    >
                      <button
                        type="button"
                        className="block w-full text-left hover:text-amber-700"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${typeConfig.color}`} />
                          <span className="font-medium">{event.title}</span>
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800">
                            {typeConfig.label}
                          </Badge>
                        </div>
                        <div className="mt-1 text-amber-900/75">
                          {new Date(event.startDate).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' })}
                          {!event.allDay && ` ${formatTime(event.startDate, locale)}`}
                          {' · '}
                          {contentOwnerLabel(event.contentOwner, locale)} · {contentStatusLabel(event.contentStatus, locale)}
                        </div>
                      </button>
                      {canCreateType(event.type as TeamEventType) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1.5 top-1.5 h-6 w-6 p-0 text-amber-900/55 hover:bg-red-50 hover:text-destructive"
                          aria-label={text(locale, `Ta bort ${event.title}`, `Delete ${event.title}`)}
                          title={text(locale, 'Ta bort', 'Delete')}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDelete(event.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setSelectedEvent(event)}
                        >
                          {text(locale, 'Planera', 'Plan')}
                        </Button>
                        {builderLink && (
                          <Button asChild type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
                            <Link href={builderLink.href}>
                              {builderLink.label}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar view */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : viewMode === 'day' ? (
        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {dayStart.toLocaleDateString(dateLocale(locale), { weekday: 'long' })}
            </div>
            <div className="text-2xl font-semibold">
              {dayStart.toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div className="space-y-2 p-3">
            {selectedDayEvents.length === 0 ? (
              <div className="flex min-h-[140px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                {text(locale, 'Inga händelser den här dagen.', 'No events on this day.')}
              </div>
            ) : (
              selectedDayEvents.map((event) => {
                const typeConf = getTypeConfig(event.type, locale)
                const descriptionLine = firstDescriptionLine(event.description)
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 rounded-md border bg-card p-3 text-sm group cursor-pointer hover:border-primary/40 hover:bg-muted/30"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEvent(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedEvent(event)
                      }
                    }}
                  >
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${typeConf.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {typeConf.label}
                        </Badge>
                        <PlanningBadges event={event} locale={locale} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {!event.allDay && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {formatTime(event.startDate, locale)}
                            {event.endDate && ` - ${formatTime(event.endDate, locale)}`}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                      {descriptionLine && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {descriptionLine}
                        </div>
                      )}
                      {event.linkedWorkoutName && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {text(locale, 'Kopplat pass', 'Linked workout')}: {event.linkedWorkoutName}
                        </div>
                      )}
                    </div>
                    {canCreateType(event.type as TeamEventType) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(event.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : viewMode === 'month' ? (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full min-w-[1230px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-[58px]" />
              <col className="w-[92px]" />
              <col className="w-[52px]" />
              <col className="w-[500px]" />
              <col className="w-[150px]" />
              <col className="w-[260px]" />
              <col className="w-[124px]" />
            </colgroup>
            <thead>
              <tr className="bg-muted/70 text-left">
                <th className="border-r px-2 py-2 font-semibold">{text(locale, 'v.', 'wk')}</th>
                <th className="border-r px-2 py-2 font-semibold">{text(locale, 'Dag', 'Day')}</th>
                <th className="border-r px-2 py-2 font-semibold">{text(locale, 'Datum', 'Date')}</th>
                <th className="border-r px-2 py-2 font-semibold">{text(locale, 'Is', 'Ice')}</th>
                <th className="border-r px-2 py-2 font-semibold">{text(locale, 'Fys', 'Physical')}</th>
                <th className="border-r px-2 py-2 font-semibold">{text(locale, 'Match / lag', 'Game / team')}</th>
                <th className="border-r px-2 py-2 font-semibold">{text(locale, 'Övrigt', 'Other')}</th>
                <th className="px-2 py-2 font-semibold bg-amber-100 text-amber-950">{text(locale, 'Årshjul', 'Annual plan')}</th>
              </tr>
            </thead>
            <tbody>
              {monthDates.map((date) => {
                const dayEvents = visibleEvents.filter((e) => isSameDay(new Date(e.startDate), date))
                const grouped = {
                  ice: dayEvents.filter((event) => planningColumnFor(event.type) === 'ice'),
                  physical: dayEvents.filter((event) => planningColumnFor(event.type) === 'physical'),
                  team: dayEvents.filter((event) => planningColumnFor(event.type) === 'team'),
                  other: dayEvents.filter((event) => planningColumnFor(event.type) === 'other'),
                  annual: dayEvents.filter((event) => planningColumnFor(event.type) === 'annual'),
                }
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const dayName = date.toLocaleDateString(dateLocale(locale), { weekday: 'short' }).toUpperCase()
                const weekNumber = Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7)
                const planBlock = activeTeamPlan ? planBlockForDate(activeTeamPlan.blocks, date) : null
                const planBlockIndex = planBlock && activeTeamPlan
                  ? activeTeamPlan.blocks.findIndex((block) => block.id === planBlock.id)
                  : -1
                const planBlockColor = planBlockIndex >= 0 ? getPlanBlockColor(planBlockIndex) : null

                const renderQuickAdd = (defaultType: TeamEventType) => {
                  if (defaultType === 'STRENGTH') {
                    return (
                      <div className="flex flex-wrap gap-1">
                        {PLANNING_QUICK_TYPES.map((quickType) => (
                          canCreateType(quickType.type) ? (
                            <CreateEventDialog
                              key={quickType.type}
                              teamId={teamId}
                              businessSlug={businessSlug}
                              onCreated={fetchEvents}
                              defaultDate={inputDateValue(date)}
                              defaultType={quickType.type}
                              defaultTitle={quickType.title[locale]}
                              defaultContentStatus={quickType.type === 'TEST' ? 'PLANNED' : 'NEEDS_CONTENT'}
                              defaultContentOwner="physical_trainer"
                              allowedEventTypes={creatableTypes}
                              trigger={
                                <button
                                  type="button"
                                  className="rounded border bg-background px-1.5 py-0.5 text-[10px] leading-4 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  {quickType.label}
                                </button>
                              }
                            />
                          ) : null
                        ))}
                      </div>
                    )
                  }

                  if (!canCreateType(defaultType)) return null

                  return (
                    <CreateEventDialog
                      teamId={teamId}
                      businessSlug={businessSlug}
                      onCreated={fetchEvents}
                      defaultDate={inputDateValue(date)}
                      defaultType={defaultType}
                      allowedEventTypes={creatableTypes}
                      trigger={
                        <button
                          type="button"
                          className="flex w-full items-center gap-1 rounded-sm px-1.5 py-1 text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                          {text(locale, 'Lägg till', 'Add')}
                        </button>
                      }
                    />
                  )
                }

                const renderCell = (cellEvents: TeamEvent[], defaultType: TeamEventType) => (
                  <div className="space-y-1">
                    {cellEvents.length === 0 ? (
                      renderQuickAdd(defaultType)
                    ) : (
                      <>
                        {cellEvents.map((event) => {
                          const typeConf = getTypeConfig(event.type, locale)
                          return (
                            <button
                              key={event.id}
                              type="button"
                              className="block w-full rounded-sm px-1.5 py-1 text-left hover:bg-muted"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${typeConf.color}`} />
                              <span className="font-medium">{compactEventText(event, locale)}</span>
                              <PlanningBadges event={event} locale={locale} compact />
                            </button>
                          )
                        })}
                        {renderQuickAdd(defaultType)}
                      </>
                    )}
                  </div>
                )

                return (
                  <tr
                    key={date.toISOString()}
                    className={cn(
                      'border-l-4',
                      planBlockColor ? [planBlockColor.row, planBlockColor.rowBorder] : 'border-l-transparent',
                      !planBlockColor && isWeekend ? 'bg-muted/40' : ''
                    )}
                  >
                    <td className="border-r border-t px-1.5 py-2 text-muted-foreground">{date.getDay() === 1 ? `${text(locale, 'v.', 'wk ')}${weekNumber}` : ''}</td>
                    <td className={`border-r border-t px-1.5 py-2 font-semibold ${date.getDay() === 0 ? 'text-red-600' : ''}`}>{dayName}</td>
                    <td className="border-r border-t px-1.5 py-2">
                      <div className="flex items-center gap-1.5">
                        {planBlockColor && (
                          <span className={cn('h-2 w-2 rounded-full', planBlockColor.marker)} />
                        )}
                        <span>{date.getDate()}</span>
                      </div>
                      {planBlock && (
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {planBlock.title}
                        </div>
                      )}
                    </td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.ice, 'PRACTICE')}</td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.physical, 'STRENGTH')}</td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.team, 'GAME')}</td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.other, 'OTHER')}</td>
                    <td className="border-t bg-amber-50 px-2 py-2 align-top">{renderCell(grouped.annual, 'ANNUAL_PLAN')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-1">
          {weekDates.map((date) => {
            const dayEvents = visibleEvents.filter((e) => isSameDay(new Date(e.startDate), date))
            const isToday = isSameDay(date, today)
            const isPast = date < today && !isToday
            const dayName = date.toLocaleDateString(dateLocale(locale), { weekday: 'short' })
            const dayNum = date.getDate()

            return (
              <div
                key={date.toISOString()}
                className={`flex gap-3 p-2 rounded-lg transition-colors ${
                  isToday
                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                    : isPast
                      ? 'opacity-60'
                      : 'hover:bg-muted/50'
                }`}
              >
                {/* Day label */}
                <div className="w-12 shrink-0 text-center pt-1">
                  <div className="text-[10px] uppercase font-medium text-muted-foreground">{dayName}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {dayNum}
                  </div>
                </div>

                {/* Events */}
                <div className="flex-1 min-h-[40px]">
                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-muted-foreground pt-2">—</div>
                  ) : (
                    <div className="space-y-1">
                      {dayEvents.map((event) => {
                        const typeConf = getTypeConfig(event.type, locale)
                        const descriptionLine = firstDescriptionLine(event.description)
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-2 p-2 rounded-md bg-card border text-sm group cursor-pointer hover:border-primary/40 hover:bg-muted/30"
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedEvent(event)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedEvent(event)
                              }
                            }}
                          >
                            <div className={`w-1 self-stretch rounded-full shrink-0 ${typeConf.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{event.title}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {typeConf.label}
                                </Badge>
                                <PlanningBadges event={event} locale={locale} />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {!event.allDay && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(event.startDate, locale)}
                                    {event.endDate && ` - ${formatTime(event.endDate, locale)}`}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                              {descriptionLine && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  {descriptionLine}
                                </div>
                              )}
                              {event.linkedWorkoutName && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  Kopplat pass: {event.linkedWorkoutName}
                                </div>
                              )}
                            </div>
                            {canCreateType(event.type as TeamEventType) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleDelete(event.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EditEventDialog
        event={selectedEvent}
        teamId={teamId}
        businessSlug={businessSlug}
        canEdit={selectedEvent ? canCreateType(selectedEvent.type as TeamEventType) : false}
        canAssignContent={selectedEvent ? canAssignContentType(selectedEvent.type) : false}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
        onUpdated={fetchEvents}
      />
    </div>
  )
}
