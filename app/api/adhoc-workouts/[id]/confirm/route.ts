/**
 * Ad-Hoc Workout Confirmation API
 *
 * POST /api/adhoc-workouts/[id]/confirm - Confirm and save the workout
 *
 * Creates a TrainingLoad entry for the workout and marks it as confirmed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { logger } from '@/lib/logger'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const confirmWorkoutSchema = z.object({
  // Allow overriding the parsed structure with edits
  parsedStructure: z.record(z.unknown()).optional(),
  // Additional subjective data
  perceivedEffort: z.number().min(1).max(10).optional(),
  feeling: z.enum(['GREAT', 'GOOD', 'OKAY', 'TIRED', 'EXHAUSTED']).optional(),
  notes: z.string().optional(),
})

// ============================================
// POST - Confirm Ad-Hoc Workout
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Get the ad-hoc workout
    const adHocWorkout = await prisma.adHocWorkout.findUnique({
      where: { id },
    })

    if (!adHocWorkout) {
      return NextResponse.json(
        { success: false, error: 'Ad-hoc workout not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (adHocWorkout.athleteId !== clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check status
    if (adHocWorkout.status === 'CONFIRMED') {
      return NextResponse.json({
        success: true,
        data: {
          id: adHocWorkout.id,
          status: adHocWorkout.status,
          trainingLoadId: adHocWorkout.trainingLoadId,
        },
        message: 'Already confirmed',
      })
    }

    if (adHocWorkout.status !== 'READY_FOR_REVIEW') {
      return NextResponse.json(
        { success: false, error: 'Workout must be processed before confirming' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = confirmWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Get the final parsed structure (use override if provided)
    const finalStructure = (data.parsedStructure ||
      adHocWorkout.parsedStructure) as ParsedWorkout | null

    if (!finalStructure) {
      return NextResponse.json(
        { success: false, error: 'No parsed workout data available' },
        { status: 400 }
      )
    }

    // Apply any edits
    if (data.perceivedEffort !== undefined) {
      finalStructure.perceivedEffort = data.perceivedEffort
    }
    if (data.feeling !== undefined) {
      finalStructure.feeling = data.feeling
    }
    if (data.notes !== undefined) {
      finalStructure.notes = data.notes
    }

    // Calculate training load
    const trainingLoad = calculateTrainingLoad(finalStructure, adHocWorkout.workoutDate)

    // Create TrainingLoad entry in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create TrainingLoad
      const load = await tx.trainingLoad.create({
        data: {
          clientId: clientId,
          date: adHocWorkout.workoutDate,
          dailyLoad: trainingLoad.tss,
          loadType: 'TSS',
          duration: finalStructure.duration || 0,
          distance: finalStructure.distance,
          avgHR: finalStructure.avgHeartRate,
          maxHR: finalStructure.maxHeartRate,
          avgPace: finalStructure.avgPace,
          intensity: mapIntensityToString(finalStructure.intensity),
          workoutType: mapWorkoutTypeToString(finalStructure.type, finalStructure.sport),
        },
      })

      // Update ad-hoc workout
      const updated = await tx.adHocWorkout.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          athleteReviewed: true,
          athleteEdits: data.parsedStructure
            ? (data as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          parsedStructure: finalStructure as unknown as Prisma.InputJsonValue,
          trainingLoadId: load.id,
        },
      })

      return { adHocWorkout: updated, trainingLoad: load }
    })

    logger.info('Ad-hoc workout confirmed', {
      id,
      athleteId: clientId,
      trainingLoadId: result.trainingLoad.id,
      tss: trainingLoad.tss,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.adHocWorkout.id,
        status: result.adHocWorkout.status,
        trainingLoadId: result.trainingLoad.id,
        trainingLoad: {
          tss: trainingLoad.tss,
          duration: finalStructure.duration,
          distance: finalStructure.distance,
        },
      },
    })
  } catch (error) {
    console.error('Error confirming ad-hoc workout:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to confirm ad-hoc workout' },
      { status: 500 }
    )
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface TrainingLoadResult {
  tss: number
  trimp?: number
}

function calculateTrainingLoad(
  workout: ParsedWorkout,
  workoutDate: Date
): TrainingLoadResult {
  const duration = workout.duration || 30 // Default 30 minutes if not specified
  const rpe = workout.perceivedEffort || 6 // Default RPE 6 if not specified

  // Simple TSS calculation based on duration and RPE
  // TSS = (duration * IF^2 * 100) / 60
  // IF estimated from RPE: IF = RPE / 10
  const intensityFactor = rpe / 10
  const tss = Math.round((duration * Math.pow(intensityFactor, 2) * 100) / 60)

  // For cardio with HR data, we could calculate TRIMP
  // TRIMP = duration * HRratio * exp(b * HRratio)
  // Where HRratio = (avgHR - restHR) / (maxHR - restHR)
  // This requires athlete's HR zones which we don't have here

  return { tss: Math.max(1, tss) } // Minimum TSS of 1
}

function mapIntensityToString(intensity?: ParsedWorkout['intensity']): string {
  switch (intensity) {
    case 'RECOVERY':
      return 'RECOVERY'
    case 'EASY':
      return 'EASY'
    case 'MODERATE':
      return 'MODERATE'
    case 'THRESHOLD':
      return 'HARD'
    case 'INTERVAL':
    case 'MAX':
      return 'VERY_HARD'
    default:
      return 'MODERATE'
  }
}

function mapWorkoutTypeToString(
  type: ParsedWorkout['type'],
  sport?: ParsedWorkout['sport']
): string {
  // For cardio, use the sport
  if (type === 'CARDIO' && sport) {
    switch (sport) {
      case 'RUNNING':
        return 'EASY' // Could be refined based on intensity
      case 'CYCLING':
        return 'EASY'
      default:
        return 'EASY'
    }
  }

  // For strength/hybrid
  switch (type) {
    case 'STRENGTH':
      return 'STRENGTH'
    case 'HYBRID':
      return 'INTERVALS'
    case 'MIXED':
      return 'EASY'
    default:
      return 'EASY'
  }
}
