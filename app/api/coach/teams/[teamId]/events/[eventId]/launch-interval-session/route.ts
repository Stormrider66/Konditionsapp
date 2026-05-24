import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { createIntervalSession } from '@/lib/interval-session/session-service'
import type { IntervalProtocol } from '@/lib/interval-session/types'
import {
  buildIntervalProtocolFromCardioSession,
  buildIntervalProtocolFromHybridWorkout,
  fallbackEventProtocol,
} from '@/lib/interval-session/workout-protocol'
import {
  cardioSessionAccessWhere,
  hybridWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope'

interface RouteContext {
  params: Promise<{ teamId: string; eventId: string }>
}

function scheduledTimeValue(date: Date): string {
  return date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

async function buildProtocolForEvent({
  event,
  userId,
  request,
}: {
  event: {
    id: string
    title: string
    linkedWorkoutType: string | null
    linkedWorkoutId: string | null
  }
  userId: string
  request: NextRequest
}): Promise<IntervalProtocol> {
  const businessScope = await resolveWorkoutBusinessScope(userId, request)

  if (businessScope && event.linkedWorkoutType === 'CARDIO' && event.linkedWorkoutId) {
    const cardioSession = await prisma.cardioSession.findFirst({
      where: {
        id: event.linkedWorkoutId,
        AND: [cardioSessionAccessWhere(userId, businessScope.businessId)],
      },
      select: {
        id: true,
        name: true,
        sport: true,
        segments: true,
      },
    })

    if (cardioSession) {
      const protocol = buildIntervalProtocolFromCardioSession(cardioSession)
      if (protocol) return protocol
    }
  }

  if (businessScope && event.linkedWorkoutType === 'HYBRID' && event.linkedWorkoutId) {
    const hybridWorkout = await prisma.hybridWorkout.findFirst({
      where: {
        id: event.linkedWorkoutId,
        AND: [hybridWorkoutAccessWhere(userId, businessScope.businessId)],
      },
      select: {
        id: true,
        name: true,
        format: true,
        timeCap: true,
        workTime: true,
        restTime: true,
        totalRounds: true,
        movements: {
          orderBy: { order: 'asc' },
          select: {
            reps: true,
            calories: true,
            distance: true,
            duration: true,
            notes: true,
            exercise: {
              select: {
                name: true,
                nameSv: true,
                standardAbbreviation: true,
              },
            },
          },
        },
      },
    })

    if (hybridWorkout) {
      const protocol = buildIntervalProtocolFromHybridWorkout(hybridWorkout)
      if (protocol) return protocol
    }
  }

  return fallbackEventProtocol(event)
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(request)

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const event = await prisma.teamEvent.findFirst({
      where: { id: eventId, teamId },
      include: {
        intervalSession: { select: { id: true } },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.intervalSession?.id) {
      return NextResponse.json({ sessionId: event.intervalSession.id, created: false })
    }

    const members = await prisma.client.findMany({
      where: { teamId },
      select: { id: true },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
    })

    const protocol = await buildProtocolForEvent({ event, userId: user.id, request })
    const scheduledDate = event.startDate.toISOString()
    const scheduledTime = event.allDay ? undefined : scheduledTimeValue(event.startDate)

    const session = await createIntervalSession(user.id, {
      name: event.linkedWorkoutName || event.title,
      teamId,
      sportType: event.linkedWorkoutType === 'CARDIO' ? 'RUNNING' : team.sportType ?? 'ICE_HOCKEY',
      restMode: protocol.restDurationSeconds ? 'GROUP' : 'NONE',
      protocol,
      participantIds: members.map((member) => member.id),
      scheduledDate,
      scheduledTime,
    })

    await prisma.teamEvent.update({
      where: { id: event.id },
      data: { intervalSessionId: session.id },
    })

    return NextResponse.json({ sessionId: session.id, created: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error launching interval session from team event:', error)
    return NextResponse.json({ error: 'Failed to launch interval session' }, { status: 500 })
  }
}
