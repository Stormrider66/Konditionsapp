import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'
import { getTeamCalendarWritableTeam } from '@/lib/team-calendar/permissions'
import { dbDateFromZonedCalendarDay } from '@/lib/team-calendar/date-time'
import { strengthSessionAccessWhere } from '@/lib/strength/session-business-scope'
import {
  agilityWorkoutAccessWhere,
  cardioSessionAccessWhere,
  hybridWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string; eventId: string }>
}

const assignFromEventSchema = z.object({
  notes: z.string().max(500).optional(),
})

function workoutTypeField(type: string) {
  if (type === 'STRENGTH') return 'strengthSessionId'
  if (type === 'CARDIO') return 'cardioSessionId'
  if (type === 'HYBRID') return 'hybridWorkoutId'
  if (type === 'AGILITY') return 'agilityWorkoutId'
  return null
}

function timeValue(date: Date | null, locale: 'en' | 'sv') {
  if (!date) return null
  return date.toLocaleTimeString(locale === 'sv' ? 'sv-SE' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const locale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const businessScope = await resolveWorkoutBusinessScope(user.id, req)

    if (!businessScope) {
      return NextResponse.json({ error: 'Business not found' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = assignFromEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const event = await prisma.teamEvent.findFirst({
      where: { id: eventId, teamId },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        allDay: true,
        linkedWorkoutType: true,
        linkedWorkoutId: true,
        linkedWorkoutName: true,
        assignedBroadcastId: true,
        type: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    if (event.assignedBroadcastId) {
      return NextResponse.json({ error: 'Event already assigned' }, { status: 409 })
    }
    if (!event.linkedWorkoutType || !event.linkedWorkoutId) {
      return NextResponse.json({ error: 'Event has no linked workout' }, { status: 400 })
    }

    const team = await getTeamCalendarWritableTeam(user.id, teamId, scope.businessSlug, event.type, 'assignContent')

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const workoutField = workoutTypeField(event.linkedWorkoutType)
    if (!workoutField) {
      return NextResponse.json({ error: 'Unsupported workout type' }, { status: 400 })
    }

    if (event.linkedWorkoutType === 'STRENGTH') {
      const session = await prisma.strengthSession.findFirst({
        where: {
          id: event.linkedWorkoutId,
          AND: [strengthSessionAccessWhere(user.id, businessScope.businessId)],
        },
        select: { id: true },
      })
      if (!session) return NextResponse.json({ error: 'Linked workout not found' }, { status: 404 })
    } else if (event.linkedWorkoutType === 'CARDIO') {
      const session = await prisma.cardioSession.findFirst({
        where: {
          id: event.linkedWorkoutId,
          AND: [cardioSessionAccessWhere(user.id, businessScope.businessId)],
        },
        select: { id: true },
      })
      if (!session) return NextResponse.json({ error: 'Linked workout not found' }, { status: 404 })
    } else if (event.linkedWorkoutType === 'HYBRID') {
      const workout = await prisma.hybridWorkout.findFirst({
        where: {
          id: event.linkedWorkoutId,
          AND: [hybridWorkoutAccessWhere(user.id, businessScope.businessId)],
        },
        select: { id: true },
      })
      if (!workout) return NextResponse.json({ error: 'Linked workout not found' }, { status: 404 })
    } else {
      const workout = await prisma.agilityWorkout.findFirst({
        where: {
          id: event.linkedWorkoutId,
          AND: [agilityWorkoutAccessWhere(user.id, businessScope.businessId)],
        },
        select: { id: true },
      })
      if (!workout) return NextResponse.json({ error: 'Linked workout not found' }, { status: 404 })
    }

    const teamWithMembers = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { id: true, name: true, businessId: true },
        },
      },
    })

    const eligibleMembers = teamWithMembers?.members.filter((member) => (
      businessScope.businessId ? member.businessId === businessScope.businessId : true
    )) ?? []

    if (!teamWithMembers || eligibleMembers.length === 0) {
      return NextResponse.json({ error: 'No team members to assign workout to' }, { status: 400 })
    }

    const assignedDate = dbDateFromZonedCalendarDay(event.startDate)
    const notes = parsed.data.notes || event.description || null
    const startTime = event.allDay ? null : timeValue(event.startDate, locale)
    const endTime = event.allDay ? null : timeValue(event.endDate, locale)

    const result = await prisma.$transaction(async (tx) => {
      const broadcast = await tx.teamWorkoutBroadcast.create({
        data: {
          teamId,
          coachId: user.id,
          strengthSessionId: workoutField === 'strengthSessionId' ? event.linkedWorkoutId : null,
          cardioSessionId: workoutField === 'cardioSessionId' ? event.linkedWorkoutId : null,
          hybridWorkoutId: workoutField === 'hybridWorkoutId' ? event.linkedWorkoutId : null,
          agilityWorkoutId: workoutField === 'agilityWorkoutId' ? event.linkedWorkoutId : null,
          assignedDate,
          notes,
          startTime,
          endTime,
          locationName: event.location || null,
          totalAssigned: eligibleMembers.length,
          totalCompleted: 0,
        },
      })

      if (event.linkedWorkoutType === 'STRENGTH') {
        await tx.strengthSessionAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            sessionId: event.linkedWorkoutId!,
            athleteId: member.id,
            assignedDate,
            assignedBy: user.id,
            notes,
            startTime,
            endTime,
            locationName: event.location || null,
            scheduledBy: startTime ? user.id : null,
            status: 'PENDING',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true,
        })
      } else if (event.linkedWorkoutType === 'CARDIO') {
        await tx.cardioSessionAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            sessionId: event.linkedWorkoutId!,
            athleteId: member.id,
            assignedDate,
            assignedBy: user.id,
            notes,
            startTime,
            endTime,
            locationName: event.location || null,
            scheduledBy: startTime ? user.id : null,
            status: 'PENDING',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true,
        })
      } else if (event.linkedWorkoutType === 'HYBRID') {
        await tx.hybridWorkoutAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            workoutId: event.linkedWorkoutId!,
            athleteId: member.id,
            assignedDate,
            assignedBy: user.id,
            notes,
            startTime,
            endTime,
            locationName: event.location || null,
            scheduledBy: startTime ? user.id : null,
            status: 'PENDING',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true,
        })
      } else {
        await tx.agilityWorkoutAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            workoutId: event.linkedWorkoutId!,
            athleteId: member.id,
            assignedDate,
            assignedBy: user.id,
            notes,
            startTime,
            endTime,
            locationName: event.location || null,
            scheduledBy: startTime ? user.id : null,
            status: 'ASSIGNED',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true,
        })
      }

      const updatedEvent = await tx.teamEvent.update({
        where: { id: event.id },
        data: {
          contentStatus: 'ASSIGNED',
          assignedBroadcastId: broadcast.id,
          assignedAt: new Date(),
        },
      })

      return { broadcast, event: updatedEvent }
    })

    await Promise.all(
      eligibleMembers.map((member) => invalidateUnifiedCalendarCacheForClient(member.id))
    )

    return NextResponse.json({
      success: true,
      broadcast: result.broadcast,
      event: result.event,
      assignmentCount: eligibleMembers.length,
      workoutName: event.linkedWorkoutName,
    }, { status: 201 })
  } catch (error) {
    console.error('Error assigning team event workout:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
