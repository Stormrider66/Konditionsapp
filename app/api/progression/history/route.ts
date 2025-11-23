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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const exerciseId = searchParams.get('exerciseId')
    const limit = parseInt(searchParams.get('limit') || '10')

    // If no exerciseId provided, return weekly summary
    if (clientId && !exerciseId) {
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

    // Get history
    const result = await getProgressionHistory(clientId, exerciseId, limit)

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching progression history:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
