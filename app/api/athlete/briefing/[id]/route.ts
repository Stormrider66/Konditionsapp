/**
 * Athlete Briefing Actions API
 *
 * PATCH /api/athlete/briefing/[id] - Update briefing (read/dismiss)
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Verify briefing belongs to this athlete
    const briefing = await prisma.aIBriefing.findFirst({
      where: {
        id,
        clientId,
      },
    })

    if (!briefing) {
      return NextResponse.json({ error: 'Briefing not found' }, { status: 404 })
    }

    // Parse action from body
    const body = await request.json()
    const { action } = body

    if (action === 'read') {
      await prisma.aIBriefing.update({
        where: { id },
        data: { readAt: new Date() },
      })
      return NextResponse.json({ success: true, action: 'read' })
    }

    if (action === 'dismiss') {
      await prisma.aIBriefing.update({
        where: { id },
        data: { dismissedAt: new Date() },
      })
      return NextResponse.json({ success: true, action: 'dismiss' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating briefing:', error)
    return NextResponse.json({ error: 'Failed to update briefing' }, { status: 500 })
  }
}
