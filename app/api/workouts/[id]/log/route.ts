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
import {
  calculateTrainingLoad,
  type WorkoutData,
  type TrainingLoadResult,
} from '@/lib/training-engine/calculations/tss-trimp'
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workoutId } = await params
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
      // HR and power data for training load calculation
      avgHeartRate,
      maxHeartRate,
      avgPower,
      normalizedPower,
      distance,
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
        athleteId: clientId,
        completed: !skipped,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        duration: duration || workout.duration,
        perceivedEffort: overallRPE || null,
        notes: notes ? (skippedReason ? `${notes}\n\nSkipped reason: ${skippedReason}` : notes) : (skippedReason || null),
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
        status: skipped ? 'CANCELLED' : 'COMPLETED',
      },
    })

    // Calculate training load (TSS or TRIMP) using comprehensive library
    let trainingLoadResult: TrainingLoadResult | null = null
    let savedTrainingLoad = null

    if (!skipped && (workout.type === 'RUNNING' || workout.type === 'CYCLING' || workout.type === 'SWIMMING')) {
      try {
        // Get athlete data for calculations
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          select: {
            gender: true,
            sportProfile: {
              select: {
                cyclingSettings: true,
                runningSettings: true,
              },
            },
            athleteProfile: {
              select: {
                lt2HeartRate: true,
              },
            },
          },
        })

        // Get max HR from latest test
        const testWithMaxHR = await prisma.test.findFirst({
          where: { clientId },
          orderBy: { testDate: 'desc' },
          select: { maxHR: true },
        })

        // Get resting HR from latest daily check-in
        const latestCheckIn = await prisma.dailyCheckIn.findFirst({
          where: { clientId, restingHR: { not: null } },
          orderBy: { date: 'desc' },
          select: { restingHR: true },
        })

        // Get most recent lactate test for LT HR
        const latestTest = await prisma.test.findFirst({
          where: { clientId, testType: workout.type === 'CYCLING' ? 'CYCLING' : 'RUNNING' },
          orderBy: { testDate: 'desc' },
          select: { anaerobicThreshold: true },
        })

        // Extract FTP from cycling settings if available
        const cyclingSettings = client?.sportProfile?.cyclingSettings as { currentFtp?: number } | null
        const ftp = cyclingSettings?.currentFtp

        // Extract LT HR from test data or athlete profile
        const anaerobicThreshold = latestTest?.anaerobicThreshold as { hr?: number } | null
        const ltHR = anaerobicThreshold?.hr || client?.athleteProfile?.lt2HeartRate || undefined

        // Get resting HR from latest check-in
        const restingHR = latestCheckIn?.restingHR || undefined

        // Get max HR from test or logged value
        const athleteMaxHR = testWithMaxHR?.maxHR || maxHeartRate || undefined

        // Build workout data for calculation
        const workoutData: WorkoutData = {
          duration: duration || workout.duration || 60,
          avgHeartRate: avgHeartRate || undefined,
          maxHeartRate: athleteMaxHR,
          avgPower: avgPower || undefined,
          normalizedPower: normalizedPower || avgPower || undefined,
          ftp: ftp || undefined,
          ltHR: ltHR,
          restingHR: restingHR,
          gender: (client?.gender as 'MALE' | 'FEMALE') || undefined,
        }

        // Calculate training load
        trainingLoadResult = calculateTrainingLoad(workoutData)

        // If calculation was successful, save to TrainingLoad table
        if (trainingLoadResult.confidence !== 'LOW' || trainingLoadResult.tss || trainingLoadResult.hrTSS || trainingLoadResult.trimp) {
          const loadValue = trainingLoadResult.tss || trainingLoadResult.hrTSS || trainingLoadResult.trimp || 0

          // Determine load type based on calculation method
          let loadType = 'TRIMP_EDWARDS'
          if (trainingLoadResult.method.includes('TSS')) {
            loadType = 'TSS'
          } else if (trainingLoadResult.method.includes('Banister')) {
            loadType = 'TRIMP_BANISTER'
          }

          // Map workout intensity
          const intensityMap: Record<string, string> = {
            RECOVERY: 'RECOVERY',
            EASY: 'EASY',
            MODERATE: 'MODERATE',
            THRESHOLD: 'HARD',
            INTERVAL: 'VERY_HARD',
            MAX: 'VERY_HARD',
          }
          const intensity = intensityMap[workout.intensity as string] || 'MODERATE'

          savedTrainingLoad = await prisma.trainingLoad.create({
            data: {
              clientId,
              date: completedAt ? new Date(completedAt) : new Date(),
              dailyLoad: loadValue,
              loadType,
              workoutType: workout.type,
              duration: duration || workout.duration || 60,
              distance: distance || null,
              avgHR: avgHeartRate || null,
              maxHR: maxHeartRate || null,
              intensity,
            },
          })

          logger.info('Training load saved', {
            clientId,
            workoutId,
            tss: trainingLoadResult.tss,
            hrTSS: trainingLoadResult.hrTSS,
            trimp: trainingLoadResult.trimp,
            method: trainingLoadResult.method,
            confidence: trainingLoadResult.confidence,
          })
        }
      } catch (error) {
        logger.error('Error calculating training load', { clientId, workoutId }, error)
        // Don't fail the workout log if training load calculation fails
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
        trainingLoad: trainingLoadResult ? {
          tss: trainingLoadResult.tss,
          hrTSS: trainingLoadResult.hrTSS,
          trimp: trainingLoadResult.trimp,
          intensity: trainingLoadResult.intensity,
          method: trainingLoadResult.method,
          confidence: trainingLoadResult.confidence,
          saved: !!savedTrainingLoad,
        } : null,
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
