/**
 * Availability Calculator
 *
 * Calculates which days are available for training based on calendar events.
 * Used by program generation to place workouts only on available days.
 */

import { prisma } from '@/lib/prisma'
import { EventImpact, CalendarEventType, AltitudeAdaptationPhase } from '@prisma/client'

export interface BlockedDay {
  date: Date
  reason: string
  eventType: CalendarEventType
  impact: EventImpact
  eventId: string
  eventTitle: string
}

export interface AltitudePeriod {
  startDate: Date
  endDate: Date
  altitude: number
  adaptationPhase: AltitudeAdaptationPhase
  eventId: string
  seaLevelReturnDate: Date | null
}

export interface ReducedDay {
  date: Date
  reason: string
  eventType: CalendarEventType
  impact: EventImpact
  impactNotes: string | null
  eventId: string
}

export interface AvailabilityResult {
  availableDays: Date[]
  blockedDays: BlockedDay[]
  reducedDays: ReducedDay[]
  altitudePeriods: AltitudePeriod[]
  totalDays: number
  availableCount: number
  blockedCount: number
  reducedCount: number
}

/**
 * Calculate availability for an athlete over a date range
 */
export async function calculateAvailability(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<AvailabilityResult> {
  // Fetch all calendar events for the date range
  const events = await prisma.calendarEvent.findMany({
    where: {
      clientId,
      status: { not: 'CANCELLED' },
      OR: [
        {
          startDate: { gte: startDate, lte: endDate },
        },
        {
          endDate: { gte: startDate, lte: endDate },
        },
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: endDate } },
          ],
        },
      ],
    },
    orderBy: { startDate: 'asc' },
  })

  const blockedDays: BlockedDay[] = []
  const reducedDays: ReducedDay[] = []
  const altitudePeriods: AltitudePeriod[] = []

  // Process each event
  for (const event of events) {
    // Handle altitude camps separately
    if (event.type === 'ALTITUDE_CAMP' && event.altitude) {
      altitudePeriods.push({
        startDate: event.startDate,
        endDate: event.endDate,
        altitude: event.altitude,
        adaptationPhase: event.adaptationPhase || 'ACUTE',
        eventId: event.id,
        seaLevelReturnDate: event.seaLevelReturnDate,
      })
    }

    // Get all dates covered by this event
    const eventDates = getDatesBetween(event.startDate, event.endDate)

    for (const date of eventDates) {
      // Only include dates within our requested range
      if (date < startDate || date > endDate) continue

      if (event.trainingImpact === 'NO_TRAINING') {
        blockedDays.push({
          date,
          reason: getBlockedReason(event.type, event.title),
          eventType: event.type,
          impact: event.trainingImpact,
          eventId: event.id,
          eventTitle: event.title,
        })
      } else if (event.trainingImpact === 'REDUCED' || event.trainingImpact === 'MODIFIED') {
        reducedDays.push({
          date,
          reason: getReducedReason(event.type, event.title, event.trainingImpact),
          eventType: event.type,
          impact: event.trainingImpact,
          impactNotes: event.impactNotes,
          eventId: event.id,
        })
      }
    }

    // For illness, also add return-to-training period as reduced days
    if (event.type === 'ILLNESS' && event.returnToTrainingDate) {
      const recoveryDates = getDatesBetween(event.endDate, event.returnToTrainingDate)
      for (const date of recoveryDates) {
        if (date <= event.endDate) continue // Skip actual illness days
        if (date < startDate || date > endDate) continue

        reducedDays.push({
          date,
          reason: 'Återhämtning efter sjukdom - gradvis återgång',
          eventType: 'ILLNESS',
          impact: 'REDUCED',
          impactNotes: 'Gradvis upptrappning efter sjukdom',
          eventId: event.id,
        })
      }
    }
  }

  // Calculate available days
  const allDates = getDatesBetween(startDate, endDate)
  const blockedDateSet = new Set(blockedDays.map((d) => d.date.toISOString().split('T')[0]))
  const reducedDateSet = new Set(reducedDays.map((d) => d.date.toISOString().split('T')[0]))

  const availableDays = allDates.filter((date) => {
    const dateKey = date.toISOString().split('T')[0]
    return !blockedDateSet.has(dateKey)
  })

  return {
    availableDays,
    blockedDays,
    reducedDays,
    altitudePeriods,
    totalDays: allDates.length,
    availableCount: availableDays.length,
    blockedCount: blockedDays.length,
    reducedCount: reducedDays.filter(
      (d) => !blockedDateSet.has(d.date.toISOString().split('T')[0])
    ).length,
  }
}

/**
 * Get all dates between two dates (inclusive)
 */
function getDatesBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)

  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0)

  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Get human-readable reason for blocked day
 */
function getBlockedReason(type: CalendarEventType, title: string): string {
  switch (type) {
    case 'TRAVEL':
      return `Resedag: ${title}`
    case 'ILLNESS':
      return `Sjukdom: ${title}`
    case 'VACATION':
      return `Semester: ${title}`
    case 'WORK_BLOCKER':
      return `Arbete: ${title}`
    case 'PERSONAL_BLOCKER':
      return `Privat: ${title}`
    case 'EXTERNAL_EVENT':
      return `Extern händelse: ${title}`
    case 'ALTITUDE_CAMP':
      return `Höghöjdsläger: ${title}`
    case 'TRAINING_CAMP':
      return `Träningsläger: ${title}`
    default:
      return title
  }
}

/**
 * Get human-readable reason for reduced day
 */
