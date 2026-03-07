/**
 * Interval Session Lap API
 *
 * POST   - Record a lap
 * DELETE - Undo a lap
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { recordLap, deleteLap } from '@/lib/interval-session/timing-service'
import { recordLapSchema, deleteLapSchema } from '@/lib/interval-session/validation'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const body = await req.json()
    const parsed = recordLapSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await recordLap(id, user.id, parsed.data.clientId, parsed.data.cumulativeMs)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error recording lap:', error)
    return NextResponse.json(
      { error: 'Failed to record lap' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const body = await req.json()
    const parsed = deleteLapSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const deleted = await deleteLap(id, user.id, parsed.data.clientId, parsed.data.intervalNumber)

    if (!deleted) {
      return NextResponse.json({ error: 'Lap not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting lap:', error)
    return NextResponse.json(
      { error: 'Failed to delete lap' },
      { status: 500 }
    )
  }
}
