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
  athletes: TeamCalendarAssignmentAthlete[]
}

export interface TeamCalendarAssignmentAthlete {
  assignmentId: string
  athleteId: string
  athleteName: string
  jerseyNumber: number | null
  position: string | null
  workoutType: 'strength' | 'cardio' | 'hybrid' | 'agility'
  status: string
  completedAt: Date | null
  rpe: number | null
  duration: number | null
  notes: string | null
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
    strengthAssignments,
    cardioAssignments,
    hybridAssignments,
    agilityAssignments,
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
    prisma.strengthSessionAssignment.findMany({
      where: { teamBroadcastId: { in: ids } },
      select: {
        id: true,
        teamBroadcastId: true,
        athleteId: true,
        status: true,
        completedAt: true,
        rpe: true,
        duration: true,
        notes: true,
        athlete: { select: { name: true, jerseyNumber: true, position: true } },
      },
      orderBy: [{ athlete: { name: 'asc' } }],
    }),
    prisma.cardioSessionAssignment.findMany({
      where: { teamBroadcastId: { in: ids } },
      select: {
        id: true,
        teamBroadcastId: true,
        athleteId: true,
        status: true,
        completedAt: true,
        actualDuration: true,
        notes: true,
        athlete: { select: { name: true, jerseyNumber: true, position: true } },
      },
      orderBy: [{ athlete: { name: 'asc' } }],
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where: { teamBroadcastId: { in: ids } },
      select: {
        id: true,
        teamBroadcastId: true,
        athleteId: true,
        status: true,
        completedAt: true,
        notes: true,
        resultId: true,
        athlete: { select: { name: true, jerseyNumber: true, position: true } },
      },
      orderBy: [{ athlete: { name: 'asc' } }],
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where: { teamBroadcastId: { in: ids } },
      select: {
        id: true,
        teamBroadcastId: true,
        athleteId: true,
        status: true,
        completedAt: true,
        notes: true,
        athlete: { select: { name: true, jerseyNumber: true, position: true } },
      },
      orderBy: [{ athlete: { name: 'asc' } }],
    }),
  ])

  const cardioLogs = await prisma.cardioSessionLog.findMany({
    where: { assignmentId: { in: cardioAssignments.map((assignment) => assignment.id) } },
    select: {
      assignmentId: true,
      sessionRPE: true,
      actualDuration: true,
      notes: true,
      completedAt: true,
    },
  })

  const hybridResults = await prisma.hybridWorkoutResult.findMany({
    where: { id: { in: hybridAssignments.map((assignment) => assignment.resultId).filter(Boolean) as string[] } },
    select: {
      id: true,
      perceivedEffort: true,
      notes: true,
      completedAt: true,
    },
  })

  const completedCounts = new Map<string, number>()
  addCompletedCounts(completedCounts, strengthCompleted)
  addCompletedCounts(completedCounts, cardioCompleted)
  addCompletedCounts(completedCounts, hybridCompleted)
  addCompletedCounts(completedCounts, agilityCompleted)

  const athletesByBroadcast = new Map<string, TeamCalendarAssignmentAthlete[]>()
  const cardioLogsByAssignment = new Map(cardioLogs.map((log) => [log.assignmentId, log]))
  const hybridResultsById = new Map(hybridResults.map((result) => [result.id, result]))

  function addAthlete(broadcastId: string | null, athlete: TeamCalendarAssignmentAthlete) {
    if (!broadcastId) return
    const current = athletesByBroadcast.get(broadcastId) ?? []
    current.push(athlete)
    athletesByBroadcast.set(broadcastId, current)
  }

  strengthAssignments.forEach((assignment) => {
    addAthlete(assignment.teamBroadcastId, {
      assignmentId: assignment.id,
      athleteId: assignment.athleteId,
      athleteName: assignment.athlete.name,
      jerseyNumber: assignment.athlete.jerseyNumber,
      position: assignment.athlete.position,
      workoutType: 'strength',
      status: assignment.status,
      completedAt: assignment.completedAt,
      rpe: assignment.rpe,
      duration: assignment.duration,
      notes: assignment.notes,
    })
  })

  cardioAssignments.forEach((assignment) => {
    const log = cardioLogsByAssignment.get(assignment.id)
    addAthlete(assignment.teamBroadcastId, {
      assignmentId: assignment.id,
      athleteId: assignment.athleteId,
      athleteName: assignment.athlete.name,
      jerseyNumber: assignment.athlete.jerseyNumber,
      position: assignment.athlete.position,
      workoutType: 'cardio',
      status: assignment.status,
      completedAt: log?.completedAt ?? assignment.completedAt,
      rpe: log?.sessionRPE ?? null,
      duration: log?.actualDuration ?? assignment.actualDuration,
      notes: log?.notes ?? assignment.notes,
    })
  })

  hybridAssignments.forEach((assignment) => {
    const result = assignment.resultId ? hybridResultsById.get(assignment.resultId) : null
    addAthlete(assignment.teamBroadcastId, {
      assignmentId: assignment.id,
      athleteId: assignment.athleteId,
      athleteName: assignment.athlete.name,
      jerseyNumber: assignment.athlete.jerseyNumber,
      position: assignment.athlete.position,
      workoutType: 'hybrid',
      status: assignment.status,
      completedAt: result?.completedAt ?? assignment.completedAt,
      rpe: result?.perceivedEffort ?? null,
      duration: null,
      notes: result?.notes ?? assignment.notes,
    })
  })

  agilityAssignments.forEach((assignment) => {
    addAthlete(assignment.teamBroadcastId, {
      assignmentId: assignment.id,
      athleteId: assignment.athleteId,
      athleteName: assignment.athlete.name,
      jerseyNumber: assignment.athlete.jerseyNumber,
      position: assignment.athlete.position,
      workoutType: 'agility',
      status: assignment.status,
      completedAt: assignment.completedAt,
      rpe: null,
      duration: null,
      notes: assignment.notes,
    })
  })

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
          athletes: athletesByBroadcast.get(broadcast.id) ?? [],
        },
      ]
    })
  )
}
