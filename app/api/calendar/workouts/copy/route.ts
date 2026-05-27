/**
 * Workout Copy API
 *
 * POST /api/calendar/workouts/copy - Duplicate a workout to another calendar date
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { detectWorkoutConflicts } from '@/lib/calendar/conflict-detection'
import {
  findOrCreateTrainingDayForWorkout,
  formatDateForLocale,
} from '@/lib/calendar/workout-scheduling'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'

const copyWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  skipConflictCheck: z.boolean().optional().default(false),
})

type AppLocale = 'en' | 'sv'

export async function POST(request: NextRequest) {
  let appLocale = getRequestLocale(request)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(appLocale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(appLocale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    appLocale = getUserLocale(dbUser.language)

    const body = await request.json()
    const validationResult = copyWorkoutSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: t(appLocale, 'Invalid request', 'Ogiltig förfrågan'), details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { workoutId, targetDate: targetDateInput, skipConflictCheck } = validationResult.data
    const targetDate = new Date(targetDateInput)

    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  include: {
                    client: true,
                  },
                },
              },
            },
          },
        },
        segments: {
          orderBy: { order: 'asc' },
        },
        fuelingPrescription: true,
      },
    })

    if (!workout) {
      return NextResponse.json({ error: t(appLocale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    const program = workout.day.week.program
    const client = program.client

    const hasAccess = await canAccessClient(dbUser.id, client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: t(appLocale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

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

      const criticalConflicts = conflicts.filter((conflict) => conflict.severity === 'CRITICAL')
      if (criticalConflicts.length > 0) {
        return NextResponse.json(
          {
            error: t(appLocale, 'Critical conflicts detected', 'Kritiska konflikter hittades'),
            conflicts: criticalConflicts,
            message: t(appLocale, 'Set skipConflictCheck=true to proceed anyway', 'Sätt skipConflictCheck=true för att fortsätta ändå'),
          },
          { status: 409 }
        )
      }
    }

    const targetDay = await findOrCreateTrainingDayForWorkout(
      program.id,
      targetDate,
      workout.day.week.phase
    )

    const existingWorkouts = await prisma.workout.count({
      where: { dayId: targetDay.id },
    })
    const nextOrder = existingWorkouts + 1

    const copiedWorkout = await prisma.$transaction(async (tx) => {
      const created = await tx.workout.create({
        data: {
          dayId: targetDay.id,
          type: workout.type,
          name: workout.name,
          description: workout.description,
          status: 'PLANNED',
          intensity: workout.intensity,
          duration: workout.duration,
          distance: workout.distance,
          instructions: workout.instructions,
          coachNotes: workout.coachNotes,
          order: nextOrder,
          isCustom: workout.isCustom,
          isAdHoc: false,
          heroTitle: workout.heroTitle,
          heroDescription: workout.heroDescription,
          heroCategory: workout.heroCategory,
          heroImageKey: workout.heroImageKey,
          focusGeneratedAt: workout.focusGeneratedAt,
          focusGeneratedBy: workout.focusGeneratedBy,
        },
      })

      if (workout.segments.length > 0) {
        await tx.workoutSegment.createMany({
          data: workout.segments.map((segment) => ({
            workoutId: created.id,
            order: segment.order,
            type: segment.type,
            duration: segment.duration,
            distance: segment.distance,
            pace: segment.pace,
            zone: segment.zone,
            heartRate: segment.heartRate,
            power: segment.power,
            reps: segment.reps,
            exerciseId: segment.exerciseId,
            sets: segment.sets,
            repsCount: segment.repsCount,
            weight: segment.weight,
            tempo: segment.tempo,
            rest: segment.rest,
            section: segment.section,
            description: segment.description,
            notes: segment.notes,
          })),
        })
      }

      if (workout.fuelingPrescription) {
        await tx.workoutFuelingPrescription.create({
          data: {
            workoutId: created.id,
            planId: workout.fuelingPrescription.planId,
            targetCarbsGPerHour: workout.fuelingPrescription.targetCarbsGPerHour,
            targetCarbsTotalG: workout.fuelingPrescription.targetCarbsTotalG,
            hydrationMl: workout.fuelingPrescription.hydrationMl,
            sodiumMg: workout.fuelingPrescription.sodiumMg,
            productPlan:
              (workout.fuelingPrescription.productPlan as Prisma.InputJsonValue | null) ??
              Prisma.JsonNull,
            instructionsSv: workout.fuelingPrescription.instructionsSv,
          },
        })
      }

      await tx.calendarEventChange.create({
        data: {
          clientId: client.id,
          changeType: 'WORKOUT_COPIED',
          changedById: dbUser.id,
          description:
            appLocale === 'sv'
              ? `Passet "${workout.name}" kopierades från ${formatDateForLocale(workout.day.date, appLocale)} till ${formatDateForLocale(targetDate, appLocale)}`
              : `Workout "${workout.name}" was copied from ${formatDateForLocale(workout.day.date, appLocale)} to ${formatDateForLocale(targetDate, appLocale)}`,
          previousData: {
            sourceWorkoutId: workout.id,
            workoutName: workout.name,
            originalDate: workout.day.date.toISOString(),
            originalDayId: workout.dayId,
          },
          newData: {
            copiedWorkoutId: created.id,
            targetDate: targetDate.toISOString(),
            targetDayId: targetDay.id,
            copiedBy: dbUser.role === 'COACH' ? 'COACH' : 'ATHLETE',
          },
        },
      })

      return created
    })

    await invalidateUnifiedCalendarCacheForClient(client.id)

    return NextResponse.json({
      success: true,
      workout: {
        id: copiedWorkout.id,
        name: copiedWorkout.name,
        type: copiedWorkout.type,
        status: copiedWorkout.status,
        date: targetDate.toISOString(),
        dayId: targetDay.id,
        order: copiedWorkout.order,
      },
      warnings: conflicts.filter((conflict) => conflict.severity !== 'CRITICAL'),
      originalDate: workout.day.date.toISOString(),
      message:
        appLocale === 'sv'
          ? `Passet har kopierats till ${formatDateForLocale(targetDate, appLocale)}`
          : `Workout copied to ${formatDateForLocale(targetDate, appLocale)}`,
    })
  } catch (error) {
    logError('Error copying workout:', error)
    return NextResponse.json({ error: t(appLocale, 'Failed to copy workout', 'Kunde inte kopiera passet') }, { status: 500 })
  }
}

function getRequestLocale(request: NextRequest): AppLocale {
  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase()
  return acceptLanguage?.startsWith('sv') ? 'sv' : 'en'
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
