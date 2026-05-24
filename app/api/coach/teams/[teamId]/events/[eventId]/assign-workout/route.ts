import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
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

type TeamCalendarWorkoutType = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

interface EligibleTeamMember {
  id: string
  name: string
  businessId: string | null
}

interface AssignmentEvent {
  linkedWorkoutType: TeamCalendarWorkoutType
  linkedWorkoutId: string
  location: string | null
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

function isTeamCalendarWorkoutType(type: string | null): type is TeamCalendarWorkoutType {
  return type === 'STRENGTH' || type === 'CARDIO' || type === 'HYBRID' || type === 'AGILITY'
}

function assignmentCreateData({
  event,
  member,
  assignedDate,
  assignedBy,
  notes,
  startTime,
  endTime,
  broadcastId,
}: {
  event: AssignmentEvent
  member: EligibleTeamMember
  assignedDate: Date
  assignedBy: string
  notes: string | null
  startTime: string | null
  endTime: string | null
  broadcastId: string
}) {
  return {
    athleteId: member.id,
    assignedDate,
    assignedBy,
    notes,
    startTime,
    endTime,
    locationName: event.location || null,
    scheduledBy: startTime ? assignedBy : null,
    teamBroadcastId: broadcastId,
  }
}

function assignmentAttachData({
  event,
  assignedBy,
  notes,
  startTime,
  endTime,
  broadcastId,
}: {
  event: AssignmentEvent
  assignedBy: string
  notes: string | null
  startTime: string | null
  endTime: string | null
  broadcastId: string
}) {
  return {
    ...(notes ? { notes } : {}),
    startTime,
    endTime,
    locationName: event.location || null,
    scheduledBy: startTime ? assignedBy : null,
    teamBroadcastId: broadcastId,
  }
}

async function getBroadcastAthleteIds(
  tx: Prisma.TransactionClient,
  type: TeamCalendarWorkoutType,
  broadcastId: string
): Promise<Set<string>> {
  if (type === 'STRENGTH') {
    const assignments = await tx.strengthSessionAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true },
    })
    return new Set(assignments.map((assignment) => assignment.athleteId))
  }
  if (type === 'CARDIO') {
    const assignments = await tx.cardioSessionAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true },
    })
    return new Set(assignments.map((assignment) => assignment.athleteId))
  }
  if (type === 'HYBRID') {
    const assignments = await tx.hybridWorkoutAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true },
    })
    return new Set(assignments.map((assignment) => assignment.athleteId))
  }

  const assignments = await tx.agilityWorkoutAssignment.findMany({
    where: { teamBroadcastId: broadcastId },
    select: { athleteId: true },
  })
  return new Set(assignments.map((assignment) => assignment.athleteId))
}

async function getBroadcastAssignmentStats(
  tx: Prisma.TransactionClient,
  type: TeamCalendarWorkoutType,
  broadcastId: string
) {
  if (type === 'STRENGTH') {
    const assignments = await tx.strengthSessionAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true, status: true },
    })
    return {
      athleteIds: new Set(assignments.map((assignment) => assignment.athleteId)),
      completedAthleteIds: new Set(assignments.filter((assignment) => assignment.status === 'COMPLETED').map((assignment) => assignment.athleteId)),
    }
  }
  if (type === 'CARDIO') {
    const assignments = await tx.cardioSessionAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true, status: true },
    })
    return {
      athleteIds: new Set(assignments.map((assignment) => assignment.athleteId)),
      completedAthleteIds: new Set(assignments.filter((assignment) => assignment.status === 'COMPLETED').map((assignment) => assignment.athleteId)),
    }
  }
  if (type === 'HYBRID') {
    const assignments = await tx.hybridWorkoutAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true, status: true },
    })
    return {
      athleteIds: new Set(assignments.map((assignment) => assignment.athleteId)),
      completedAthleteIds: new Set(assignments.filter((assignment) => assignment.status === 'COMPLETED').map((assignment) => assignment.athleteId)),
    }
  }

  const assignments = await tx.agilityWorkoutAssignment.findMany({
    where: { teamBroadcastId: broadcastId },
    select: { athleteId: true, status: true },
  })
  return {
    athleteIds: new Set(assignments.map((assignment) => assignment.athleteId)),
    completedAthleteIds: new Set(assignments.filter((assignment) => assignment.status === 'COMPLETED').map((assignment) => assignment.athleteId)),
  }
}

