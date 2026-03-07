/**
 * Interval Session Advance API
 *
 * POST - Advance to next interval
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { advanceInterval } from '@/lib/interval-session/session-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const session = await advanceInterval(id, user.id)

    if (!session) {
      return NextResponse.json({ error: 'Session not found or ended' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error advancing interval:', error)
    return NextResponse.json(
      { error: 'Failed to advance interval' },
      { status: 500 }
    )
  }
}
