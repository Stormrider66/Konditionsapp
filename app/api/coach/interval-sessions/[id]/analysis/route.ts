/**
 * Interval Session Analysis API
 *
 * GET - Get analysis data for charts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getAnalysisData } from '@/lib/interval-session/analysis-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const data = await getAnalysisData(id, user.id)

    if (!data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error getting analysis data:', error)
    return NextResponse.json(
      { error: 'Failed to get analysis data' },
      { status: 500 }
    )
  }
}
