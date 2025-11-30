// app/api/progression/calculate/route.ts
/**
 * POST /api/progression/calculate
 *
 * Calculate automatic progression for a completed workout
 *
 * Input: {clientId, exerciseId, date, sets, repsCompleted, repsTarget, actualLoad, rpe?, strengthPhase?}
 * Output: {action, reasoning, estimated1RM, recommendations, plateau, twoForTwo}
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateProgression } from '@/lib/training-engine/progression'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      clientId,
      exerciseId,
      date,
      sets,
      repsCompleted,
      repsTarget,
      actualLoad,
      rpe,
      strengthPhase,
    } = body

    // Validation
    if (!clientId || !exerciseId || !date || !sets || !repsCompleted || !repsTarget || !actualLoad) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, exerciseId, date, sets, repsCompleted, repsTarget, actualLoad' },
        { status: 400 }
      )
    }

    // Validate numeric values
    if (sets <= 0 || repsCompleted < 0 || repsTarget <= 0 || actualLoad <= 0) {
      return NextResponse.json({ error: 'Numeric values must be positive' }, { status: 400 })
    }

    // Calculate progression
    const result = await calculateProgression({
      clientId,
      exerciseId,
      date: new Date(date),
      sets,
      repsCompleted,
      repsTarget,
      actualLoad,
      rpe,
      strengthPhase,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error calculating progression', {}, error)
    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 })
  }
}
