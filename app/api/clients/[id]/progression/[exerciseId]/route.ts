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
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; exerciseId: string } }
) {
  try {
    const clientId = params.id
    const exerciseId = params.exerciseId
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')

    const history = await getProgressionHistory(clientId, exerciseId, limit)

    return NextResponse.json(history, { status: 200 })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error fetching progression history', { clientId: params.id, exerciseId: params.exerciseId }, error)
    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 })
  }
}
