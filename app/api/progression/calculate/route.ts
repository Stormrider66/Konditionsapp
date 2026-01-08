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
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient, canAccessExercise } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
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

    const hasClientAccess = await canAccessClient(user.id, clientId)
    if (!hasClientAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const hasExerciseAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasExerciseAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    return handleApiError(error)
  }
}
