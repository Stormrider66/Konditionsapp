/**
 * Interval Session Participants API
 *
 * POST   - Add participant
 * DELETE - Remove participant
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  addParticipant,
  removeParticipant,
} from '@/lib/interval-session/session-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const { clientId } = await req.json()

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const success = await addParticipant(id, user.id, clientId)

    if (!success) {
      return NextResponse.json({ error: 'Failed to add participant' }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error adding participant:', error)
    return NextResponse.json(
      { error: 'Failed to add participant' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const { clientId } = await req.json()

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const success = await removeParticipant(id, user.id, clientId)

    if (!success) {
      return NextResponse.json({ error: 'Failed to remove participant' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error removing participant:', error)
    return NextResponse.json(
      { error: 'Failed to remove participant' },
      { status: 500 }
    )
  }
}