async function assignMissingMembersToBroadcast({
  tx,
  event,
  broadcastId,
  members,
  assignedDate,
  assignedBy,
  notes,
  startTime,
  endTime,
}: {
  tx: Prisma.TransactionClient
  event: AssignmentEvent
  broadcastId: string
  members: EligibleTeamMember[]
  assignedDate: Date
  assignedBy: string
  notes: string | null
  startTime: string | null
  endTime: string | null
}) {
  if (members.length === 0) return

  const athleteIds = members.map((member) => member.id)
  const attachData = assignmentAttachData({ event, assignedBy, notes, startTime, endTime, broadcastId })

  if (event.linkedWorkoutType === 'STRENGTH') {
    await tx.strengthSessionAssignment.updateMany({
      where: {
        sessionId: event.linkedWorkoutId,
        athleteId: { in: athleteIds },
        assignedDate,
        teamBroadcastId: null,
      },
      data: attachData,
    })
    await tx.strengthSessionAssignment.createMany({
      data: members.map((member) => ({
        sessionId: event.linkedWorkoutId,
        ...assignmentCreateData({ event, member, assignedDate, assignedBy, notes, startTime, endTime, broadcastId }),
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })
    return
  }

  if (event.linkedWorkoutType === 'CARDIO') {
    await tx.cardioSessionAssignment.updateMany({
      where: {
        sessionId: event.linkedWorkoutId,
        athleteId: { in: athleteIds },
        assignedDate,
        teamBroadcastId: null,
      },
      data: attachData,
    })
    await tx.cardioSessionAssignment.createMany({
      data: members.map((member) => ({
        sessionId: event.linkedWorkoutId,
        ...assignmentCreateData({ event, member, assignedDate, assignedBy, notes, startTime, endTime, broadcastId }),
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })
    return
  }

  if (event.linkedWorkoutType === 'HYBRID') {
    await tx.hybridWorkoutAssignment.updateMany({
      where: {
        workoutId: event.linkedWorkoutId,
        athleteId: { in: athleteIds },
        assignedDate,
        teamBroadcastId: null,
      },
      data: attachData,
    })
    await tx.hybridWorkoutAssignment.createMany({
      data: members.map((member) => ({
        workoutId: event.linkedWorkoutId,
        ...assignmentCreateData({ event, member, assignedDate, assignedBy, notes, startTime, endTime, broadcastId }),
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })
    return
  }

  await tx.agilityWorkoutAssignment.updateMany({
    where: {
      workoutId: event.linkedWorkoutId,
      athleteId: { in: athleteIds },
      assignedDate,
      teamBroadcastId: null,
    },
    data: attachData,
  })
  await tx.agilityWorkoutAssignment.createMany({
    data: members.map((member) => ({
      workoutId: event.linkedWorkoutId,
      ...assignmentCreateData({ event, member, assignedDate, assignedBy, notes, startTime, endTime, broadcastId }),
      status: 'ASSIGNED',
    })),
    skipDuplicates: true,
  })
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
    if (!isTeamCalendarWorkoutType(event.linkedWorkoutType) || !event.linkedWorkoutId) {
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
          select: { id: true, name: true, businessId: true, athleteAccount: { select: { id: true } } },
        },
      },
    })

    const eligibleMembers = teamWithMembers?.members.filter((member) => (
      Boolean(member.athleteAccount) && (businessScope.businessId ? member.businessId === businessScope.businessId : true)
    )) ?? []

    if (!teamWithMembers || eligibleMembers.length === 0) {
      return NextResponse.json({ error: 'No team members to assign workout to' }, { status: 400 })
    }
    const eligibleAthleteIds = new Set(eligibleMembers.map((member) => member.id))

    const assignedDate = dbDateFromZonedCalendarDay(event.startDate)
    const notes = parsed.data.notes || event.description || null
    const startTime = event.allDay ? null : timeValue(event.startDate, locale)
    const endTime = event.allDay ? null : timeValue(event.endDate, locale)
    const assignmentEvent: AssignmentEvent = {
      linkedWorkoutType: event.linkedWorkoutType,
      linkedWorkoutId: event.linkedWorkoutId,
      location: event.location,
    }

    const result = await prisma.$transaction(async (tx) => {
      const broadcast = event.assignedBroadcastId
        ? await tx.teamWorkoutBroadcast.findFirst({
            where: { id: event.assignedBroadcastId, teamId },
            select: {
              id: true,
              strengthSessionId: true,
              cardioSessionId: true,
              hybridWorkoutId: true,
              agilityWorkoutId: true,
            },
          })
        : await tx.teamWorkoutBroadcast.create({
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
              totalAssigned: 0,
              totalCompleted: 0,
            },
        })

      if (!broadcast) {
        throw new Error('ASSIGNED_BROADCAST_NOT_FOUND')
      }

      const broadcastMatchesWorkout =
        (assignmentEvent.linkedWorkoutType === 'STRENGTH' && broadcast.strengthSessionId === assignmentEvent.linkedWorkoutId) ||
        (assignmentEvent.linkedWorkoutType === 'CARDIO' && broadcast.cardioSessionId === assignmentEvent.linkedWorkoutId) ||
        (assignmentEvent.linkedWorkoutType === 'HYBRID' && broadcast.hybridWorkoutId === assignmentEvent.linkedWorkoutId) ||
        (assignmentEvent.linkedWorkoutType === 'AGILITY' && broadcast.agilityWorkoutId === assignmentEvent.linkedWorkoutId)

      if (!broadcastMatchesWorkout) {
        throw new Error('ASSIGNED_BROADCAST_MISMATCH')
      }

      const beforeAthleteIds = await getBroadcastAthleteIds(tx, assignmentEvent.linkedWorkoutType, broadcast.id)
      const missingMembers = eligibleMembers.filter((member) => !beforeAthleteIds.has(member.id))

      await assignMissingMembersToBroadcast({
        tx,
        event: assignmentEvent,
        broadcastId: broadcast.id,
        members: missingMembers,
        assignedDate,
        assignedBy: user.id,
        notes,
        startTime,
        endTime,
      })

      const stats = await getBroadcastAssignmentStats(tx, assignmentEvent.linkedWorkoutType, broadcast.id)
      const activeAssignedAthleteIds = new Set(
        Array.from(stats.athleteIds).filter((athleteId) => eligibleAthleteIds.has(athleteId))
      )
      const activeCompletedCount = Array.from(stats.completedAthleteIds)
        .filter((athleteId) => eligibleAthleteIds.has(athleteId))
        .length

      if (!event.assignedBroadcastId && activeAssignedAthleteIds.size === 0) {
        throw new Error('NO_ASSIGNMENTS_CREATED')
      }

      const updatedBroadcast = await tx.teamWorkoutBroadcast.update({
        where: { id: broadcast.id },
        data: {
          totalAssigned: eligibleMembers.length,
          totalCompleted: activeCompletedCount,
        },
      })

      const updatedEvent = event.assignedBroadcastId
        ? event
        : await tx.teamEvent.update({
            where: { id: event.id },
            data: {
              contentStatus: 'ASSIGNED',
              assignedBroadcastId: broadcast.id,
              assignedAt: new Date(),
            },
          })

      const newlyAssignedAthleteIds = Array.from(activeAssignedAthleteIds)
        .filter((athleteId) => !beforeAthleteIds.has(athleteId))

      return {
        broadcast: updatedBroadcast,
        event: updatedEvent,
        assignmentCount: newlyAssignedAthleteIds.length,
        assignedAthleteIds: newlyAssignedAthleteIds,
        createdBroadcast: !event.assignedBroadcastId,
      }
    })

    await Promise.all(
      result.assignedAthleteIds.map((athleteId) => invalidateUnifiedCalendarCacheForClient(athleteId))
    )

    return NextResponse.json({
      success: true,
      broadcast: result.broadcast,
      event: result.event,
      assignmentCount: result.assignmentCount,
      totalAssigned: result.broadcast.totalAssigned,
      createdBroadcast: result.createdBroadcast,
      workoutName: event.linkedWorkoutName,
    }, { status: result.createdBroadcast ? 201 : 200 })
  } catch (error) {
    if (error instanceof Error && error.message === 'ASSIGNED_BROADCAST_NOT_FOUND') {
      return NextResponse.json({ error: 'Assigned workout broadcast not found' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'ASSIGNED_BROADCAST_MISMATCH') {
      return NextResponse.json({ error: 'Assigned workout does not match the linked workout' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'NO_ASSIGNMENTS_CREATED') {
      return NextResponse.json({ error: 'No eligible team members could be assigned' }, { status: 409 })
    }
    console.error('Error assigning team event workout:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
