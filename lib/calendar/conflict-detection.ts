/**
 * Conflict Detection System
 *
 * Detects scheduling conflicts between workouts and calendar events,
 * and suggests resolutions.
 */

import { prisma } from '@/lib/prisma'
import { EventImpact, CalendarEventType } from '@prisma/client'
import { calculateAvailability } from './availability-calculator'

export type ConflictType =
  | 'WORKOUT_BLOCKED'        // Workout on a day with NO_TRAINING event
  | 'WORKOUT_REDUCED'        // Workout on a day with REDUCED/MODIFIED event
  | 'RACE_OVERLAP'           // Event overlaps with race day
  | 'TRAVEL_ADJACENT'        // Hard workout day before/after travel
  | 'ILLNESS_RECOVERY'       // Training during illness recovery period
  | 'ALTITUDE_INTENSITY'     // High intensity during altitude adaptation
  | 'DOUBLE_WORKOUT'         // Multiple hard sessions same day

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ResolutionType =
  | 'RESCHEDULE'             // Move to different day
  | 'MODIFY_INTENSITY'       // Reduce intensity
  | 'MODIFY_DURATION'        // Reduce duration
  | 'CANCEL'                 // Cancel workout
  | 'SWAP'                   // Swap with another day's workout
  | 'IGNORE'                 // Proceed anyway

export interface AffectedItem {
  type: 'WORKOUT' | 'RACE' | 'FIELD_TEST' | 'EVENT'
  id: string
  date: Date
  name: string
}

export interface ConflictResolution {
  type: ResolutionType
  description: string
  impact: string
  confidence: number          // 0-100, how good is this option
  newDate?: Date
  modifications?: {
    intensity?: string
    durationMultiplier?: number
    notes?: string
  }
}

export interface Conflict {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  affectedItems: AffectedItem[]
  eventId?: string
  eventType?: CalendarEventType
  explanation: string
  suggestedResolutions: ConflictResolution[]
}

/**
 * Detect conflicts for a specific workout on a specific date
 */
