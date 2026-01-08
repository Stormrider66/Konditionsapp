// app/api/progression/history/route.ts
/**
 * GET /api/progression/history?clientId=xxx&exerciseId=xxx&limit=10
 *
 * Get progression history for an athlete-exercise pair
 *
 * Query params: clientId, exerciseId, limit (optional, default 10)
 * Output: {history, trend, progressionRate, currentStatus}
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProgressionHistory, getWeeklyProgressionSummary } from '@/lib/training-engine/progression'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient, canAccessExercise } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const exerciseId = searchParams.get('exerciseId')
    const limit = parseInt(searchParams.get('limit') || '10')

    // If no exerciseId provided, return weekly summary
    if (clientId && !exerciseId) {
      const hasClientAccess = await canAccessClient(user.id, clientId)
      if (!hasClientAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const summary = await getWeeklyProgressionSummary(clientId)
      return NextResponse.json(summary, { status: 200 })
    }

    // Validation
    if (!clientId || !exerciseId) {
      return NextResponse.json(
        { error: 'Missing required parameters: clientId and exerciseId' },
        { status: 400 }
      )
    }

    const hasClientAccess = await canAccessClient(user.id, clientId)
    if (!hasClientAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const hasExerciseAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasExerciseAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get history
    const result = await getProgressionHistory(clientId, exerciseId, limit)

    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
