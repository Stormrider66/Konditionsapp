import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  getResponsibleCoachIdForBroadcast,
  syncBroadcastAssignmentResponsibility,
} from '@/lib/team-calendar/assignment-responsibility'

type TeamCalendarWorkoutType = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

interface SyncBroadcastRosterOptions {
  businessId?: string | null
  assignedBy?: string
}

interface SyncableBroadcast {
  id: string
  coachId: string
  assignedDate: Date
  notes: string | null
  startTime: string | null
  endTime: string | null
  locationId: string | null
  locationName: string | null
  strengthSessionId: string | null
  cardioSessionId: string | null
  hybridWorkoutId: string | null
  agilityWorkoutId: string | null
}

function activeTeamMemberWhere(businessId?: string | null): Prisma.ClientWhereInput {
  return {
    ...(businessId ? { businessId } : {}),
    athleteAccount: { isNot: null },
  }
}

function resolveBroadcastWorkout(broadcast: SyncableBroadcast): { type: TeamCalendarWorkoutType; id: string } | null {
  if (broadcast.strengthSessionId) return { type: 'STRENGTH', id: broadcast.strengthSessionId }
  if (broadcast.cardioSessionId) return { type: 'CARDIO', id: broadcast.cardioSessionId }
  if (broadcast.hybridWorkoutId) return { type: 'HYBRID', id: broadcast.hybridWorkoutId }
  if (broadcast.agilityWorkoutId) return { type: 'AGILITY', id: broadcast.agilityWorkoutId }
  return null
}

function assignmentBaseData({
  broadcast,
  athleteId,
  assignedBy,
  responsibleCoachId,
}: {
  broadcast: SyncableBroadcast
  athleteId: string
  assignedBy: string
  responsibleCoachId?: string | null
}) {
  return {
    athleteId,
    assignedDate: broadcast.assignedDate,
    assignedBy,
    notes: broadcast.notes,
    startTime: broadcast.startTime,
    endTime: broadcast.endTime,
    locationId: broadcast.locationId,
    locationName: broadcast.locationName,
    scheduledBy: broadcast.startTime ? assignedBy : null,
    ...(responsibleCoachId !== undefined ? { responsibleCoachId } : {}),
    teamBroadcastId: broadcast.id,
  }
}

function assignmentAttachData({
  broadcast,
  assignedBy,
  responsibleCoachId,
}: {
  broadcast: SyncableBroadcast
  assignedBy: string
  responsibleCoachId?: string | null
}) {
  return {
    ...(broadcast.notes ? { notes: broadcast.notes } : {}),
    startTime: broadcast.startTime,
    endTime: broadcast.endTime,
    locationId: broadcast.locationId,
    locationName: broadcast.locationName,
    scheduledBy: broadcast.startTime ? assignedBy : null,
    ...(responsibleCoachId !== undefined ? { responsibleCoachId } : {}),
    teamBroadcastId: broadcast.id,
  }
}

async function getBroadcastAssignments(
  tx: Prisma.TransactionClient,
  type: TeamCalendarWorkoutType,
  broadcastId: string
) {
  if (type === 'STRENGTH') {
    return tx.strengthSessionAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true, status: true },
    })
  }
  if (type === 'CARDIO') {
    return tx.cardioSessionAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true, status: true },
    })
  }
  if (type === 'HYBRID') {
    return tx.hybridWorkoutAssignment.findMany({
      where: { teamBroadcastId: broadcastId },
      select: { athleteId: true, status: true },
    })
  }

  return tx.agilityWorkoutAssignment.findMany({
    where: { teamBroadcastId: broadcastId },
    select: { athleteId: true, status: true },
  })
}

async function attachExistingUnbroadcastAssignments({
  tx,
  broadcast,
  workout,
  athleteIds,
  assignedBy,
  responsibleCoachId,
}: {
  tx: Prisma.TransactionClient
  broadcast: SyncableBroadcast
  workout: { type: TeamCalendarWorkoutType; id: string }
  athleteIds: string[]
  assignedBy: string
  responsibleCoachId?: string | null
}) {
  if (athleteIds.length === 0) return

  const data = assignmentAttachData({ broadcast, assignedBy, responsibleCoachId })

  if (workout.type === 'STRENGTH') {
    await tx.strengthSessionAssignment.updateMany({
      where: {
        sessionId: workout.id,
        athleteId: { in: athleteIds },
        assignedDate: broadcast.assignedDate,
        teamBroadcastId: null,
      },
      data,
    })
    return
  }

  if (workout.type === 'CARDIO') {
    await tx.cardioSessionAssignment.updateMany({
      where: {
        sessionId: workout.id,
        athleteId: { in: athleteIds },
        assignedDate: broadcast.assignedDate,
        teamBroadcastId: null,
      },
      data,
    })
    return
  }

  if (workout.type === 'HYBRID') {
    await tx.hybridWorkoutAssignment.updateMany({
      where: {
        workoutId: workout.id,
        athleteId: { in: athleteIds },
        assignedDate: broadcast.assignedDate,
        teamBroadcastId: null,
      },
      data,
    })
    return
  }

  await tx.agilityWorkoutAssignment.updateMany({
    where: {
      workoutId: workout.id,
      athleteId: { in: athleteIds },
      assignedDate: broadcast.assignedDate,
      teamBroadcastId: null,
    },
    data,
  })
}

