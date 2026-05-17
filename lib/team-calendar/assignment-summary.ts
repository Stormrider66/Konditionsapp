import { prisma } from '@/lib/prisma'

export interface TeamCalendarAssignmentSummary {
  id: string
  totalAssigned: number
  totalCompleted: number
  completionRate: number
  assignedDate: Date
  startTime: string | null
  endTime: string | null
  locationName: string | null
}

type CompletedGroup = {
  teamBroadcastId: string | null
  _count: { _all: number }
}

function addCompletedCounts(
  counts: Map<string, number>,
  groups: CompletedGroup[]
) {
  groups.forEach((group) => {
    if (!group.teamBroadcastId) return
    counts.set(group.teamBroadcastId, (counts.get(group.teamBroadcastId) ?? 0) + group._count._all)
  })
}

export async function getTeamCalendarAssignmentSummaries(
  broadcastIds: Array<string | null | undefined>
): Promise<Map<string, TeamCalendarAssignmentSummary>> {
  const ids = Array.from(new Set(broadcastIds.filter(Boolean) as string[]))
  if (ids.length === 0) return new Map()

  const [
    broadcasts,
    strengthCompleted,
    cardioCompleted,
    hybridCompleted,
    agilityCompleted,
  ] = await Promise.all([
    prisma.teamWorkoutBroadcast.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        assignedDate: true,
        startTime: true,
        endTime: true,
        locationName: true,
        totalAssigned: true,
        totalCompleted: true,
      },
    }),
    prisma.strengthSessionAssignment.groupBy({
      by: ['teamBroadcastId'],
      where: { teamBroadcastId: { in: ids }, status: 'COMPLETED' },
      _count: { _all: true },
    }),
    prisma.cardioSessionAssignment.groupBy({
      by: ['teamBroadcastId'],
      where: { teamBroadcastId: { in: ids }, status: 'COMPLETED' },
      _count: { _all: true },
    }),
    prisma.hybridWorkoutAssignment.groupBy({
      by: ['teamBroadcastId'],
      where: { teamBroadcastId: { in: ids }, status: 'COMPLETED' },
      _count: { _all: true },
    }),
    prisma.agilityWorkoutAssignment.groupBy({
      by: ['teamBroadcastId'],
      where: { teamBroadcastId: { in: ids }, status: 'COMPLETED' },
      _count: { _all: true },
    }),
  ])

  const completedCounts = new Map<string, number>()
  addCompletedCounts(completedCounts, strengthCompleted)
  addCompletedCounts(completedCounts, cardioCompleted)
  addCompletedCounts(completedCounts, hybridCompleted)
  addCompletedCounts(completedCounts, agilityCompleted)

  return new Map(
    broadcasts.map((broadcast) => {
      const countedCompleted = completedCounts.get(broadcast.id)
      const totalCompleted = countedCompleted ?? broadcast.totalCompleted
      const completionRate = broadcast.totalAssigned > 0
        ? Math.round((totalCompleted / broadcast.totalAssigned) * 100)
        : 0

      return [
        broadcast.id,
        {
          id: broadcast.id,
          totalAssigned: broadcast.totalAssigned,
          totalCompleted,
          completionRate,
          assignedDate: broadcast.assignedDate,
          startTime: broadcast.startTime,
          endTime: broadcast.endTime,
          locationName: broadcast.locationName,
        },
      ]
    })
  )
}
