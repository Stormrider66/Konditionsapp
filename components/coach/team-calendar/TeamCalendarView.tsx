'use client'

import { useState, useEffect, useCallback } from 'react'
import { getISOWeek } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'
import { CreateEventDialog } from './CreateEventDialog'
import { EditEventDialog } from './EditEventDialog'
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import {
  AthletePlanSummaryCard,
  getPlanBlockColor,
  type AthletePlanSummary,
} from '@/components/athlete-plans/AthletePlanSummaryCard'
import Link from 'next/link'
import {
  TEAM_EVENT_CONTENT_OWNERS,
  teamEventContentOwnerLabel,
  teamEventContentStatusLabel,
  type TeamCalendarLocale,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
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
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'
import { inputDateValue } from '@/lib/team-calendar/date-time'
import { openCoachFloatingChat } from '@/lib/events/coach-floating-chat'
import { useLocale } from '@/i18n/client'
import { cn } from '@/lib/utils'
import {
  PLANNING_FILTERS,
  PLANNING_QUICK_TYPES,
  PlanningBadges,
  builderLinkForEvent,
  compactEventText,
  contentOwnerLabel,
  contentStatusLabel,
  dateLocale,
  eventLoadPoints,
  eventMatchesPlanningFilter,
  eventNeedsContent,
  eventNeedsReview,
  firstDescriptionLine,
  formatTime,
  getMonthDates,
  getPlanningIssues,
  getTypeConfig,
  getWeekDates,
  hasPracticePlan,
  isIcePracticeEvent,
  isPhysicalEvent,
  isSameDay,
  loadLevelClassName,
  loadLevelFor,
  loadLevelLabel,
  planBlockForDate,
  planningColumnFor,
  sumEventMinutes,
  text,
  type CalendarViewMode,
  type PlanningFilter,
  type TeamCalendarPermissions,
  type TeamEvent,
} from './team-calendar-view-helpers'

interface TeamCalendarViewProps {
  teamId: string
  teamName: string
  businessSlug?: string
  initialTeamPlans?: AthletePlanSummary[]
}

type AssignableWorkoutType = 'strength' | 'cardio' | 'hybrid' | 'agility'

interface TeamMemberPreview {
  id: string
  name: string
  athleteAccount?: { id: string } | null
}

interface RestrictionPreviewBlocked {
  athleteId: string
  exerciseNames?: string[]
}

function workoutTypeForRestrictionPreview(type: string | null | undefined): AssignableWorkoutType | null {
  const normalized = type?.toLowerCase()
  if (normalized === 'strength' || normalized === 'cardio' || normalized === 'hybrid' || normalized === 'agility') {
    return normalized
  }
  return null
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
  const [launchingEventId, setLaunchingEventId] = useState<string | null>(null)
  const [overviewOpen, setOverviewOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('team-calendar-overview-open') === 'true'
    } catch {
      return false
    }
  })
  const [planningMode, setPlanningMode] = useState(false)

  const weekDates = getWeekDates(weekBase)
  const monthDates = getMonthDates(weekBase)
  // Pad the month's days into whole Monday-start weeks for the normal calendar grid.
  const monthGridDays: Array<Date | null> = (() => {
    const first = monthDates[0]
    if (!first) return []
    const lead = (first.getDay() + 6) % 7 // Monday = 0 … Sunday = 6
    const cells: Array<Date | null> = []
    for (let i = 0; i < lead; i += 1) cells.push(null)
    monthDates.forEach((d) => cells.push(d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  })()
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
  const currentPlanBlock = activeTeamPlan ? planBlockForDate(activeTeamPlan.blocks, today) : null
  const currentPlanBlockIndex = currentPlanBlock && activeTeamPlan
    ? activeTeamPlan.blocks.findIndex((block) => block.id === currentPlanBlock.id)
    : -1
  const currentPlanBlockColor = currentPlanBlockIndex >= 0 ? getPlanBlockColor(currentPlanBlockIndex) : null

  // Stabilize the ISO strings outside the dep array — react-hooks v6
  // requires deps to be simple expressions (no method calls).
  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()
  const isPhysicalTrainerCalendar = calendarPermissions?.role === 'PHYSICAL_TRAINER'
  const canCreateType = (type: TeamEventType) => creatableTypes.includes(type)
  const canAssignContentType = (type: string) => assignableContentTypes.includes(type as TeamEventType)
  const canLaunchIntervalSession = (event: TeamEvent) => (
    isStaffPlanningView &&
    (
      Boolean(event.intervalSession) ||
      event.type === 'INTERVAL_SESSION' ||
      (event.linkedWorkoutType === 'CARDIO' && Boolean(event.linkedWorkoutId)) ||
      (event.linkedWorkoutType === 'HYBRID' && Boolean(event.linkedWorkoutId))
    )
  )
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

  const toggleOverview = () => {
    setOverviewOpen((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem('team-calendar-overview-open', String(next))
      } catch {
        // ignore unavailable storage
      }
      return next
    })
  }

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

  const selectViewMode = (mode: CalendarViewMode) => {
    setPlanningMode(false)
    if (mode !== viewMode) {
      setViewMode(mode)
      setLoading(true)
    }
  }

  const enterPlanningMode = () => {
    setPlanningMode(true)
    // The planning spreadsheet is month-scoped; only refetch if we weren't already on the month range.
    if (viewMode !== 'month') {
      setViewMode('month')
      setLoading(true)
    }
  }

  const exitPlanningMode = () => {
    // Stay on the month — now rendered as the normal calendar — so no refetch is needed.
    setPlanningMode(false)
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

  const confirmAssignmentRestrictionPreview = async (event: TeamEvent): Promise<boolean> => {
    const workoutType = workoutTypeForRestrictionPreview(event.linkedWorkoutType)
    if (!workoutType || !event.linkedWorkoutId) return true

    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const query = params.size ? `?${params}` : ''
      const headers: Record<string, string> = businessSlug ? { 'x-business-slug': businessSlug } : {}

      const teamResponse = await fetch(`/api/teams/${teamId}${query}`, { headers })
      const teamJson = await teamResponse.json()
      const members = ((teamJson?.data?.members ?? []) as TeamMemberPreview[])
        .filter((member) => Boolean(member.athleteAccount))

      if (!teamResponse.ok || members.length === 0) return true

      const previewResponse = await fetch(`/api/teams/${teamId}/assign-workout/preview${query}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          workoutType,
          workoutId: event.linkedWorkoutId,
          athleteIds: members.map((member) => member.id),
        }),
      })
      const previewJson = await previewResponse.json()
      if (!previewResponse.ok || !previewJson?.success) return true

      const blocked = (previewJson.data?.blocked ?? []) as RestrictionPreviewBlocked[]
      if (blocked.length === 0) return true

      const nameById = new Map(members.map((member) => [member.id, member.name]))
      const blockedLines = blocked.slice(0, 5).map((item) => {
        const name = nameById.get(item.athleteId) ?? text(locale, 'Okänd spelare', 'Unknown player')
        const exercises = item.exerciseNames?.slice(0, 3).join(', ')
        return exercises ? `${name}: ${exercises}` : name
      })
      const more = blocked.length > 5
        ? text(locale, `\n+${blocked.length - 5} till`, `\n+${blocked.length - 5} more`)
        : ''

      return confirm(text(
        locale,
        `${blocked.length} spelare blockeras av aktiva restriktioner och kommer att hoppas över:\n\n${blockedLines.join('\n')}${more}\n\nVill du tilldela passet till resterande spelare?`,
        `${blocked.length} players are blocked by active restrictions and will be skipped:\n\n${blockedLines.join('\n')}${more}\n\nAssign this workout to the remaining players?`
      ))
    } catch {
      return true
    }
  }

  const handleAssignReadyWorkout = async (event: TeamEvent) => {
    if (!canAssignContentType(event.type) || !event.linkedWorkoutId) {
      toast.error(text(locale, 'Din roll kan inte tilldela det här passet', 'Your role cannot assign this workout'))
      return
    }

    setAssigningEventId(event.id)
    try {
      const shouldContinue = await confirmAssignmentRestrictionPreview(event)
      if (!shouldContinue) return

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
      if (Array.isArray(data.skipped) && data.skipped.length > 0) {
        const skippedNames = data.skipped.slice(0, 4).map((item: { name?: string }) => item.name).filter(Boolean).join(', ')
        toast.warning(text(
          locale,
          `${data.skipped.length} spelare hoppades över på grund av restriktioner${skippedNames ? `: ${skippedNames}` : ''}`,
          `${data.skipped.length} players were skipped by restrictions${skippedNames ? `: ${skippedNames}` : ''}`
        ))
      }
      await fetchEvents()
    } catch {
      toast.error(text(locale, 'Kunde inte tilldela passet', 'Could not assign the workout'))
    } finally {
      setAssigningEventId(null)
    }
  }

  const handleLaunchIntervalSession = async (event: TeamEvent) => {
    if (event.intervalSession?.id) {
      window.location.assign(`${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions/${event.intervalSession.id}`)
      return
    }

    setLaunchingEventId(event.id)
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events/${event.id}/launch-interval-session${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
      })

      const data = await res.json()
      if (!res.ok || !data.sessionId) throw new Error(data.error || 'Failed')

      toast.success(data.created
        ? text(locale, 'Intervallsession skapad', 'Interval session created')
        : text(locale, 'Intervallsession öppnas', 'Opening interval session'))
      window.location.assign(`${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions/${data.sessionId}`)
    } catch {
      toast.error(text(locale, 'Kunde inte starta intervallsessionen', 'Could not launch the interval session'))
    } finally {
      setLaunchingEventId(null)
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
                variant={viewMode === mode && !planningMode ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3"
                onClick={() => selectViewMode(mode)}
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
          {isStaffPlanningView && !planningMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={enterPlanningMode}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              {text(locale, 'Planeringsläge', 'Planning mode')}
            </Button>
          )}
          {isStaffPlanningView && planningMode && (
            <Button
              variant="default"
              size="sm"
              onClick={exitPlanningMode}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              {text(locale, 'Stäng planering', 'Close planning')}
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

      {isStaffPlanningView && (viewMode === 'week' || activeTeamPlan) && (
        <div className="rounded-lg border bg-background">
          <button
            type="button"
            onClick={toggleOverview}
            aria-expanded={overviewOpen}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40"
          >
            <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', overviewOpen && 'rotate-90')} />
            <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-semibold">{text(locale, 'Veckoöversikt & plan', 'Weekly overview & plan')}</span>
            {!overviewOpen && (
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                {currentPlanBlock && (
                  <Badge variant="outline" className="gap-1.5 text-[11px] font-normal">
                    {currentPlanBlockColor && <span className={cn('h-2 w-2 rounded-full', currentPlanBlockColor.marker)} />}
                    <span>{currentPlanBlock.title}</span>
                    {activeTeamPlan && currentPlanBlockIndex >= 0 && (
                      <span className="opacity-60">{currentPlanBlockIndex + 1}/{activeTeamPlan.blocks.length}</span>
                    )}
                  </Badge>
                )}
                {viewMode === 'week' && (
                  <Badge variant="outline" className={cn('text-[11px] font-normal', loadLevelClassName(weeklyLoadLevel))}>
                    {text(locale, 'Belastning', 'Load')}: {loadLevelLabel(weeklyLoadLevel, locale)}
                  </Badge>
                )}
                {viewMode === 'week' && orchestrationWarnings.length > 0 && (
                  <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-[11px] font-normal text-amber-900">
                    <TriangleAlert className="h-3 w-3" />
                    {text(locale, `${orchestrationWarnings.length} signaler`, `${orchestrationWarnings.length} signals`)}
                  </Badge>
                )}
              </div>
            )}
          </button>
          {overviewOpen && (
            <div className="space-y-4 border-t p-4">
              {viewMode === 'week' && (
                <div>
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
              {activeTeamPlan && (
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
            </div>
          )}
        </div>
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
                      {canLaunchIntervalSession(event) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-orange-300 text-orange-800 hover:bg-orange-50"
                          disabled={Boolean(launchingEventId)}
                          onClick={() => void handleLaunchIntervalSession(event)}
                        >
                          <Timer className="mr-1 h-3 w-3" />
                          {launchingEventId === event.id
                            ? text(locale, 'Startar...', 'Launching...')
                            : event.intervalSession
                              ? text(locale, 'Öppna live', 'Open live')
                              : text(locale, 'Starta live', 'Launch live')}
                        </Button>
                      )}
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
            <Skeleton key={i} className={roleSkeletonClass('h-16')} />
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
                    {canLaunchIntervalSession(event) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs border-orange-300 text-orange-800 hover:bg-orange-50"
                        disabled={Boolean(launchingEventId)}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleLaunchIntervalSession(event)
                        }}
                      >
                        <Timer className="mr-1 h-3 w-3" />
                        {launchingEventId === event.id
                          ? text(locale, 'Startar...', 'Launching...')
                          : event.intervalSession
                            ? text(locale, 'Öppna live', 'Open live')
                            : text(locale, 'Starta live', 'Launch live')}
                      </Button>
                    )}
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
      ) : planningMode ? (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full min-w-[1280px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[40px]" />
              <col className="w-[56px]" />
              <col className="w-[68px]" />
              <col className="w-[220px]" />
              <col className="w-[360px]" />
              <col className="w-[160px]" />
              <col className="w-[220px]" />
              <col className="w-[156px]" />
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
                const weekNumber = getISOWeek(date)
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
                    <td className="border-r border-t px-1 py-2 text-muted-foreground">{date.getDay() === 1 ? `${text(locale, 'v.', 'wk ')}${weekNumber}` : ''}</td>
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
      ) : viewMode === 'month' ? (
        <div className="rounded-lg border bg-background p-2 sm:p-3">
          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekDates.map((d) => (
              <div
                key={`month-header-${d.getDay()}`}
                className={cn(
                  'px-1 py-1 text-center text-[11px] font-medium uppercase text-muted-foreground',
                  d.getDay() === 0 && 'text-red-600'
                )}
              >
                {d.toLocaleDateString(dateLocale(locale), { weekday: 'short' })}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGridDays.map((date, idx) => {
              if (!date) {
                return <div key={`month-pad-${idx}`} className="min-h-[96px] rounded-md border border-dashed border-muted bg-muted/10" />
              }
              const dayEvents = visibleEvents
                .filter((e) => isSameDay(new Date(e.startDate), date))
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              const isToday = isSameDay(date, today)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const planBlock = activeTeamPlan ? planBlockForDate(activeTeamPlan.blocks, date) : null
              const planBlockIndex = planBlock && activeTeamPlan
                ? activeTeamPlan.blocks.findIndex((block) => block.id === planBlock.id)
                : -1
              const planBlockColor = planBlockIndex >= 0 ? getPlanBlockColor(planBlockIndex) : null
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'min-h-[96px] rounded-md border p-1',
                    planBlockColor ? planBlockColor.row : isWeekend ? 'bg-muted/30' : 'bg-background'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-medium',
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : date.getDay() === 0
                            ? 'text-red-600'
                            : 'text-foreground'
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {planBlockColor && <span className={cn('h-2 w-2 shrink-0 rounded-full', planBlockColor.marker)} />}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => {
                      const typeConf = getTypeConfig(event.type, locale)
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-[11px] hover:bg-muted"
                          title={`${formatTime(event.startDate, locale)} · ${event.title}`}
                        >
                          <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${typeConf.color}`} />
                          <span className="truncate">{event.title}</span>
                        </button>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setWeekBase(date)
                          selectViewMode('day')
                        }}
                        className="w-full rounded-sm px-1 text-left text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        +{dayEvents.length - 3} {text(locale, 'fler', 'more')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
                            {canLaunchIntervalSession(event) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 shrink-0 px-2 text-xs border-orange-300 text-orange-800 hover:bg-orange-50"
                                disabled={Boolean(launchingEventId)}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleLaunchIntervalSession(event)
                                }}
                              >
                                <Timer className="mr-1 h-3 w-3" />
                                {event.intervalSession ? text(locale, 'Live', 'Live') : text(locale, 'Starta', 'Launch')}
                              </Button>
                            )}
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
