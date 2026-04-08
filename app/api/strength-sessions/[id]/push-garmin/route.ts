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

interface PushRequestBody {
  athleteId: string
  scheduleDate?: string // ISO date
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCoach()
    const { id: sessionId } = await params
    const body: PushRequestBody = await request.json()
    const { athleteId, scheduleDate } = body

    if (!athleteId) {
      return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
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
        cooldownData: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Parse exercises from JSON
    const mainExercises = (session.exercises as any[]) || []
    const warmupData = session.warmupData as { exercises?: any[] } | null
    const cooldownData = session.cooldownData as { exercises?: any[] } | null

    // Build Garmin workout
    const garminWorkout = buildGarminStrengthWorkout({
      name: session.name,
      description: session.description || undefined,
      exercises: mainExercises.map((e: any) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        restSeconds: e.restSeconds,
        notes: e.notes,
      })),
      warmupExercises: warmupData?.exercises?.map((e: any) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sets: e.sets || 1,
        reps: e.reps || '10',
        notes: e.notes,
      })),
      cooldownExercises: cooldownData?.exercises?.map((e: any) => ({
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
      message: `Styrkepass pushat till Garmin${scheduleDate ? ` och schemalagt ${scheduleDate}` : ''}.`,
    })
  } catch (error) {
    logger.error('Error pushing strength session to Garmin', {}, error)
    return NextResponse.json(
      { error: 'Failed to push to Garmin' },
      { status: 500 }
    )
  }
}
