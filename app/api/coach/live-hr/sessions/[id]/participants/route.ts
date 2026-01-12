/**
 * Live HR Session Participants API
 *
 * POST   - Add participant(s) to session
 * DELETE - Remove participant from session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  addParticipant,
  removeParticipant,
  addTeamParticipants,
} from '@/lib/live-hr/session-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const body = await req.json()

    // If teamId is provided, add all team members
    if (body.teamId) {
      const count = await addTeamParticipants(id, user.id, body.teamId)
      return NextResponse.json({ added: count })
    }

    // Otherwise add individual client
    if (!body.clientId) {
      return NextResponse.json(
        { error: 'clientId or teamId required' },
        { status: 400 }
      )
    }

    const success = await addParticipant(id, user.id, body.clientId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add participant' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
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

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId required' },
        { status: 400 }
      )
    }

    const success = await removeParticipant(id, user.id, clientId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove participant' },
        { status: 400 }
      )
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
