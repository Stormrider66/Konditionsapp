/**
 * Interval Session Garmin Sync API
 *
 * POST - Trigger Garmin enrichment for all participants
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { syncGarminForSession } from '@/lib/interval-session/garmin-enrichment'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const results = await syncGarminForSession(id, user.id)

    if (results.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const matchedCount = results.filter((r) => r.matched).length

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        matched: matchedCount,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error syncing Garmin data:', error)
    return NextResponse.json(
      { error: 'Failed to sync Garmin data' },
      { status: 500 }
    )
  }
}
