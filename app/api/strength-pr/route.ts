// app/api/strength-pr/route.ts
/**
 * Quick Strength PR API
 *
 * POST /api/strength-pr
 * Allows coaches/athletes to quickly log a strength PR without a full workout
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { estimate1RMWithConfidence } from '@/lib/training-engine/progression/rm-estimation'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const {
      clientId,
      exerciseId,
      date,
      sets,
      reps,
      load,
      rpe,
      notes,
    } = body

    // Validate required fields
    if (!clientId || !exerciseId || !sets || !reps || !load) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, exerciseId, sets, reps, load' },
        { status: 400 }
      )
    }

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Calculate 1RM estimation
    const rmEstimation = estimate1RMWithConfidence(load, reps, 'AVERAGE')

    // Create progression tracking record
    const progressionRecord = await prisma.progressionTracking.create({
      data: {
        clientId,
        exerciseId,
        date: date ? new Date(date) : new Date(),
        sets: parseInt(sets),
        repsCompleted: parseInt(reps),
        repsTarget: parseInt(reps), // Same as completed for PRs
        actualLoad: parseFloat(load),
        rpe: rpe ? parseInt(rpe) : null,
        estimated1RM: rmEstimation.estimated1RM,
        estimationMethod: rmEstimation.method,
        progressionStatus: 'ON_TRACK',
        weeksAtCurrentLoad: 0,
      },
    })

    // Also update OneRepMaxHistory if this is a new PR
    const existingPR = await prisma.oneRepMaxHistory.findFirst({
      where: {
        clientId,
        exerciseId,
      },
      orderBy: { oneRepMax: 'desc' },
    })

    let newPR = false
    if (!existingPR || rmEstimation.estimated1RM > existingPR.oneRepMax) {
      await prisma.oneRepMaxHistory.create({
        data: {
          clientId,
          exerciseId,
          date: date ? new Date(date) : new Date(),
          oneRepMax: rmEstimation.estimated1RM,
          source: 'ESTIMATED',
          notes: `${sets}x${reps} @ ${load}kg (${rmEstimation.method})`,
        },
      })
      newPR = true
    }

    return NextResponse.json({
      progressionRecord,
      estimated1RM: rmEstimation.estimated1RM,
      newPR,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        nameSv: exercise.nameSv,
      },
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating strength PR', {}, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
