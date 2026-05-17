/**
 * Team Events API
 *
 * GET  - List team events (with date range filter)
 * POST - Create a new team event
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam, getWritableTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import {
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPES,
} from '@/lib/team-calendar/event-types'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(TEAM_EVENT_TYPES).default('PRACTICE'),
  location: z.string().max(200).optional(),
  startDate: z.string(), // ISO datetime
  endDate: z.string().optional(),
  allDay: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().max(200).optional(),
  intervalSessionId: z.string().uuid().optional(),
  contentStatus: z.enum(TEAM_EVENT_CONTENT_STATUSES).optional(),
  contentOwner: z.enum(TEAM_EVENT_CONTENT_OWNERS).optional(),
  linkedWorkoutType: z.enum(['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY']).optional().nullable(),
  linkedWorkoutId: z.string().uuid().optional().nullable(),
  linkedWorkoutName: z.string().max(200).optional().nullable(),
  attendance: z.array(z.object({
    clientId: z.string().uuid(),
    status: z.enum(['ATTENDING', 'ABSENT', 'UNKNOWN']),
  })).optional(),
})

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    // Verify staff can access this team in the requested business.
    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = searchParams.get('type')

    const events = await prisma.teamEvent.findMany({
      where: {
        teamId,
        ...(from ? { startDate: { gte: new Date(from) } } : {}),
        ...(to ? { startDate: { lte: new Date(to) } } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        createdBy: { select: { name: true } },
        intervalSession: { select: { id: true, name: true, status: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error listing team events:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(req)

    const team = await getWritableTeam(user.id, teamId, scope.businessSlug, 'events')

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = createEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const event = await prisma.teamEvent.create({
      data: {
        teamId,
        createdById: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        location: parsed.data.location,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        allDay: parsed.data.allDay,
        isRecurring: parsed.data.isRecurring,
        recurrenceRule: parsed.data.recurrenceRule,
        intervalSessionId: parsed.data.intervalSessionId,
        contentStatus: parsed.data.contentStatus,
        contentOwner: parsed.data.contentOwner,
        linkedWorkoutType: parsed.data.linkedWorkoutType,
        linkedWorkoutId: parsed.data.linkedWorkoutId,
        linkedWorkoutName: parsed.data.linkedWorkoutName,
        attendance: parsed.data.attendance ? JSON.parse(JSON.stringify(parsed.data.attendance)) : null,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating team event:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
