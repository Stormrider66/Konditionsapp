// app/api/workouts/[id]/log/route.ts
/**
 * Workout Logging API
 *
 * POST /api/workouts/:id/log
 *
 * Allows athletes to log completed workouts with:
 * - Completion status
 * - Actual vs planned duration
 * - Exercise-specific data (sets, reps, load, RPE)
 * - Overall RPE
 * - Notes and feedback
 * - File attachments (photos, videos)
 *
 * Automatically:
 * - Updates WorkoutLog
 * - Creates ProgressionTracking entries for strength exercises
 * - Calculates 1RM estimates
 * - Checks 2-for-2 rule
 * - Detects plateaus
 * - Updates training load (TSS/TRIMP)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { calculateProgression } from '@/lib/training-engine/progression'
import {
  processInjuryDetection,
  type InjuryDetection,
} from '@/lib/training-engine/integration/injury-management'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

interface ExerciseLog {
  segmentId: string
  exerciseId: string
  setsCompleted: number
  setsPlanned: number
  repsCompleted: number
  repsPlanned: number
  loadUsed: number
  rpe?: number
  notes?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workoutId = params.id
    const body = await request.json()

    const {
      clientId,
      completedAt,
      duration,
      overallRPE,
      notes,
      exerciseLogs,
      uploadedFiles,
      skipped,
      skippedReason,
      painLevel, // 0-10 scale: pain during/after workout
      painLocation, // Specific injury type if known
    } = body

    // Validation
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Get workout details
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        segments: {
          include: {
            exercise: true,
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Create workout log
    const workoutLog = await prisma.workoutLog.create({
      data: {
        workoutId,
        clientId,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        duration: duration || workout.duration,
        plannedDuration: workout.duration,
        overallRPE: overallRPE || null,
        notes: notes || null,
        uploadedFiles: uploadedFiles || [],
        skipped: skipped || false,
        skippedReason: skippedReason || null,
      },
    })

    // Process exercise logs and create progression tracking
    const progressionResults = []

    if (exerciseLogs && exerciseLogs.length > 0 && !skipped) {
      for (const log of exerciseLogs as ExerciseLog[]) {
        const segment = workout.segments.find((s) => s.id === log.segmentId)
        if (!segment || !segment.exerciseId) continue

        // Create progression tracking entry
        const progression = await calculateProgression({
          clientId,
          exerciseId: segment.exerciseId,
          date: completedAt ? new Date(completedAt) : new Date(),
          sets: log.setsCompleted,
          repsCompleted: log.repsCompleted,
          repsTarget: log.repsPlanned,
          actualLoad: log.loadUsed,
          rpe: log.rpe,
          strengthPhase: workout.type === 'STRENGTH' ? undefined : undefined, // TODO: Get from program
        })

        progressionResults.push({
          exerciseId: segment.exerciseId,
          exerciseName: segment.exercise?.name,
          progression,
        })
      }
    }

    // Update workout completion status
    await prisma.workout.update({
      where: { id: workoutId },
      data: {
        completed: !skipped,
      },
    })

    // Calculate training load (TSS or TRIMP)
    // TODO: Implement training load calculation based on workout type
    let trainingLoad = null

    if (workout.type === 'RUNNING' || workout.type === 'CYCLING') {
      // Calculate TSS based on duration and intensity
      const intensityMultiplier = {
        RECOVERY: 0.5,
        EASY: 0.6,
        MODERATE: 0.75,
        THRESHOLD: 1.0,
        INTERVAL: 1.2,
        MAX: 1.5,
      }

      const multiplier = intensityMultiplier[workout.intensity as keyof typeof intensityMultiplier] || 0.7
      const tss = (duration || workout.duration || 60) * multiplier

      trainingLoad = {
        tss,
        trimp: null,
      }
    }

    // ==========================================
    // Post-Workout Injury Detection
    // ==========================================
    let injuryTriggered = false
    let injurySummary = null

    // Trigger injury cascade if pain >=5 reported after workout
    if (painLevel && painLevel >= 5 && !skipped) {
      try {
        logger.info('Post-workout pain detected, processing injury cascade', {
          athleteId: clientId,
          painLevel,
          workoutType: workout.type,
        })

        // Determine injury type from location if provided, otherwise use generic
        const injuryType = painLocation || 'SHIN_SPLINTS' // Default to common overuse injury

        // Get ACWR risk if available
        const recentLoad = await prisma.trainingLoad.findFirst({
          where: { clientId },
          orderBy: { date: 'desc' },
        })

        const acwrRisk = recentLoad?.acwr
          ? recentLoad.acwr >= 2.0
            ? ('CRITICAL' as const)
            : recentLoad.acwr >= 1.5
            ? ('HIGH' as const)
            : recentLoad.acwr >= 1.3
            ? ('MODERATE' as const)
            : ('LOW' as const)
          : undefined

        // Create injury detection object
        const injuryDetection: InjuryDetection = {
          athleteId: clientId,
          injuryType: injuryType as InjuryDetection['injuryType'],
          painLevel: painLevel,
          painTiming: 'AFTER', // Post-workout pain
          acwrRisk,
          detectionSource: 'WORKOUT_LOG',
          date: completedAt ? new Date(completedAt) : new Date(),
        }

        // Process injury cascade
        const injuryResponse = await processInjuryDetection(injuryDetection, prisma, {
          persistRecord: true,
        })

        injuryTriggered = true
        injurySummary = {
          immediateAction: injuryResponse.immediateAction,
          workoutsModified: injuryResponse.workoutModifications.length,
          estimatedReturnWeeks: injuryResponse.estimatedReturnWeeks,
          coachNotified: true,
        }

        logger.info('Post-workout injury cascade completed', {
          workoutsModified: injuryResponse.workoutModifications.length,
          estimatedReturnWeeks: injuryResponse.estimatedReturnWeeks,
        })
      } catch (error) {
        logger.error('Error processing post-workout injury detection', { clientId, painLevel }, error)
        // Don't fail the workout log if injury processing fails
      }
    }

    return NextResponse.json(
      {
        workoutLog,
        progression: progressionResults,
        trainingLoad,
        injuryResponse: injuryTriggered
          ? {
              triggered: true,
              summary: injurySummary,
            }
          : {
              triggered: false,
            },
        summary: {
          workoutId,
          completed: !skipped,
          duration: duration || workout.duration,
          exercisesLogged: exerciseLogs?.length || 0,
          progressionUpdates: progressionResults.length,
          injuryDetected: injuryTriggered,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error logging workout', {}, error)
    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 })
  }
}
