import type { Prisma } from '@prisma/client'

type TeamCalendarWorkoutType = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

interface BroadcastWorkoutShape {
  strengthSessionId: string | null
  cardioSessionId: string | null
  hybridWorkoutId: string | null
  agilityWorkoutId: string | null
}

function broadcastWorkoutType(broadcast: BroadcastWorkoutShape): TeamCalendarWorkoutType | null {
  if (broadcast.strengthSessionId) return 'STRENGTH'
  if (broadcast.cardioSessionId) return 'CARDIO'
  if (broadcast.hybridWorkoutId) return 'HYBRID'
  if (broadcast.agilityWorkoutId) return 'AGILITY'
  return null
}

export async function getResponsibleCoachIdForBroadcast(
  tx: Prisma.TransactionClient,
  broadcastId: string
) {
  const event = await tx.teamEvent.findFirst({
    where: { assignedBroadcastId: broadcastId },
    select: { responsibleCoachId: true },
    orderBy: [{ assignedAt: 'desc' }, { updatedAt: 'desc' }],
  })

  return event ? event.responsibleCoachId : undefined
}

export async function syncBroadcastAssignmentResponsibility({
  tx,
  broadcastId,
  responsibleCoachId,
}: {
  tx: Prisma.TransactionClient
  broadcastId: string
  responsibleCoachId: string | null
}) {
  const broadcast = await tx.teamWorkoutBroadcast.findUnique({
    where: { id: broadcastId },
    select: {
      strengthSessionId: true,
      cardioSessionId: true,
      hybridWorkoutId: true,
      agilityWorkoutId: true,
    },
  })

  if (!broadcast) return null

  const workoutType = broadcastWorkoutType(broadcast)
  if (!workoutType) return null

  const data = { responsibleCoachId }

  if (workoutType === 'STRENGTH') {
    const result = await tx.strengthSessionAssignment.updateMany({
      where: { teamBroadcastId: broadcastId },
      data,
    })
    return { workoutType, updatedCount: result.count }
  }

  if (workoutType === 'CARDIO') {
    const result = await tx.cardioSessionAssignment.updateMany({
      where: { teamBroadcastId: broadcastId },
      data,
    })
    return { workoutType, updatedCount: result.count }
  }

  if (workoutType === 'HYBRID') {
    const result = await tx.hybridWorkoutAssignment.updateMany({
      where: { teamBroadcastId: broadcastId },
      data,
    })
    return { workoutType, updatedCount: result.count }
  }

  const result = await tx.agilityWorkoutAssignment.updateMany({
    where: { teamBroadcastId: broadcastId },
    data,
  })
  return { workoutType, updatedCount: result.count }
}
