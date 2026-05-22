import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_CONTENT_OWNER_LABELS,
  TEAM_EVENT_CONTENT_STATUS_LABELS,
  TEAM_EVENT_TYPE_LABELS,
  isTeamEventType,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'

export type TeamCalendarLoadLevel = 'low' | 'moderate' | 'high'
type AppLocale = 'en' | 'sv'

export type TeamCalendarBriefingEvent = {
  id: string
  title: string
  type: string
  location: string | null
  startDate: Date
  endDate: Date | null
  allDay: boolean
  contentStatus: string
  contentOwner: string | null
  practicePlan: unknown
  linkedWorkoutId: string | null
  linkedWorkoutName: string | null
  assignedBroadcastId: string | null
  assignmentSummary?: {
    totalAssigned: number
    totalCompleted: number
    completionRate: number
  } | null
}

export type TeamCalendarBriefing = {
  team: { id: string; name: string; sportType: string | null }
  range: { start: string; end: string }
  totals: {
    events: number
    iceSessions: number
    physicalSessions: number
    games: number
    tests: number
    assigned: number
    readyToAssign: number
    needsContent: number
    missingIcePlans: number
    iceMinutes: number
    physicalMinutes: number
    loadPoints: number
    loadLevel: TeamCalendarLoadLevel
  }
  warnings: string[]
  nextActions: Array<{
    type: 'build_content' | 'assign_ready' | 'complete_ice_plan' | 'review_load'
    eventId?: string
    eventTitle?: string
    date?: string
    message: string
  }>
  events: Array<{
    id: string
    title: string
    type: string
    typeLabel: string
    date: string
    startTime: string | null
    endTime: string | null
    location: string | null
    contentStatus: string
    contentStatusLabel: string
    contentOwnerLabel: string | null
    linkedWorkoutName: string | null
    assignment: { totalAssigned: number; totalCompleted: number; completionRate: number } | null
    planningFlags: string[]
  }>
  dayLoads: Array<{
    date: string
    eventCount: number
    loadPoints: number
    loadLevel: TeamCalendarLoadLevel
    labels: string[]
  }>
  summaryText: string
}

const TEAM_EVENT_TYPE_LABELS_EN: Record<TeamEventType, string> = {
  PRACTICE: 'Ice practice',
  ICE_PRACTICE: 'Ice practice',
  STRENGTH: 'Strength',
  CARDIO: 'Conditioning',
  HYBRID: 'Hybrid',
  AGILITY: 'Agility',
  PREHAB: 'Stability / Prehab',
  PLYOMETRICS: 'Plyometrics',
  GAME: 'Game',
  TEST: 'Test',
  INTERVAL_SESSION: 'Interval session',
  OFF_DAY: 'Rest day',
  MEETING: 'Meeting',
  ANNUAL_PLAN: 'Annual plan',
  OTHER: 'Other',
}

const TEAM_EVENT_CONTENT_STATUS_LABELS_EN: Record<TeamEventContentStatus, string> = {
  PLANNED: 'Planned outline',
  NEEDS_CONTENT: 'Needs content',
  CONTENT_READY: 'Content ready',
  ASSIGNED: 'Assigned',
}

const TEAM_EVENT_CONTENT_OWNER_LABELS_EN: Record<TeamEventContentOwner, string> = {
  coach: 'Coaching staff',
  physical_trainer: 'Physical trainer',
  physio: 'Physiotherapist',
  shared: 'Shared responsibility',
  self: 'Own responsibility',
}

function getDateFormatter(locale: AppLocale): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function getTimeFormatter(locale: AppLocale): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDate(date: Date, locale: AppLocale): string {
  return getDateFormatter(locale).format(date)
}

function formatTime(date: Date, locale: AppLocale): string {
  return getTimeFormatter(locale).format(date)
}

function eventTypeLabel(type: string, locale: AppLocale): string {
  if (isTeamEventType(type)) return locale === 'sv' ? TEAM_EVENT_TYPE_LABELS[type] : TEAM_EVENT_TYPE_LABELS_EN[type]
  return type || (locale === 'sv' ? 'Övrigt' : 'Other')
}

