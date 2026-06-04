import { prisma } from '@/lib/prisma'
import {
  normalizePrintableWorkout,
  type PrintableWorkout,
  type PrintableWorkoutKind,
} from '@/lib/workout-print/normalize'

export type ExternalPortalLocale = 'en' | 'sv'

export interface ExternalAthleteCalendarItem {
  id: string
  kind: 'workout' | 'event'
  workoutKind?: PrintableWorkoutKind
  title: string
  description: string | null
  date: Date
  endDate: Date
  status: string
  eventType?: string
  trainingImpact?: string | null
  startTime: string | null
  endTime: string | null
  locationName: string | null
  scheduleLabel: string | null
  sourceId?: string | null
  assignmentId?: string | null
  workout?: PrintableWorkout
}

type LooseRecord = Record<string, unknown>

function isRecord(value: unknown): value is LooseRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function recordArray(value: unknown): LooseRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function dateValue(value: unknown): Date | null {
  return value instanceof Date ? value : null
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function parseExternalPortalDate(value: unknown, fallback: Date) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return startOfUtcDay(fallback)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? startOfUtcDay(fallback) : parsed
}

export function formatExternalPortalDateValue(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10)
}

export function addUtcDays(date: Date, days: number) {
  const next = startOfUtcDay(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function clampExternalPortalRange(startDate: Date, endDate: Date) {
  const start = startOfUtcDay(startDate)
  let end = startOfUtcDay(endDate)
  if (end.getTime() < start.getTime()) end = addUtcDays(start, 42)

  const maxEnd = addUtcDays(start, 180)
  if (end.getTime() > maxEnd.getTime()) end = maxEnd

  return { startDate: start, endDate: end }
}

export function formatExternalPortalDateLabel(date: Date, locale: ExternalPortalLocale) {
  return date.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatScheduleLabel({
  startTime,
  endTime,
  locationName,
}: {
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
}) {
  const time = startTime && endTime ? `${startTime}-${endTime}` : startTime || null
  return [time, locationName].filter(Boolean).join(' · ') || null
}

function eventDateOverlap(clientId: string, startDate: Date, endDate: Date) {
  return {
    clientId,
    OR: [
      { startDate: { gte: startDate, lte: endDate } },
      { endDate: { gte: startDate, lte: endDate } },
      { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
    ],
    status: { not: 'CANCELLED' as const },
  }
}

function assignmentWhere(clientId: string, startDate: Date, endDate: Date) {
  return {
    athleteId: clientId,
    assignedDate: { gte: startDate, lte: endDate },
    calendarEventId: null,
  }
}

function getAssignmentSource(kind: PrintableWorkoutKind, assignment: LooseRecord) {
  if (kind === 'strength') return assignment.session
  if (kind === 'cardio') return assignment.session
  return assignment.workout
}

function getSourceId(kind: PrintableWorkoutKind, assignment: LooseRecord) {
  if (kind === 'strength' || kind === 'cardio') return stringValue(assignment.sessionId)
  return stringValue(assignment.workoutId)
}

function getSourceName(source: LooseRecord | null | undefined, fallback: string) {
  return stringValue(source?.name) ?? fallback
}

function buildWorkoutItem({
  kind,
  assignment,
  athleteName,
  locale,
  event,
}: {
  kind: PrintableWorkoutKind
  assignment: LooseRecord
  athleteName: string
  locale: ExternalPortalLocale
  event?: LooseRecord | null
}): ExternalAthleteCalendarItem | null {
  const source = getAssignmentSource(kind, assignment)
  if (!isRecord(source)) return null

  const assignmentDate = dateValue(assignment.assignedDate) ?? new Date()
  const date = dateValue(event?.startDate) ?? assignmentDate
  const endDate = dateValue(event?.endDate) ?? assignmentDate
  const startTime = stringValue(event?.startTime) ?? stringValue(assignment.startTime)
  const endTime = stringValue(event?.endTime) ?? stringValue(assignment.endTime)
  const location = isRecord(assignment.location) ? assignment.location : null
  const locationName = stringValue(location?.name) ?? stringValue(assignment.locationName) ?? stringValue(event?.locationName)
  const scheduleLabel = formatScheduleLabel({ startTime, endTime, locationName })
  const dateLabel = formatExternalPortalDateLabel(date, locale)
  const eventId = stringValue(event?.id)
  const assignmentId = stringValue(assignment.id)
  const workout = normalizePrintableWorkout(kind, source, {
    dateLabel,
    athleteName,
    locale,
  })

  return {
    id: eventId ? `calendar:${eventId}` : `assignment:${kind}:${assignmentId ?? assignmentDate.getTime()}`,
    kind: 'workout',
    workoutKind: kind,
    title: getSourceName(source, stringValue(event?.title) ?? 'Workout'),
    description: stringValue(assignment.notes) ?? stringValue(source.description),
    date,
    endDate,
    status: stringValue(assignment.status) ?? stringValue(event?.status) ?? 'SCHEDULED',
    eventType: 'SCHEDULED_WORKOUT',
    trainingImpact: 'NORMAL',
    startTime,
    endTime,
    locationName,
    scheduleLabel,
    sourceId: getSourceId(kind, assignment),
    assignmentId,
    workout: {
      ...workout,
      scheduleLabel,
      assignmentNotes: stringValue(assignment.notes),
    },
  }
}

function getCalendarWorkoutAssignment(event: LooseRecord) {
  const strength = recordArray(event.strengthAssignments)[0]
  if (strength) return { kind: 'strength' as const, assignment: strength }
  const cardio = recordArray(event.cardioAssignments)[0]
  if (cardio) return { kind: 'cardio' as const, assignment: cardio }
  const hybrid = recordArray(event.hybridAssignments)[0]
  if (hybrid) return { kind: 'hybrid' as const, assignment: hybrid }
  const agility = recordArray(event.agilityAssignments)[0]
  if (agility) return { kind: 'agility' as const, assignment: agility }
  return null
}

function sanitizeEvent(event: LooseRecord, locale: ExternalPortalLocale): ExternalAthleteCalendarItem {
  const sensitive = event.type === 'ILLNESS' || event.type === 'PERSONAL_BLOCKER'
  const title = sensitive
    ? (locale === 'sv' ? 'Ej tillgänglig' : 'Unavailable')
    : (stringValue(event.title) || (locale === 'sv' ? 'Kalenderhändelse' : 'Calendar event'))
  const description = sensitive ? null : stringValue(event.description)
  const startDate = dateValue(event.startDate) ?? new Date()
  const endDate = dateValue(event.endDate) ?? startDate

  return {
    id: `calendar:${stringValue(event.id) ?? startDate.getTime()}`,
    kind: 'event',
    title,
    description,
    date: startDate,
    endDate,
    status: stringValue(event.status) ?? 'SCHEDULED',
    eventType: stringValue(event.type) ?? undefined,
    trainingImpact: stringValue(event.trainingImpact),
    startTime: stringValue(event.startTime),
    endTime: stringValue(event.endTime),
    locationName: null,
    scheduleLabel: formatScheduleLabel({
      startTime: stringValue(event.startTime),
      endTime: stringValue(event.endTime),
      locationName: null,
    }),
  }
}

async function fetchCalendarEvents(clientId: string, startDate: Date, endDate: Date) {
  return prisma.calendarEvent.findMany({
    where: eventDateOverlap(clientId, startDate, endDate),
    include: {
      strengthAssignments: {
        take: 1,
        include: {
          session: true,
          location: { select: { name: true } },
        },
      },
      cardioAssignments: {
        take: 1,
        include: {
          session: true,
          location: { select: { name: true } },
        },
      },
      hybridAssignments: {
        take: 1,
        include: {
          workout: {
            include: {
              movements: {
                orderBy: { order: 'asc' },
                include: { exercise: true },
              },
            },
          },
          location: { select: { name: true } },
        },
      },
      agilityAssignments: {
        take: 1,
        include: {
          workout: {
            include: {
              drills: {
                orderBy: { order: 'asc' },
                include: { drill: true },
              },
            },
          },
          location: { select: { name: true } },
        },
      },
    },
    orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
  })
}

async function fetchStandaloneAssignments(clientId: string, startDate: Date, endDate: Date) {
  const where = assignmentWhere(clientId, startDate, endDate)

  const [strength, cardio, hybrid, agility] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where,
      include: {
        session: true,
        location: { select: { name: true } },
      },
      orderBy: [{ assignedDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.cardioSessionAssignment.findMany({
      where,
      include: {
        session: true,
        location: { select: { name: true } },
      },
      orderBy: [{ assignedDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where,
      include: {
        workout: {
          include: {
            movements: {
              orderBy: { order: 'asc' },
              include: { exercise: true },
            },
          },
        },
        location: { select: { name: true } },
      },
      orderBy: [{ assignedDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where,
      include: {
        workout: {
          include: {
            drills: {
              orderBy: { order: 'asc' },
              include: { drill: true },
            },
          },
        },
        location: { select: { name: true } },
      },
      orderBy: [{ assignedDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  return [
    ...strength.map((assignment) => ({ kind: 'strength' as const, assignment })),
    ...cardio.map((assignment) => ({ kind: 'cardio' as const, assignment })),
    ...hybrid.map((assignment) => ({ kind: 'hybrid' as const, assignment })),
    ...agility.map((assignment) => ({ kind: 'agility' as const, assignment })),
  ]
}

export async function getExternalAthleteCalendarItems({
  athleteClientId,
  athleteName,
  startDate,
  endDate,
  locale,
}: {
  athleteClientId: string
  athleteName: string
  startDate: Date
  endDate: Date
  locale: ExternalPortalLocale
}) {
  const [events, standaloneAssignments] = await Promise.all([
    fetchCalendarEvents(athleteClientId, startDate, endDate),
    fetchStandaloneAssignments(athleteClientId, startDate, endDate),
  ])

  const eventItems = events.flatMap((event) => {
    const eventRecord = event as LooseRecord
    const scheduled = getCalendarWorkoutAssignment(eventRecord)
    if (!scheduled) return [sanitizeEvent(eventRecord, locale)]

    const item = buildWorkoutItem({
      kind: scheduled.kind,
      assignment: scheduled.assignment,
      athleteName,
      locale,
      event: eventRecord,
    })
    return item ? [item] : [sanitizeEvent(eventRecord, locale)]
  })

  const assignmentItems = standaloneAssignments.flatMap(({ kind, assignment }) => {
    const item = buildWorkoutItem({
      kind,
      assignment: assignment as LooseRecord,
      athleteName,
      locale,
      event: null,
    })
    return item ? [item] : []
  })

  return [...eventItems, ...assignmentItems].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime()
    if (byDate !== 0) return byDate
    return (a.startTime || '').localeCompare(b.startTime || '')
  })
}
