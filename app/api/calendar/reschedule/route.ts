/**
 * Workout Reschedule API
 *
 * POST /api/calendar/reschedule - Reschedule a workout to a different date
 *
 * Handles:
 * - Moving workout within the same program
 * - Creating new TrainingDay if needed
 * - Conflict detection and warnings
 * - Change logging for notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { detectWorkoutConflicts } from '@/lib/calendar/conflict-detection'
import { sendNotificationAsync } from '@/lib/calendar/notification-service'
import { z } from 'zod'

const rescheduleSchema = z.object({
  workoutId: z.string().uuid(),
  newDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  skipConflictCheck: z.boolean().optional().default(false),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = rescheduleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { workoutId, newDate, skipConflictCheck, reason } = validationResult.data
    const targetDate = new Date(newDate)

    // Fetch the workout with full context
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  include: {
                    client: {
                      include: {
                        athleteAccount: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        segments: true,
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    const program = workout.day.week.program
    const client = program.client

    // Verify access - must be coach or athlete of this client
    const isCoach = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const originalDate = workout.day.date

    // Check if date is actually different
    if (originalDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0]) {
      return NextResponse.json({ error: 'Target date is the same as current date' }, { status: 400 })
    }

    // Check for conflicts at the new date (unless skipped)
    let conflicts: Awaited<ReturnType<typeof detectWorkoutConflicts>> = []
    if (!skipConflictCheck) {
      conflicts = await detectWorkoutConflicts(
        client.id,
        workoutId,
        targetDate,
        workout.type,
        workout.intensity
      )

      // If there are critical conflicts, warn the user
      const criticalConflicts = conflicts.filter((c) => c.severity === 'CRITICAL')
      if (criticalConflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Critical conflicts detected',
            conflicts: criticalConflicts,
            message: 'Set skipConflictCheck=true to proceed anyway',
          },
          { status: 409 }
        )
      }
    }

    // Find or create the target TrainingDay
    let targetDay = await findOrCreateTargetDay(program.id, targetDate, workout.day.week.phase)

    // Move the workout to the new day
    const updatedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        dayId: targetDay.id,
        status: 'MODIFIED',
      },
      include: {
        day: true,
      },
    })

    // Log the change for notifications
    await prisma.calendarEventChange.create({
      data: {
        clientId: client.id,
        changeType: 'WORKOUT_RESCHEDULED',
        changedById: dbUser.id,
        description: `Passet "${workout.name}" flyttades från ${formatDateSwedish(originalDate)} till ${formatDateSwedish(targetDate)}${reason ? `. Anledning: ${reason}` : ''}`,
        previousData: {
          workoutId: workout.id,
          workoutName: workout.name,
          originalDate: originalDate.toISOString(),
          originalDayId: workout.dayId,
        },
        newData: {
          newDate: targetDate.toISOString(),
          newDayId: targetDay.id,
          movedBy: isCoach ? 'COACH' : 'ATHLETE',
          reason: reason || null,
        },
      },
    })

    // Send email notification asynchronously
    sendNotificationAsync({
      type: 'WORKOUT_RESCHEDULED',
      clientId: client.id,
      changedById: dbUser.id,
      eventTitle: workout.name,
      description: `Passet "${workout.name}" flyttades från ${formatDateSwedish(originalDate)} till ${formatDateSwedish(targetDate)}${reason ? `. Anledning: ${reason}` : ''}`,
      previousDate: originalDate,
      newDate: targetDate,
    })

    // Clean up empty days if the original day has no more workouts
    const remainingWorkoutsInOldDay = await prisma.workout.count({
      where: { dayId: workout.dayId },
    })

    // Return success with any non-critical conflicts as warnings
    return NextResponse.json({
      success: true,
      workout: {
        id: updatedWorkout.id,
        name: updatedWorkout.name,
        newDate: targetDate.toISOString(),
        newDayId: targetDay.id,
      },
      warnings: conflicts.filter((c) => c.severity !== 'CRITICAL'),
      originalDate: originalDate.toISOString(),
      message: `Passet har flyttats till ${formatDateSwedish(targetDate)}`,
    })
  } catch (error) {
    console.error('Error rescheduling workout:', error)
    return NextResponse.json({ error: 'Failed to reschedule workout' }, { status: 500 })
  }
}

/**
 * Find an existing TrainingDay for the target date, or create one
 */
async function findOrCreateTargetDay(
  programId: string,
  targetDate: Date,
  fallbackPhase: string
): Promise<{ id: string }> {
  // Normalize target date to start of day
  const dateStart = new Date(targetDate)
  dateStart.setHours(0, 0, 0, 0)
  const dateEnd = new Date(targetDate)
  dateEnd.setHours(23, 59, 59, 999)

  // First, look for an existing day at this date in the same program
  const existingDay = await prisma.trainingDay.findFirst({
    where: {
      date: {
        gte: dateStart,
        lte: dateEnd,
      },
      week: {
        programId,
      },
    },
  })

  if (existingDay) {
    return existingDay
  }

  // No existing day, find or create a week for this date
  const week = await findOrCreateWeekForDate(programId, targetDate, fallbackPhase)

  // Calculate day number (1=Monday, 7=Sunday)
  const dayNumber = targetDate.getDay() === 0 ? 7 : targetDate.getDay()

  // Create the new day
  const newDay = await prisma.trainingDay.create({
    data: {
      weekId: week.id,
      dayNumber,
      date: targetDate,
    },
  })

  return newDay
}

/**
 * Find an existing TrainingWeek for the target date, or create one
 */
async function findOrCreateWeekForDate(
  programId: string,
  targetDate: Date,
  fallbackPhase: string
): Promise<{ id: string }> {
  // Find the week that contains this date
  const existingWeek = await prisma.trainingWeek.findFirst({
    where: {
      programId,
      startDate: { lte: targetDate },
      endDate: { gte: targetDate },
    },
  })

  if (existingWeek) {
    return existingWeek
  }

  // Calculate week boundaries (Monday to Sunday)
  const weekStart = new Date(targetDate)
  const dayOfWeek = weekStart.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
  weekStart.setDate(weekStart.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Get the highest week number in this program
  const maxWeek = await prisma.trainingWeek.findFirst({
    where: { programId },
    orderBy: { weekNumber: 'desc' },
    select: { weekNumber: true },
  })

  const newWeekNumber = (maxWeek?.weekNumber || 0) + 1

  // Create the new week
  const newWeek = await prisma.trainingWeek.create({
    data: {
      programId,
      weekNumber: newWeekNumber,
      startDate: weekStart,
      endDate: weekEnd,
      phase: fallbackPhase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION',
      focus: 'Tillagd vecka',
    },
  })

  return newWeek
}

/**
 * Format date in Swedish format
 */
function formatDateSwedish(date: Date): string {
  return date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}