function contentStatusLabel(status: string, locale: AppLocale): string {
  const labels = locale === 'sv' ? TEAM_EVENT_CONTENT_STATUS_LABELS : TEAM_EVENT_CONTENT_STATUS_LABELS_EN
  if (labels[status as TeamEventContentStatus]) {
    return labels[status as TeamEventContentStatus]
  }
  return labels.PLANNED
}

function contentOwnerLabel(owner: string | null, locale: AppLocale): string | null {
  if (!owner) return null
  const labels = locale === 'sv' ? TEAM_EVENT_CONTENT_OWNER_LABELS : TEAM_EVENT_CONTENT_OWNER_LABELS_EN
  if (labels[owner as TeamEventContentOwner]) {
    return labels[owner as TeamEventContentOwner]
  }
  return owner
}

export function teamCalendarEventDurationMinutes(event: Pick<TeamCalendarBriefingEvent, 'allDay' | 'startDate' | 'endDate'>): number | null {
  if (event.allDay || !event.endDate) return null
  const start = event.startDate.getTime()
  const end = event.endDate.getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return Math.round((end - start) / 60000)
}

export function isTeamCalendarIcePractice(event: Pick<TeamCalendarBriefingEvent, 'type'>): boolean {
  return event.type === 'PRACTICE' || event.type === 'ICE_PRACTICE'
}

export function isTeamCalendarPhysicalEvent(event: Pick<TeamCalendarBriefingEvent, 'type'>): boolean {
  return PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)
}

export function teamCalendarEventHasPracticePlan(event: Pick<TeamCalendarBriefingEvent, 'practicePlan'>): boolean {
  return Array.isArray(event.practicePlan) && event.practicePlan.length > 0
}

export function teamCalendarEventNeedsContent(event: TeamCalendarBriefingEvent): boolean {
  if (!isTeamCalendarPhysicalEvent(event)) return false
  if (event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId) return false
  return event.contentStatus !== 'CONTENT_READY' || !event.linkedWorkoutId
}

export function teamCalendarEventReadyToAssign(event: TeamCalendarBriefingEvent): boolean {
  return (
    isTeamCalendarPhysicalEvent(event) &&
    event.contentStatus === 'CONTENT_READY' &&
    Boolean(event.linkedWorkoutId) &&
    !event.assignedBroadcastId
  )
}

export function teamCalendarLoadPoints(event: TeamCalendarBriefingEvent): number {
  const duration = teamCalendarEventDurationMinutes(event) ?? 60
  const durationFactor = Math.max(0.5, duration / 60)

  if (event.type === 'GAME') return 5
  if (event.type === 'TEST') return 3
  if (isTeamCalendarIcePractice(event)) return 2.5 * durationFactor
  if (event.type === 'STRENGTH' || event.type === 'PLYOMETRICS' || event.type === 'HYBRID' || event.type === 'AGILITY') {
    return 3 * durationFactor
  }
  if (event.type === 'CARDIO' || event.type === 'INTERVAL_SESSION') return 2.5 * durationFactor
  if (event.type === 'PREHAB') return 1 * durationFactor
  return 0.5 * durationFactor
}

export function getTeamCalendarLoadLevel(points: number): TeamCalendarLoadLevel {
  if (points >= 6) return 'high'
  if (points >= 3) return 'moderate'
  return 'low'
}

function loadLevelLabel(level: TeamCalendarLoadLevel, locale: AppLocale): string {
  if (locale === 'sv') {
    if (level === 'high') return 'hög'
    if (level === 'moderate') return 'medel'
    return 'låg'
  }
  if (level === 'high') return 'high'
  if (level === 'moderate') return 'moderate'
  return 'low'
}