export async function detectWorkoutConflicts(
  clientId: string,
  workoutId: string,
  targetDate: Date,
  workoutType?: string,
  workoutIntensity?: string
): Promise<Conflict[]> {
  const conflicts: Conflict[] = []
  const dateStart = new Date(targetDate)
  dateStart.setHours(0, 0, 0, 0)
  const dateEnd = new Date(targetDate)
  dateEnd.setHours(23, 59, 59, 999)

  // Fetch the workout details
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: true,
            },
          },
        },
      },
    },
  })

  const wType = workoutType || workout?.type || 'RUNNING'
  const wIntensity = workoutIntensity || workout?.intensity || 'MODERATE'
  const workoutName = workout?.name || 'Träningspass'

  // 1. Check for calendar events on target date
  const events = await prisma.calendarEvent.findMany({
    where: {
      clientId,
      status: { not: 'CANCELLED' },
      startDate: { lte: dateEnd },
      endDate: { gte: dateStart },
    },
  })

  for (const event of events) {
    // Blocked day
    if (event.trainingImpact === 'NO_TRAINING') {
      conflicts.push({
        id: `blocked-${event.id}-${workoutId}`,
        type: 'WORKOUT_BLOCKED',
        severity: 'CRITICAL',
        affectedItems: [
          { type: 'WORKOUT', id: workoutId, date: targetDate, name: workoutName },
          { type: 'EVENT', id: event.id, date: event.startDate, name: event.title },
        ],
        eventId: event.id,
        eventType: event.type,
        explanation: `Passet "${workoutName}" är planerat på en blockerad dag (${event.title})`,
        suggestedResolutions: await generateResolutions(clientId, workoutId, targetDate, 'BLOCKED', event),
      })
    }

    // Reduced training day
    else if (event.trainingImpact === 'REDUCED' || event.trainingImpact === 'MODIFIED') {
      // Only warn if it's a hard workout
      if (['THRESHOLD', 'INTERVAL', 'MAX'].includes(wIntensity)) {
        conflicts.push({
          id: `reduced-${event.id}-${workoutId}`,
          type: 'WORKOUT_REDUCED',
          severity: 'MEDIUM',
          affectedItems: [
            { type: 'WORKOUT', id: workoutId, date: targetDate, name: workoutName },
            { type: 'EVENT', id: event.id, date: event.startDate, name: event.title },
          ],
          eventId: event.id,
          eventType: event.type,
          explanation: `Hårt pass "${workoutName}" på dag med reducerad träning (${event.title})`,
          suggestedResolutions: await generateResolutions(clientId, workoutId, targetDate, 'REDUCED', event),
        })
      }
    }

    // Altitude adaptation - high intensity warning
    if (event.type === 'ALTITUDE_CAMP' && event.adaptationPhase === 'ACUTE') {
      if (['THRESHOLD', 'INTERVAL', 'MAX'].includes(wIntensity)) {
        conflicts.push({
          id: `altitude-${event.id}-${workoutId}`,
          type: 'ALTITUDE_INTENSITY',
          severity: 'HIGH',
          affectedItems: [
            { type: 'WORKOUT', id: workoutId, date: targetDate, name: workoutName },
            { type: 'EVENT', id: event.id, date: event.startDate, name: event.title },
          ],
          eventId: event.id,
          eventType: event.type,
          explanation: `Högintensivt pass under akut höghöjdsanpassning rekommenderas inte`,
          suggestedResolutions: [
            {
              type: 'MODIFY_INTENSITY',
              description: 'Reducera intensiteten',
              impact: 'Sänk till Easy/Moderate under anpassningsfasen',
              confidence: 90,
              modifications: { intensity: 'EASY', notes: 'Anpassad för höghöjd' },
            },
            {
              type: 'RESCHEDULE',
              description: 'Flytta till efter anpassningsfasen',
              impact: 'Planera om till dag 6+ av lägret',
              confidence: 75,
            },
          ],
        })
      }
    }
  }

  // 2. Check for travel adjacent (hard workout before/after travel)
  const dayBefore = new Date(targetDate)
  dayBefore.setDate(dayBefore.getDate() - 1)
  const dayAfter = new Date(targetDate)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const adjacentTravel = await prisma.calendarEvent.findFirst({
    where: {
      clientId,
      type: 'TRAVEL',
      status: { not: 'CANCELLED' },
      OR: [
        { startDate: { gte: dayBefore, lte: dayAfter } },
        { endDate: { gte: dayBefore, lte: dayAfter } },
      ],
    },
  })

  if (adjacentTravel && ['THRESHOLD', 'INTERVAL', 'MAX'].includes(wIntensity)) {
    conflicts.push({
      id: `travel-adjacent-${adjacentTravel.id}-${workoutId}`,
      type: 'TRAVEL_ADJACENT',
      severity: 'LOW',
      affectedItems: [
        { type: 'WORKOUT', id: workoutId, date: targetDate, name: workoutName },
        { type: 'EVENT', id: adjacentTravel.id, date: adjacentTravel.startDate, name: adjacentTravel.title },
      ],
      eventId: adjacentTravel.id,
      eventType: 'TRAVEL',
      explanation: `Hårt pass nära resedag kan påverka återhämtningen`,
      suggestedResolutions: [
        {
          type: 'MODIFY_INTENSITY',
          description: 'Reducera intensiteten',
          impact: 'Kör ett lättare pass istället',
          confidence: 70,
          modifications: { intensity: 'EASY' },
        },
        {
          type: 'IGNORE',
          description: 'Fortsätt som planerat',
          impact: 'Var medveten om potentiell trötthet',
          confidence: 50,
        },
      ],
    })
  }

  // 3. Check for race proximity
  const weekBefore = new Date(targetDate)
  weekBefore.setDate(weekBefore.getDate() - 7)
  const weekAfter = new Date(targetDate)
  weekAfter.setDate(weekAfter.getDate() + 7)

  const nearbyRaces = await prisma.race.findMany({
    where: {
      clientId,
      date: { gte: weekBefore, lte: weekAfter },
      classification: 'A', // Only A-races matter
    },
  })

  for (const race of nearbyRaces) {
    const daysToRace = Math.ceil((race.date.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

    // Hard workout 3 days before A-race is concerning
    if (daysToRace > 0 && daysToRace <= 3 && ['THRESHOLD', 'INTERVAL', 'MAX'].includes(wIntensity)) {
      conflicts.push({
        id: `race-proximity-${race.id}-${workoutId}`,
        type: 'RACE_OVERLAP',
        severity: 'HIGH',
        affectedItems: [
          { type: 'WORKOUT', id: workoutId, date: targetDate, name: workoutName },
          { type: 'RACE', id: race.id, date: race.date, name: race.name },
        ],
        explanation: `Hårt pass ${daysToRace} dag(ar) före A-tävling "${race.name}"`,
        suggestedResolutions: [
          {
            type: 'MODIFY_INTENSITY',
            description: 'Sänk till lätt avslappningspass',
            impact: 'Undvik att gå in trött till tävlingen',
            confidence: 95,
            modifications: { intensity: 'RECOVERY' },
          },
          {
            type: 'CANCEL',
            description: 'Vila helt',
            impact: 'Prioritera vila inför tävlingen',
            confidence: 80,
          },
        ],
      })
    }
  }

  return conflicts
}

/**
 * Generate resolution suggestions based on conflict type
 */
async function generateResolutions(
  clientId: string,
  workoutId: string,
  originalDate: Date,
  conflictReason: 'BLOCKED' | 'REDUCED',
  event: { id: string; startDate: Date; endDate: Date; title: string }
): Promise<ConflictResolution[]> {
  const resolutions: ConflictResolution[] = []

  // Find available days near the original date
  const searchStart = new Date(originalDate)
  searchStart.setDate(searchStart.getDate() - 7)
  const searchEnd = new Date(originalDate)
  searchEnd.setDate(searchEnd.getDate() + 7)

  const availability = await calculateAvailability(clientId, searchStart, searchEnd)

  // Find best alternative dates (prefer same week, before > after)
  const availableDates = availability.availableDays
    .filter((d) => {
      const dayDiff = Math.abs(d.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24)
      return dayDiff > 0 && dayDiff <= 7
    })
    .sort((a, b) => {
      // Prefer days closer to original
      const diffA = Math.abs(a.getTime() - originalDate.getTime())
      const diffB = Math.abs(b.getTime() - originalDate.getTime())
      return diffA - diffB
    })
    .slice(0, 3)

  for (const altDate of availableDates) {
    const daysDiff = Math.ceil((altDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24))
    const direction = daysDiff > 0 ? 'framåt' : 'bakåt'

    resolutions.push({
      type: 'RESCHEDULE',
      description: `Flytta ${Math.abs(daysDiff)} dag(ar) ${direction}`,
      impact: `Nytt datum: ${altDate.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}`,
      confidence: Math.max(50, 95 - Math.abs(daysDiff) * 10),
      newDate: altDate,
    })
  }

  // If blocked, add cancel option
  if (conflictReason === 'BLOCKED') {
    resolutions.push({
      type: 'CANCEL',
      description: 'Hoppa över passet',
      impact: `Inget pass under "${event.title}"`,
      confidence: 60,
    })
  }

  // If reduced, add modify option
  if (conflictReason === 'REDUCED') {
    resolutions.push({
      type: 'MODIFY_INTENSITY',
      description: 'Reducera intensiteten',
      impact: 'Kör ett lättare pass istället',
      confidence: 85,
      modifications: { intensity: 'EASY', durationMultiplier: 0.7 },
    })
  }

  // Always add ignore option (lowest confidence)
  resolutions.push({
    type: 'IGNORE',
    description: 'Fortsätt som planerat',
    impact: 'Ignorera konflikten',
    confidence: 20,
  })

  return resolutions.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Detect all conflicts for a date range
 */
export async function detectConflictsInRange(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<Conflict[]> {
  const allConflicts: Conflict[] = []

  // Get all workouts in range
  const workouts = await prisma.workout.findMany({
    where: {
      day: {
        date: { gte: startDate, lte: endDate },
        week: {
          program: {
            clientId,
            isActive: true,
          },
        },
      },
    },
    include: {
      day: true,
    },
  })

  for (const workout of workouts) {
    const conflicts = await detectWorkoutConflicts(
      clientId,
      workout.id,
      workout.day.date,
      workout.type,
      workout.intensity
    )
    allConflicts.push(...conflicts)
  }

  // Deduplicate by conflict id
  const uniqueConflicts = allConflicts.filter(
    (conflict, index, self) => index === self.findIndex((c) => c.id === conflict.id)
  )

  return uniqueConflicts.sort((a, b) => {
    // Sort by severity (CRITICAL first)
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * Apply a resolution to a conflict
 */
export async function applyResolution(
  conflictId: string,
  resolution: ConflictResolution,
  userId: string
): Promise<{ success: boolean; message: string; newWorkoutId?: string }> {
  // Parse conflict ID to get workout ID
  const parts = conflictId.split('-')
  const workoutId = parts[parts.length - 1]

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: true,
            },
          },
        },
      },
    },
  })

  if (!workout) {
    return { success: false, message: 'Passet hittades inte' }
  }

  switch (resolution.type) {
    case 'RESCHEDULE':
      if (!resolution.newDate) {
        return { success: false, message: 'Nytt datum saknas' }
      }
      // This will be handled by the reschedule API
      return { success: true, message: 'Använd reschedule API för att flytta passet' }

    case 'MODIFY_INTENSITY':
      if (resolution.modifications?.intensity) {
        await prisma.workout.update({
          where: { id: workoutId },
          data: {
            intensity: resolution.modifications.intensity as 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX',
            status: 'MODIFIED',
          },
        })
        return { success: true, message: 'Intensiteten har uppdaterats' }
      }
      break

    case 'CANCEL':
      await prisma.workout.update({
        where: { id: workoutId },
        data: {
          status: 'CANCELLED',
        },
      })
      return { success: true, message: 'Passet har avbokats' }

    case 'IGNORE':
      // Just log that user chose to ignore
      return { success: true, message: 'Konflikten ignorerad' }
  }

  return { success: false, message: 'Okänd resolution-typ' }
}
