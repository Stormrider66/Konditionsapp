/**
 * Push Strength Session to Garmin
 *
 * POST /api/strength-sessions/[id]/push-garmin
 *
 * Serializes a strength session to Garmin workout format and pushes
 * it to the athlete's Garmin Connect account. Optionally schedules
 * it on a specific date.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import {
  buildGarminStrengthWorkout,
  createGarminWorkout,
  deleteGarminWorkout,
  resolveGarminWorkoutId,
  scheduleGarminWorkout,
} from '@/lib/integrations/garmin/training'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const pushStrengthSessionSchema = z.object({
  athleteId: z.string().uuid(),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

interface StrengthExercisePayload {
  exerciseId?: string
  exerciseName?: string
  sets?: number
  reps?: number | string
  weight?: number
  restSeconds?: number
  notes?: string
}

interface StrengthSectionPayload {
  exercises?: StrengthExercisePayload[]
}

interface GarminStrengthExercisePayload {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | string
  weight?: number
  restSeconds?: number
  notes?: string
}

function toGarminStrengthExercise(
  exercise: StrengthExercisePayload,
  defaults?: { sets?: number; reps?: number | string; restSeconds?: number }
): GarminStrengthExercisePayload | null {
  const exerciseId = exercise.exerciseId?.trim()
  const exerciseName = exercise.exerciseName?.trim()
  if (!exerciseId || !exerciseName) return null

  const payload: GarminStrengthExercisePayload = {
    exerciseId,
    exerciseName,
    sets: exercise.sets ?? defaults?.sets ?? 1,
    reps: exercise.reps ?? defaults?.reps ?? '10',
  }

  if (exercise.weight !== undefined) payload.weight = exercise.weight
  const restSeconds = exercise.restSeconds ?? defaults?.restSeconds
  if (restSeconds !== undefined) payload.restSeconds = restSeconds
  if (exercise.notes) payload.notes = exercise.notes

  return payload
}

function isGarminStrengthExercise(
  exercise: GarminStrengthExercisePayload | null
): exercise is GarminStrengthExercisePayload {
  return exercise !== null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: sessionId } = await params
    const body = await request.json()
    const parsed = pushStrengthSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig indata'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { athleteId, scheduleDate } = parsed.data

    const hasAccess = await canAccessClient(user.id, athleteId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId: athleteId, type: 'GARMIN' } },
      select: { syncEnabled: true },
    })
    if (!token || !token.syncEnabled) {
      return NextResponse.json(
        { error: t(locale, 'Garmin not connected', 'Garmin inte anslutet'), code: 'GARMIN_NOT_CONNECTED' },
        { status: 404 }
      )
    }

    // Fetch session with exercises
    const session = await prisma.strengthSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        name: true,
        description: true,
        exercises: true,
        warmupData: true,
        prehabData: true,
        cooldownData: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    const matchingAssignment = scheduleDate
      ? await prisma.strengthSessionAssignment.findUnique({
          where: {
            sessionId_athleteId_assignedDate: {
              sessionId,
              athleteId,
              assignedDate: new Date(scheduleDate),
            },
          },
          select: {
            id: true,
            garminWorkoutId: true,
          },
        })
      : null

    // Parse exercises from JSON
    const mainExercises = (session.exercises as StrengthExercisePayload[]) || []
    const warmupData = session.warmupData as StrengthSectionPayload | null
    const prehabData = session.prehabData as StrengthSectionPayload | null
    const cooldownData = session.cooldownData as StrengthSectionPayload | null

    // Build Garmin workout
    const garminWorkout = buildGarminStrengthWorkout({
      name: session.name,
      description: session.description || undefined,
      exercises: mainExercises
        .map((exercise) => toGarminStrengthExercise(exercise))
        .filter(isGarminStrengthExercise),
      warmupExercises: [
        ...(warmupData?.exercises ?? []),
        ...(prehabData?.exercises ?? []),
      ].map((exercise) => toGarminStrengthExercise(exercise, { sets: 1, reps: '10' }))
        .filter(isGarminStrengthExercise),
      cooldownExercises: cooldownData?.exercises
        ?.map((exercise) => toGarminStrengthExercise(exercise, { sets: 1, reps: '30s' }))
        .filter(isGarminStrengthExercise),
    })

    const hadPreviousGarminWorkout = Boolean(matchingAssignment?.garminWorkoutId)

    if (matchingAssignment?.garminWorkoutId) {
      try {
        await deleteGarminWorkout(athleteId, matchingAssignment.garminWorkoutId)
        await prisma.strengthSessionAssignment.update({
          where: { id: matchingAssignment.id },
          data: {
            garminWorkoutId: null,
            garminPushedAt: null,
          },
        })
        logger.info('Deleted previous Garmin strength assignment workout', {
          sessionId,
          athleteId,
          garminWorkoutId: matchingAssignment.garminWorkoutId,
        })
      } catch (deleteErr) {
        logger.warn('Failed to delete previous Garmin strength assignment workout; continuing with replacement', {
          sessionId,
          athleteId,
          garminWorkoutId: matchingAssignment.garminWorkoutId,
        }, deleteErr)
      }
    }

    // Push to Garmin
    const created = await createGarminWorkout(athleteId, garminWorkout)
    const garminWorkoutId = resolveGarminWorkoutId(created)
    if (!garminWorkoutId) {
      throw new Error('Garmin did not return a workout ID')
    }

    // Schedule if date provided
    let scheduled = false
    let scheduleWarning: string | undefined
    if (scheduleDate) {
      try {
        await scheduleGarminWorkout(athleteId, { workoutId: garminWorkoutId, calendarDate: scheduleDate })
        scheduled = true
      } catch (scheduleErr) {
        scheduleWarning = scheduleErr instanceof Error ? scheduleErr.message : 'Garmin scheduling failed'
        logger.warn('Garmin strength workout scheduling failed after workout creation', {
          sessionId,
          athleteId,
          garminWorkoutId,
          scheduleDate,
        }, scheduleErr)
      }
    }

    if (matchingAssignment) {
      await prisma.strengthSessionAssignment.update({
        where: { id: matchingAssignment.id },
        data: {
          garminWorkoutId,
          garminPushedAt: new Date(),
        },
      })
    }

    logger.info('Pushed strength session to Garmin', {
      sessionId,
      athleteId,
      garminWorkoutId,
      scheduled,
      assignmentId: matchingAssignment?.id,
    })

    const responseMessage = scheduleWarning
      ? t(
          locale,
          'Strength session pushed to Garmin, but automatic calendar scheduling failed.',
          'Styrkepasset skickades till Garmin, men automatisk kalenderplanering misslyckades.'
        )
      : scheduleDate
        ? t(locale, `Strength session pushed to Garmin and scheduled ${scheduleDate}.`, `Styrkepass pushat till Garmin och schemalagt ${scheduleDate}.`)
        : t(locale, 'Strength session pushed to Garmin.', 'Styrkepass pushat till Garmin.')

    return NextResponse.json({
      success: true,
      garminWorkoutId,
      scheduled,
      replaced: hadPreviousGarminWorkout,
      ...(scheduleWarning && { scheduleWarning }),
      message: responseMessage,
    })
  } catch (error) {
    logger.error('Error pushing strength session to Garmin', {}, error)
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: t(locale, 'Garmin rate limit exceeded. Try again later.', 'Garmins hastighetsgräns har nåtts. Försök igen senare.') },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to push to Garmin', 'Kunde inte skicka till Garmin') },
      { status: 500 }
    )
  }
}
