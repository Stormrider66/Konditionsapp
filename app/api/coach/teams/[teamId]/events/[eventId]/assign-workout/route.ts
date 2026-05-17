import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getWritableTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
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

function timeValue(date: Date | null) {
  if (!date) return null
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, eventId } = await context.params
    const scope = getRequestedBusinessScope(req)
    const team = await getWritableTeam(user.id, teamId, scope.businessSlug, 'events')

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
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

    const workoutField = workoutTypeField(event.linkedWorkoutType)
    if (!workoutField) {
      return NextResponse.json({ error: 'Unsupported workout type' }, { status: 400 })
    }

    const teamWithMembers = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { id: true, name: true },
        },
      },
    })

    if (!teamWithMembers || teamWithMembers.members.length === 0) {
      return NextResponse.json({ error: 'No team members to assign workout to' }, { status: 400 })
    }

    const assignedDate = new Date(event.startDate)
    assignedDate.setHours(0, 0, 0, 0)
    const notes = parsed.data.notes || event.description || null
    const startTime = event.allDay ? null : timeValue(event.startDate)
    const endTime = event.allDay ? null : timeValue(event.endDate)

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
          totalAssigned: teamWithMembers.members.length,
          totalCompleted: 0,
        },
      })

      if (event.linkedWorkoutType === 'STRENGTH') {
        await tx.strengthSessionAssignment.createMany({
          data: teamWithMembers.members.map((member) => ({
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
          data: teamWithMembers.members.map((member) => ({
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
          data: teamWithMembers.members.map((member) => ({
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
          data: teamWithMembers.members.map((member) => ({
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

    return NextResponse.json({
      success: true,
      broadcast: result.broadcast,
      event: result.event,
      assignmentCount: teamWithMembers.members.length,
      workoutName: event.linkedWorkoutName,
    }, { status: 201 })
  } catch (error) {
    console.error('Error assigning team event workout:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