function getReducedReason(
  type: CalendarEventType,
  title: string,
  impact: EventImpact
): string {
  const impactText = impact === 'REDUCED' ? 'reducerad träning' : 'anpassad träning'
  switch (type) {
    case 'TRAVEL':
      return `Resedag (${impactText}): ${title}`
    case 'ALTITUDE_CAMP':
      return `Höghöjdsanpassning: ${title}`
    case 'TRAINING_CAMP':
      return `Träningsläger: ${title}`
    default:
      return `${title} (${impactText})`
  }
}

/**
 * Check if a specific date is available for training
 */
export async function isDateAvailable(
  clientId: string,
  date: Date
): Promise<{
  available: boolean
  reduced: boolean
  reason?: string
  impact?: EventImpact
}> {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const event = await prisma.calendarEvent.findFirst({
    where: {
      clientId,
      status: { not: 'CANCELLED' },
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
      trainingImpact: { not: 'NORMAL' },
    },
    orderBy: {
      trainingImpact: 'asc', // NO_TRAINING first
    },
  })

  if (!event) {
    return { available: true, reduced: false }
  }

  if (event.trainingImpact === 'NO_TRAINING') {
    return {
      available: false,
      reduced: false,
      reason: getBlockedReason(event.type, event.title),
      impact: event.trainingImpact,
    }
  }

  return {
    available: true,
    reduced: true,
    reason: getReducedReason(event.type, event.title, event.trainingImpact),
    impact: event.trainingImpact,
  }
}

/**
 * Get altitude adjustment factor for a specific date
 * Returns a multiplier (0.5-1.0) for intensity reduction during altitude adaptation
 */
export async function getAltitudeAdjustment(
  clientId: string,
  date: Date
): Promise<{
  inAltitude: boolean
  altitude?: number
  phase?: AltitudeAdaptationPhase
  intensityMultiplier: number
  volumeMultiplier: number
}> {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const event = await prisma.calendarEvent.findFirst({
    where: {
      clientId,
      type: 'ALTITUDE_CAMP',
      status: { not: 'CANCELLED' },
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  })

  if (!event || !event.altitude) {
    return {
      inAltitude: false,
      intensityMultiplier: 1.0,
      volumeMultiplier: 1.0,
    }
  }

  // Calculate day number within camp
  const campStart = new Date(event.startDate)
  campStart.setHours(0, 0, 0, 0)
  const dayNumber = Math.floor(
    (dayStart.getTime() - campStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  // Determine phase and adjustments based on day number
  let phase: AltitudeAdaptationPhase
  let intensityMultiplier: number
  let volumeMultiplier: number

  if (dayNumber <= 3) {
    // Days 1-3: Acute phase - significantly reduce everything
    phase = 'ACUTE'
    intensityMultiplier = 0.6
    volumeMultiplier = 0.5
  } else if (dayNumber <= 5) {
    // Days 4-5: Late acute - still reduced
    phase = 'ACUTE'
    intensityMultiplier = 0.7
    volumeMultiplier = 0.6
  } else if (dayNumber <= 10) {
    // Days 6-10: Adaptation phase - gradual increase
    phase = 'ADAPTATION'
    intensityMultiplier = 0.8
    volumeMultiplier = 0.75
  } else if (dayNumber <= 14) {
    // Days 11-14: Late adaptation
    phase = 'ADAPTATION'
    intensityMultiplier = 0.9
    volumeMultiplier = 0.85
  } else {
    // Day 15+: Optimal phase - near normal
    phase = 'OPTIMAL'
    intensityMultiplier = 0.95
    volumeMultiplier = 0.95
  }

  // Further adjust based on altitude (higher = more reduction)
  if (event.altitude > 2500) {
    intensityMultiplier *= 0.9
    volumeMultiplier *= 0.9
  } else if (event.altitude > 3000) {
    intensityMultiplier *= 0.85
    volumeMultiplier *= 0.85
  }

  return {
    inAltitude: true,
    altitude: event.altitude,
    phase,
    intensityMultiplier: Math.max(0.5, intensityMultiplier),
    volumeMultiplier: Math.max(0.5, volumeMultiplier),
  }
}

/**
 * Get calendar constraints for program generation
 * Returns data structure suitable for passing to program generator
 */
export async function getCalendarConstraints(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  blockedDates: string[] // ISO date strings
  reducedDates: string[]
  altitudePeriods: {
    start: string
    end: string
    altitude: number
    phase: AltitudeAdaptationPhase
  }[]
  illnessRecoveryPeriods: {
    start: string
    end: string
    returnDate: string
  }[]
}> {
  const availability = await calculateAvailability(clientId, startDate, endDate)

  return {
    blockedDates: availability.blockedDays.map(
      (d) => d.date.toISOString().split('T')[0]
    ),
    reducedDates: availability.reducedDays.map(
      (d) => d.date.toISOString().split('T')[0]
    ),
    altitudePeriods: availability.altitudePeriods.map((p) => ({
      start: p.startDate.toISOString().split('T')[0],
      end: p.endDate.toISOString().split('T')[0],
      altitude: p.altitude,
      phase: p.adaptationPhase,
    })),
    illnessRecoveryPeriods: availability.blockedDays
      .filter((d) => d.eventType === 'ILLNESS')
      .reduce(
        (periods, day) => {
          // Group by event
          const existing = periods.find((p) => p.eventId === day.eventId)
          if (!existing) {
            periods.push({
              eventId: day.eventId,
              start: day.date.toISOString().split('T')[0],
              end: day.date.toISOString().split('T')[0],
              returnDate: day.date.toISOString().split('T')[0], // Will be updated
            })
          } else {
            // Update end date
            const dayStr = day.date.toISOString().split('T')[0]
            if (dayStr > existing.end) existing.end = dayStr
          }
          return periods
        },
        [] as { eventId: string; start: string; end: string; returnDate: string }[]
      )
      .map(({ start, end, returnDate }) => ({ start, end, returnDate })),
  }
}