async function createMissingAssignments({
  tx,
  broadcast,
  workout,
  athleteIds,
  assignedBy,
  responsibleCoachId,
}: {
  tx: Prisma.TransactionClient
  broadcast: SyncableBroadcast
  workout: { type: TeamCalendarWorkoutType; id: string }
  athleteIds: string[]
  assignedBy: string
  responsibleCoachId?: string | null
}) {
  if (athleteIds.length === 0) return

  if (workout.type === 'STRENGTH') {
    await tx.strengthSessionAssignment.createMany({
      data: athleteIds.map((athleteId) => ({
        sessionId: workout.id,
        ...assignmentBaseData({ broadcast, athleteId, assignedBy, responsibleCoachId }),
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })
    return
  }

  if (workout.type === 'CARDIO') {
    await tx.cardioSessionAssignment.createMany({
      data: athleteIds.map((athleteId) => ({
        sessionId: workout.id,
        ...assignmentBaseData({ broadcast, athleteId, assignedBy, responsibleCoachId }),
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })
    return
  }

  if (workout.type === 'HYBRID') {
    await tx.hybridWorkoutAssignment.createMany({
      data: athleteIds.map((athleteId) => ({
        workoutId: workout.id,
        ...assignmentBaseData({ broadcast, athleteId, assignedBy, responsibleCoachId }),
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })
    return
  }

  await tx.agilityWorkoutAssignment.createMany({
    data: athleteIds.map((athleteId) => ({
      workoutId: workout.id,
      ...assignmentBaseData({ broadcast, athleteId, assignedBy, responsibleCoachId }),
      status: 'ASSIGNED',
    })),
    skipDuplicates: true,
  })
}

export async function syncTeamWorkoutBroadcastRoster(
  broadcastId: string,
  options: SyncBroadcastRosterOptions = {}
) {
  return prisma.$transaction(async (tx) => {
    const broadcast = await tx.teamWorkoutBroadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        coachId: true,
        assignedDate: true,
        notes: true,
        startTime: true,
        endTime: true,
        locationId: true,
        locationName: true,
        strengthSessionId: true,
        cardioSessionId: true,
        hybridWorkoutId: true,
        agilityWorkoutId: true,
        team: {
          select: {
            members: {
              where: activeTeamMemberWhere(options.businessId),
              select: { id: true },
            },
          },
        },
      },
    })

    if (!broadcast) return null

    const workout = resolveBroadcastWorkout(broadcast)
    if (!workout) return null

    const assignedBy = options.assignedBy ?? broadcast.coachId
    const responsibleCoachId = await getResponsibleCoachIdForBroadcast(tx, broadcast.id)
    const activeAthleteIds = broadcast.team.members.map((member) => member.id)
    const activeAthleteIdSet = new Set(activeAthleteIds)
    const existingAssignments = await getBroadcastAssignments(tx, workout.type, broadcast.id)
    const existingAthleteIds = new Set(existingAssignments.map((assignment) => assignment.athleteId))
    const missingAthleteIds = activeAthleteIds.filter((athleteId) => !existingAthleteIds.has(athleteId))

    await attachExistingUnbroadcastAssignments({
      tx,
      broadcast,
      workout,
      athleteIds: missingAthleteIds,
      assignedBy,
      responsibleCoachId,
    })

    await createMissingAssignments({
      tx,
      broadcast,
      workout,
      athleteIds: missingAthleteIds,
      assignedBy,
      responsibleCoachId,
    })

    if (responsibleCoachId !== undefined) {
      await syncBroadcastAssignmentResponsibility({
        tx,
        broadcastId: broadcast.id,
        responsibleCoachId,
      })
    }

    const updatedAssignments = await getBroadcastAssignments(tx, workout.type, broadcast.id)
    const activeAssignments = updatedAssignments.filter((assignment) => activeAthleteIdSet.has(assignment.athleteId))
    const totalCompleted = activeAssignments.filter((assignment) => assignment.status === 'COMPLETED').length

    await tx.teamWorkoutBroadcast.update({
      where: { id: broadcast.id },
      data: {
        totalAssigned: activeAthleteIds.length,
        totalCompleted,
      },
    })

    return {
      broadcastId: broadcast.id,
      totalAssigned: activeAthleteIds.length,
      totalCompleted,
      missingAdded: Math.max(0, activeAssignments.length - existingAssignments.filter((assignment) => activeAthleteIdSet.has(assignment.athleteId)).length),
    }
  })
}

export async function syncTeamWorkoutBroadcastRosters(
  broadcastIds: Array<string | null | undefined>,
  options: SyncBroadcastRosterOptions = {}
) {
  const ids = Array.from(new Set(broadcastIds.filter(Boolean) as string[]))
  if (ids.length === 0) return []

  const results = []
  for (const id of ids) {
    results.push(await syncTeamWorkoutBroadcastRoster(id, options))
  }
  return results
}
