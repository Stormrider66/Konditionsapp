// app/api/clients/[id]/progression/[exerciseId]/route.ts
/**
 * Client Progression History API
 *
 * GET /api/clients/:id/progression/:exerciseId
 *
 * Returns complete progression history for a specific exercise:
 * - All workout sessions with this exercise
 * - 1RM estimates over time
 * - Load progression curve
 * - Plateau detection
 * - 2-for-2 rule status
 * - Strength phase transitions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProgressionHistory } from '@/lib/training-engine/progression'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient, canAccessExercise } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: clientId, exerciseId } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')

    const hasClientAccess = await canAccessClient(user.id, clientId)
    if (!hasClientAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const hasExerciseAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasExerciseAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const history = await getProgressionHistory(clientId, exerciseId, limit)

    return NextResponse.json(history, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
