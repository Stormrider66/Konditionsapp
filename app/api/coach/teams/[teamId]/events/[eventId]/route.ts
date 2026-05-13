/**
 * Single Team Event API
 *
 * GET    - Get event details
 * PATCH  - Update event
 * DELETE - Delete event
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string; eventId: string }>
}

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(['PRACTICE', 'GAME', 'TEST', 'INTERVAL_SESSION', 'OFF_DAY', 'MEETING', 'OTHER']).optional(),
  location: z.string().max(200).optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  allDay: z.boolean().optional(),
  attendance: z.array(z.object({
    clientId: z.string().uuid(),
    status: z.enum(['ATTENDING', 'ABSENT', 'UNKNOWN']),
  })).optional(),
})

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const event = await prisma.teamEvent.findFirst({
      where: { id: eventId, teamId },
      include: {
        createdBy: { select: { name: true } },
        intervalSession: { select: { id: true, name: true, status: true } },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type
    if (parsed.data.location !== undefined) updateData.location = parsed.data.location
    if (parsed.data.startDate !== undefined) updateData.startDate = new Date(parsed.data.startDate)
    if (parsed.data.endDate !== undefined) updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
    if (parsed.data.allDay !== undefined) updateData.allDay = parsed.data.allDay
    if (parsed.data.attendance !== undefined) updateData.attendance = JSON.parse(JSON.stringify(parsed.data.attendance))

    const existingEvent = await prisma.teamEvent.findFirst({
      where: { id: eventId, teamId },
      select: { id: true },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const event = await prisma.teamEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        createdBy: { select: { name: true } },
      },
    })

    return NextResponse.json({ event })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    await prisma.teamEvent.deleteMany({ where: { id: eventId, teamId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
