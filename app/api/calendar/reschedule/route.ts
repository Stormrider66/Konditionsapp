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
import { canAccessClient } from '@/lib/auth-utils'
import { detectWorkoutConflicts } from '@/lib/calendar/conflict-detection'
import { sendNotificationAsync } from '@/lib/calendar/notification-service'
import { findOrCreateTrainingDayForWorkout } from '@/lib/calendar/workout-scheduling'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'

const rescheduleSchema = z.object({
  workoutId: z.string().uuid(),
  newDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  skipConflictCheck: z.boolean().optional().default(false),
  reason: z.string().optional(),
})
type AppLocale = 'en' | 'sv'

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
    const locale = getUserLocale(dbUser.language)

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

    const hasAccess = await canAccessClient(dbUser.id, client.id)
    if (!hasAccess) {
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
        workout.intensity,
        dbUser.language === 'sv' ? 'sv' : 'en'
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
    const targetDay = await findOrCreateTrainingDayForWorkout(
      program.id,
      targetDate,
      workout.day.week.phase
    )

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
        description: workoutMoveDescription(workout.name, originalDate, targetDate, locale, reason),
        previousData: {
          workoutId: workout.id,
          workoutName: workout.name,
          originalDate: originalDate.toISOString(),
          originalDayId: workout.dayId,
        },
        newData: {
          newDate: targetDate.toISOString(),
          newDayId: targetDay.id,
          movedBy: dbUser.role === 'COACH' ? 'COACH' : 'ATHLETE',
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
      description: workoutMoveDescription(workout.name, originalDate, targetDate, locale, reason),
      previousDate: originalDate,
      newDate: targetDate,
    })

    await invalidateUnifiedCalendarCacheForClient(client.id)

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
      message: t(locale, `Workout moved to ${formatDateForLocale(targetDate, locale)}`, `Passet har flyttats till ${formatDateForLocale(targetDate, locale)}`),
    })
  } catch (error) {
    logError('Error rescheduling workout:', error)
    return NextResponse.json({ error: 'Failed to reschedule workout' }, { status: 500 })
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function formatDateForLocale(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'Europe/Stockholm',
  }).format(date)
}

function workoutMoveDescription(
  workoutName: string,
  originalDate: Date,
  targetDate: Date,
  locale: AppLocale,
  reason?: string
): string {
  const base = t(
    locale,
    `Workout "${workoutName}" moved from ${formatDateForLocale(originalDate, locale)} to ${formatDateForLocale(targetDate, locale)}`,
    `Passet "${workoutName}" flyttades från ${formatDateForLocale(originalDate, locale)} till ${formatDateForLocale(targetDate, locale)}`
  )
  if (!reason) return base
  return `${base}. ${t(locale, 'Reason', 'Anledning')}: ${reason}`
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
