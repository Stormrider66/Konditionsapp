/**
 * Interval Session Rest Timer API
 *
 * POST - Manually start group rest timer
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { startGroupRest } from '@/lib/interval-session/session-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const result = await startGroupRest(id, user.id)

    if (!result) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error starting group rest:', error)
    return NextResponse.json(
      { error: 'Failed to start group rest' },
      { status: 500 }
    )
  }
}
