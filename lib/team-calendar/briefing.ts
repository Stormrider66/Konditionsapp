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

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('sv-SE', {
  hour: '2-digit',
  minute: '2-digit',
})

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDate(date: Date): string {
  return dateFormatter.format(date)
}

function formatTime(date: Date): string {
  return timeFormatter.format(date)
}

function eventTypeLabel(type: string): string {
  if (isTeamEventType(type)) return TEAM_EVENT_TYPE_LABELS[type]
  return type || 'Övrigt'
}

function contentStatusLabel(status: string): string {
  if (TEAM_EVENT_CONTENT_STATUS_LABELS[status as TeamEventContentStatus]) {
    return TEAM_EVENT_CONTENT_STATUS_LABELS[status as TeamEventContentStatus]
  }
  return TEAM_EVENT_CONTENT_STATUS_LABELS.PLANNED
}

function contentOwnerLabel(owner: string | null): string | null {
  if (!owner) return null
  if (TEAM_EVENT_CONTENT_OWNER_LABELS[owner as TeamEventContentOwner]) {
    return TEAM_EVENT_CONTENT_OWNER_LABELS[owner as TeamEventContentOwner]
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

function loadLevelLabel(level: TeamCalendarLoadLevel): string {
  if (level === 'high') return 'hög'
  if (level === 'moderate') return 'medel'
  return 'låg'
}

function planningFlags(event: TeamCalendarBriefingEvent): string[] {
  const flags: string[] = []

  if (teamCalendarEventNeedsContent(event)) flags.push('Behöver workout-innehåll')
  if (teamCalendarEventReadyToAssign(event)) flags.push('Redo att tilldela')
  if (event.assignedBroadcastId) flags.push('Tilldelat')
  if (isTeamCalendarIcePractice(event) && !teamCalendarEventHasPracticePlan(event)) flags.push('Saknar isplan')

  return flags
}

export function buildTeamCalendarBriefing({
  team,
  events,
  rangeStart,
  rangeEnd,
}: {
  team: { id: string; name: string; sportType: string | null }
  events: TeamCalendarBriefingEvent[]
  rangeStart: Date
  rangeEnd: Date
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
      labels: dayEvents.map((event) => eventTypeLabel(event.type)),
    }
  })

  const warnings: string[] = []
  if (needsContent.length > 0) warnings.push(`${needsContent.length} fyspass saknar workout-innehåll.`)
  if (missingIcePlans.length > 0) warnings.push(`${missingIcePlans.length} ispass saknar blockplan.`)

  const highLoadDays = dayLoads.filter((day) => day.loadLevel === 'high')
  highLoadDays.forEach((day) => {
    warnings.push(`${day.date} har hög totalbelastning (${day.loadPoints} poäng).`)
  })

  games.forEach((game) => {
    const gameDay = dateKey(game.startDate)
    const previousDay = new Date(game.startDate)
    previousDay.setDate(previousDay.getDate() - 1)
    const previousPhysical = physicalEvents.filter((event) => dateKey(event.startDate) === dateKey(previousDay))
    if (previousPhysical.length > 0) {
      warnings.push(`Fys dagen före match ${gameDay}: ${previousPhysical.map((event) => eventTypeLabel(event.type)).join(', ')}.`)
    }
  })

  const nextActions: TeamCalendarBriefing['nextActions'] = [
    ...needsContent.slice(0, 3).map((event) => ({
      type: 'build_content' as const,
      eventId: event.id,
      eventTitle: event.title,
      date: dateKey(event.startDate),
      message: `Bygg workout-innehåll för ${event.title} ${formatDate(event.startDate)}.`,
    })),
    ...readyToAssign.slice(0, 3).map((event) => ({
      type: 'assign_ready' as const,
      eventId: event.id,
      eventTitle: event.title,
      date: dateKey(event.startDate),
      message: `Tilldela ${event.linkedWorkoutName ?? event.title} till laget.`,
    })),
    ...missingIcePlans.slice(0, 3).map((event) => ({
      type: 'complete_ice_plan' as const,
      eventId: event.id,
      eventTitle: event.title,
      date: dateKey(event.startDate),
      message: `Lägg in blockplan för ispasset ${event.title} ${formatDate(event.startDate)}.`,
    })),
  ]

  highLoadDays.slice(0, 2).forEach((day) => {
    nextActions.push({
      type: 'review_load',
      date: day.date,
      message: `Granska belastningen ${day.date}; dagen ligger på ${loadLevelLabel(day.loadLevel)} nivå.`,
    })
  })

  const summaryParts = [
    `${team.name}: ${sortedEvents.length} kalenderhändelser`,
    `${needsContent.length} behöver innehåll`,
    `${readyToAssign.length} är redo att tilldela`,
    `${missingIcePlans.length} ispass saknar plan`,
    `veckobelastning ${loadLevelLabel(loadLevel)} (${loadPoints} poäng)`,
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
      typeLabel: eventTypeLabel(event.type),
      date: dateKey(event.startDate),
      startTime: event.allDay ? null : formatTime(event.startDate),
      endTime: event.allDay || !event.endDate ? null : formatTime(event.endDate),
      location: event.location,
      contentStatus: event.contentStatus,
      contentStatusLabel: contentStatusLabel(event.contentStatus),
      contentOwnerLabel: contentOwnerLabel(event.contentOwner),
      linkedWorkoutName: event.linkedWorkoutName,
      assignment: event.assignmentSummary ?? null,
      planningFlags: planningFlags(event),
    })),
    dayLoads,
    summaryText: `${summaryParts.join(', ')}.`,
  }
}