function planningFlags(event: TeamCalendarBriefingEvent, locale: AppLocale): string[] {
  const flags: string[] = []

  if (teamCalendarEventNeedsContent(event)) flags.push(locale === 'sv' ? 'Behöver workout-innehåll' : 'Needs workout content')
  if (teamCalendarEventReadyToAssign(event)) flags.push(locale === 'sv' ? 'Redo att tilldela' : 'Ready to assign')
  if (event.assignedBroadcastId) flags.push(locale === 'sv' ? 'Tilldelat' : 'Assigned')
  if (isTeamCalendarIcePractice(event) && !teamCalendarEventHasPracticePlan(event)) flags.push(locale === 'sv' ? 'Saknar isplan' : 'Missing ice plan')

  return flags
}

export function buildTeamCalendarBriefing({
  team,
  events,
  rangeStart,
  rangeEnd,
  locale = 'en',
}: {
  team: { id: string; name: string; sportType: string | null }
  events: TeamCalendarBriefingEvent[]
  rangeStart: Date
  rangeEnd: Date
  locale?: AppLocale
}): TeamCalendarBriefing {
  const sortedEvents = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  const physicalEvents = sortedEvents.filter(isTeamCalendarPhysicalEvent)
  const iceEvents = sortedEvents.filter(isTeamCalendarIcePractice)
  const games = sortedEvents.filter((event) => event.type === 'GAME')
  const tests = sortedEvents.filter((event) => event.type === 'TEST')
  const needsContent = sortedEvents.filter(teamCalendarEventNeedsContent)
  const readyToAssign = sortedEvents.filter(teamCalendarEventReadyToAssign)
  const missingIcePlans = iceEvents.filter((event) => !teamCalendarEventHasPracticePlan(event))
  const assigned = sortedEvents.filter((event) => event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId)

  const iceMinutes = iceEvents.reduce((sum, event) => sum + (teamCalendarEventDurationMinutes(event) ?? 0), 0)
  const physicalMinutes = physicalEvents.reduce((sum, event) => sum + (teamCalendarEventDurationMinutes(event) ?? 0), 0)
  const loadPoints = Number(sortedEvents.reduce((sum, event) => sum + teamCalendarLoadPoints(event), 0).toFixed(1))
  const loadLevel = getTeamCalendarLoadLevel(loadPoints)

  const byDay = new Map<string, TeamCalendarBriefingEvent[]>()
  sortedEvents.forEach((event) => {
    const key = dateKey(event.startDate)
    const current = byDay.get(key) ?? []
    current.push(event)
    byDay.set(key, current)
  })

  const dayLoads = Array.from(byDay.entries()).map(([date, dayEvents]) => {
    const points = Number(dayEvents.reduce((sum, event) => sum + teamCalendarLoadPoints(event), 0).toFixed(1))
    return {
      date,
      eventCount: dayEvents.length,
      loadPoints: points,
      loadLevel: getTeamCalendarLoadLevel(points),
      labels: dayEvents.map((event) => eventTypeLabel(event.type, locale)),
    }
  })

  const warnings: string[] = []
  if (needsContent.length > 0) {
    warnings.push(locale === 'sv'
      ? `${needsContent.length} fyspass saknar workout-innehåll.`
      : `${needsContent.length} physical session(s) are missing workout content.`)
  }
  if (missingIcePlans.length > 0) {
    warnings.push(locale === 'sv'
      ? `${missingIcePlans.length} ispass saknar blockplan.`
      : `${missingIcePlans.length} ice session(s) are missing a block plan.`)
  }

  const highLoadDays = dayLoads.filter((day) => day.loadLevel === 'high')
  highLoadDays.forEach((day) => {
    warnings.push(locale === 'sv'
      ? `${day.date} har hög totalbelastning (${day.loadPoints} poäng).`
      : `${day.date} has high total load (${day.loadPoints} points).`)
  })

  games.forEach((game) => {
    const gameDay = dateKey(game.startDate)
    const previousDay = new Date(game.startDate)
    previousDay.setDate(previousDay.getDate() - 1)
    const previousPhysical = physicalEvents.filter((event) => dateKey(event.startDate) === dateKey(previousDay))
    if (previousPhysical.length > 0) {
      warnings.push(locale === 'sv'
        ? `Fys dagen före match ${gameDay}: ${previousPhysical.map((event) => eventTypeLabel(event.type, locale)).join(', ')}.`
        : `Physical work the day before game ${gameDay}: ${previousPhysical.map((event) => eventTypeLabel(event.type, locale)).join(', ')}.`)
    }
  })

  const nextActions: TeamCalendarBriefing['nextActions'] = [
    ...needsContent.slice(0, 3).map((event) => ({
      type: 'build_content' as const,
      eventId: event.id,
      eventTitle: event.title,
      date: dateKey(event.startDate),
      message: locale === 'sv'
        ? `Bygg workout-innehåll för ${event.title} ${formatDate(event.startDate, locale)}.`
        : `Build workout content for ${event.title} ${formatDate(event.startDate, locale)}.`,
    })),
    ...readyToAssign.slice(0, 3).map((event) => ({
      type: 'assign_ready' as const,
      eventId: event.id,
      eventTitle: event.title,
      date: dateKey(event.startDate),
      message: locale === 'sv'
        ? `Tilldela ${event.linkedWorkoutName ?? event.title} till laget.`
        : `Assign ${event.linkedWorkoutName ?? event.title} to the team.`,
    })),
    ...missingIcePlans.slice(0, 3).map((event) => ({
      type: 'complete_ice_plan' as const,
      eventId: event.id,
      eventTitle: event.title,
      date: dateKey(event.startDate),
      message: locale === 'sv'
        ? `Lägg in blockplan för ispasset ${event.title} ${formatDate(event.startDate, locale)}.`
        : `Add a block plan for ice session ${event.title} ${formatDate(event.startDate, locale)}.`,
    })),
  ]

  highLoadDays.slice(0, 2).forEach((day) => {
    nextActions.push({
      type: 'review_load',
      date: day.date,
      message: locale === 'sv'
        ? `Granska belastningen ${day.date}; dagen ligger på ${loadLevelLabel(day.loadLevel, locale)} nivå.`
        : `Review load on ${day.date}; the day is at ${loadLevelLabel(day.loadLevel, locale)} level.`,
    })
  })

  const summaryParts = locale === 'sv'
    ? [
        `${team.name}: ${sortedEvents.length} kalenderhändelser`,
        `${needsContent.length} behöver innehåll`,
        `${readyToAssign.length} är redo att tilldela`,
        `${missingIcePlans.length} ispass saknar plan`,
        `veckobelastning ${loadLevelLabel(loadLevel, locale)} (${loadPoints} poäng)`,
      ]
    : [
        `${team.name}: ${sortedEvents.length} calendar event(s)`,
        `${needsContent.length} need content`,
        `${readyToAssign.length} ready to assign`,
        `${missingIcePlans.length} ice session(s) missing a plan`,
        `weekly load ${loadLevelLabel(loadLevel, locale)} (${loadPoints} points)`,
      ]

  return {
    team,
    range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    totals: {
      events: sortedEvents.length,
      iceSessions: iceEvents.length,
      physicalSessions: physicalEvents.length,
      games: games.length,
      tests: tests.length,
      assigned: assigned.length,
      readyToAssign: readyToAssign.length,
      needsContent: needsContent.length,
      missingIcePlans: missingIcePlans.length,
      iceMinutes,
      physicalMinutes,
      loadPoints,
      loadLevel,
    },
    warnings,
    nextActions,
    events: sortedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      typeLabel: eventTypeLabel(event.type, locale),
      date: dateKey(event.startDate),
      startTime: event.allDay ? null : formatTime(event.startDate, locale),
      endTime: event.allDay || !event.endDate ? null : formatTime(event.endDate, locale),
      location: event.location,
      contentStatus: event.contentStatus,
      contentStatusLabel: contentStatusLabel(event.contentStatus, locale),
      contentOwnerLabel: contentOwnerLabel(event.contentOwner, locale),
      linkedWorkoutName: event.linkedWorkoutName,
      assignment: event.assignmentSummary ?? null,
      planningFlags: planningFlags(event, locale),
    })),
    dayLoads,
    summaryText: `${summaryParts.join(', ')}.`,
  }
}
