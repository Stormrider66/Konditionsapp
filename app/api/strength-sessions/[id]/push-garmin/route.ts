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
import { requireCoach } from '@/lib/auth-utils'
import { buildGarminStrengthWorkout, createGarminWorkout, scheduleGarminWorkout } from '@/lib/integrations/garmin/training'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface PushRequestBody {
  athleteId: string
  scheduleDate?: string // ISO date
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { id: sessionId } = await params
    const body: PushRequestBody = await request.json()
    const { athleteId, scheduleDate } = body

    if (!athleteId) {
      return NextResponse.json({ error: t(locale, 'athleteId is required', 'athleteId krävs') }, { status: 400 })
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

    // Parse exercises from JSON
    const mainExercises = (session.exercises as StrengthExercisePayload[]) || []
    const warmupData = session.warmupData as StrengthSectionPayload | null
    const prehabData = session.prehabData as StrengthSectionPayload | null
    const cooldownData = session.cooldownData as StrengthSectionPayload | null

    // Build Garmin workout
    const garminWorkout = buildGarminStrengthWorkout({
      name: session.name,
      description: session.description || undefined,
      exercises: mainExercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        restSeconds: e.restSeconds,
        notes: e.notes,
      })),
      warmupExercises: [
        ...(warmupData?.exercises ?? []),
        ...(prehabData?.exercises ?? []),
      ].map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sets: e.sets || 1,
        reps: e.reps || '10',
        notes: e.notes,
      })),
      cooldownExercises: cooldownData?.exercises?.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sets: e.sets || 1,
        reps: e.reps || '30s',
        notes: e.notes,
      })),
    })

    // Push to Garmin
    const created = await createGarminWorkout(athleteId, garminWorkout)

    // Schedule if date provided
    if (scheduleDate && created.workoutId) {
      await scheduleGarminWorkout(athleteId, { workoutId: created.workoutId, date: scheduleDate })
    }

    logger.info('Pushed strength session to Garmin', {
      sessionId,
      athleteId,
      garminWorkoutId: created.workoutId,
      scheduled: !!scheduleDate,
    })

    return NextResponse.json({
      success: true,
      garminWorkoutId: created.workoutId,
      scheduled: !!scheduleDate,
      message: scheduleDate
        ? t(locale, `Strength session pushed to Garmin and scheduled ${scheduleDate}.`, `Styrkepass pushat till Garmin och schemalagt ${scheduleDate}.`)
        : t(locale, 'Strength session pushed to Garmin.', 'Styrkepass pushat till Garmin.'),
    })
  } catch (error) {
    logger.error('Error pushing strength session to Garmin', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to push to Garmin', 'Kunde inte skicka till Garmin') },
      { status: 500 }
    )
  }
}
