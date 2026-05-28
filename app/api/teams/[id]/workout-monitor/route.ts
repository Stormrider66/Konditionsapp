import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { logger } from '@/lib/logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

type WorkoutKind = 'strength' | 'cardio' | 'hybrid' | 'agility' | 'interval'
type DetailKind = 'broadcast' | 'interval'

type ExerciseRow = {
  athleteId: string
  athleteName: string
  exerciseName: string
  setNumber: number
  loadKg: number | null
  reps: string | number | null
  rpe: number | null
  meanVelocity: number | null
  peakVelocity: number | null
  meanPower: number | null
  peakPower: number | null
  meanTime: number | null
  peakTime: number | null
  estimated1RM: number | null
  note: string | null
}

type IntervalRow = {
  athleteId: string
  athleteName: string
  label: string
  planned: string | null
  actual: string | null
  pace: string | null
  power: string | null
  heartRate: string | null
  status: string
  note: string | null
}

function clampDays(value: string | null) {
  const days = Number(value || 30)
  if ([7, 30, 90].includes(days)) return days
  return 30
}

function rangeStart(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

function isCompleted(row: { status?: string | null; completedAt?: Date | null; resultId?: string | null }) {
  return row.status === 'COMPLETED' || Boolean(row.completedAt) || Boolean(row.resultId)
}

function isMissed(row: { status?: string | null; completedAt?: Date | null; resultId?: string | null }, date: Date) {
  if (isCompleted(row)) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function completionRate(completed: number, assigned: number) {
  return assigned > 0 ? Math.round((completed / assigned) * 100) : 0
}

function average(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (nums.length === 0) return null
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10
}

function formatSeconds(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function formatPace(seconds?: number | null) {
  const formatted = formatSeconds(seconds)
  return formatted ? `${formatted}/km` : null
}

function formatDistanceKm(km?: number | null) {
  if (!km || km <= 0) return null
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`
}

function exerciseName(
  exercise: { name: string; nameSv: string | null; nameEn: string | null }
) {
  return exercise.nameSv || exercise.nameEn || exercise.name
}

function plannedSegmentLabel(segment: {
  plannedDuration: number | null
  plannedDistance: number | null
  plannedPace: number | null
  plannedZone: number | null
}) {
  const parts = [
    formatSeconds(segment.plannedDuration),
    formatDistanceKm(segment.plannedDistance),
    formatPace(segment.plannedPace),
    segment.plannedZone ? `Z${segment.plannedZone}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

function intervalProtocolCount(protocol: unknown) {
  if (!protocol || typeof protocol !== 'object') return null
  const count = (protocol as { intervalCount?: unknown }).intervalCount
  return typeof count === 'number' && Number.isFinite(count) ? count : null
}

function intervalProtocolStepLabel(protocol: unknown, intervalNumber: number) {
  if (!protocol || typeof protocol !== 'object') return null
  const steps = (protocol as { steps?: Array<{ label?: string }> }).steps
  return steps?.[intervalNumber - 1]?.label ?? null
}

async function getBusinessId(userId: string, businessSlug?: string) {
  if (!businessSlug) return null
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      business: { slug: businessSlug, isActive: true },
    },
    select: { businessId: true },
  })
  return membership?.businessId ?? null
}

async function getTeamContext(userId: string, teamId: string, businessSlug?: string) {
  const accessibleTeam = await getAccessibleTeam(userId, teamId, businessSlug)
  if (!accessibleTeam) return null

  const businessId = await getBusinessId(userId, businessSlug)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      members: {
        where: {
          athleteAccount: { isNot: null },
          ...(businessId ? { businessId } : {}),
        },
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          position: true,
        },
        orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
      },
    },
  })

  if (!team) return null
  return { team, businessId }
}

function sourceForBroadcast(broadcast: {
  strengthSessionId: string | null
  cardioSessionId: string | null
  hybridWorkoutId: string | null
  agilityWorkoutId: string | null
  strengthSession?: { id: string; name: string } | null
  cardioSession?: { id: string; name: string } | null
  hybridWorkout?: { id: string; name: string } | null
  agilityWorkout?: { id: string; name: string } | null
}) {
  if (broadcast.strengthSessionId) {
    return { kind: 'strength' as const, sourceId: broadcast.strengthSessionId, name: broadcast.strengthSession?.name ?? 'Strength' }
  }
  if (broadcast.cardioSessionId) {
    return { kind: 'cardio' as const, sourceId: broadcast.cardioSessionId, name: broadcast.cardioSession?.name ?? 'Cardio' }
  }
  if (broadcast.hybridWorkoutId) {
    return { kind: 'hybrid' as const, sourceId: broadcast.hybridWorkoutId, name: broadcast.hybridWorkout?.name ?? 'Hybrid' }
  }
  return { kind: 'agility' as const, sourceId: broadcast.agilityWorkoutId, name: broadcast.agilityWorkout?.name ?? 'Agility' }
}

async function buildBroadcastDetail(broadcastId: string, activeMemberIds: Set<string>) {
  const broadcast = await prisma.teamWorkoutBroadcast.findUnique({
    where: { id: broadcastId },
    include: {
      strengthSession: { select: { id: true, name: true } },
      cardioSession: { select: { id: true, name: true } },
      hybridWorkout: { select: { id: true, name: true } },
      agilityWorkout: { select: { id: true, name: true } },
    },
  })
  if (!broadcast) return null

  const source = sourceForBroadcast(broadcast)
  const [strength, cardio, hybrid, agility] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where: { teamBroadcastId: broadcast.id, athleteId: { in: [...activeMemberIds] } },
      include: {
        athlete: { select: { id: true, name: true, jerseyNumber: true, position: true } },
        setLogs: {
          orderBy: [{ exercise: { name: 'asc' } }, { setNumber: 'asc' }],
          include: { exercise: { select: { name: true, nameSv: true, nameEn: true } } },
        },
      },
    }),
    prisma.cardioSessionAssignment.findMany({
      where: { teamBroadcastId: broadcast.id, athleteId: { in: [...activeMemberIds] } },
      include: {
        athlete: { select: { id: true, name: true, jerseyNumber: true, position: true } },
      },
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where: { teamBroadcastId: broadcast.id, athleteId: { in: [...activeMemberIds] } },
      include: {
        athlete: { select: { id: true, name: true, jerseyNumber: true, position: true } },
      },
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where: { teamBroadcastId: broadcast.id, athleteId: { in: [...activeMemberIds] } },
      include: {
        athlete: { select: { id: true, name: true, jerseyNumber: true, position: true } },
      },
    }),
  ])

  const assignments = [
    ...strength.map((assignment) => ({ kind: 'strength' as const, assignment })),
    ...cardio.map((assignment) => ({ kind: 'cardio' as const, assignment })),
    ...hybrid.map((assignment) => ({ kind: 'hybrid' as const, assignment })),
    ...agility.map((assignment) => ({ kind: 'agility' as const, assignment })),
  ]

  const resultIds = hybrid.map((assignment) => assignment.resultId).filter(Boolean) as string[]
  const [hybridResults, cardioLogs] = await Promise.all([
    resultIds.length > 0
      ? prisma.hybridWorkoutResult.findMany({
          where: { id: { in: resultIds } },
          select: {
            id: true,
            completedAt: true,
            perceivedEffort: true,
            timeScore: true,
            roundsCompleted: true,
            repsCompleted: true,
            loadUsed: true,
            scalingLevel: true,
            notes: true,
          },
        })
      : Promise.resolve([]),
    cardio.length > 0
      ? prisma.cardioSessionLog.findMany({
          where: { assignmentId: { in: cardio.map((assignment) => assignment.id) } },
          orderBy: { startedAt: 'desc' },
          include: { segmentLogs: { orderBy: { segmentIndex: 'asc' } } },
        })
      : Promise.resolve([]),
  ])
  const hybridResultById = new Map(hybridResults.map((result) => [result.id, result]))
  const cardioLogByAssignment = new Map<string, (typeof cardioLogs)[number]>()
  cardioLogs.forEach((log) => {
    if (log.assignmentId && !cardioLogByAssignment.has(log.assignmentId)) {
      cardioLogByAssignment.set(log.assignmentId, log)
    }
  })

  const athletes = assignments.map(({ kind, assignment }) => {
    const cardioLog = kind === 'cardio' ? cardioLogByAssignment.get(assignment.id) : null
    const hybridResult = kind === 'hybrid' && assignment.resultId ? hybridResultById.get(assignment.resultId) : null
    const duration = kind === 'strength'
      ? assignment.duration ? assignment.duration * 60 : null
      : kind === 'cardio'
        ? cardioLog?.actualDuration ?? assignment.actualDuration
        : kind === 'hybrid'
          ? hybridResult?.timeScore ?? null
          : null
    const rpe = kind === 'strength'
      ? assignment.rpe
      : kind === 'cardio'
        ? cardioLog?.sessionRPE ?? null
        : kind === 'hybrid'
          ? hybridResult?.perceivedEffort ?? null
          : null

    return {
      assignmentId: assignment.id,
      athleteId: assignment.athleteId,
      athleteName: assignment.athlete.name,
      jerseyNumber: assignment.athlete.jerseyNumber,
      position: assignment.athlete.position,
      kind,
      status: assignment.status,
      completedAt: (hybridResult?.completedAt ?? cardioLog?.completedAt ?? assignment.completedAt)?.toISOString() ?? null,
      isCompleted: isCompleted({ status: assignment.status, completedAt: assignment.completedAt, resultId: kind === 'hybrid' ? assignment.resultId : null }),
      rpe,
      durationSeconds: duration,
      notes: hybridResult?.notes ?? cardioLog?.notes ?? assignment.notes,
    }
  })

  const exerciseRows: ExerciseRow[] = strength.flatMap((assignment) =>
    assignment.setLogs.map((setLog) => ({
      athleteId: assignment.athleteId,
      athleteName: assignment.athlete.name,
      exerciseName: exerciseName(setLog.exercise),
      setNumber: setLog.setNumber,
      loadKg: setLog.weight,
      reps: setLog.repsTarget ? `${setLog.repsCompleted}/${setLog.repsTarget}` : setLog.repsCompleted,
      rpe: setLog.rpe,
      meanVelocity: setLog.meanVelocity,
      peakVelocity: setLog.peakVelocity,
      meanPower: setLog.meanPower,
      peakPower: setLog.peakPower,
      meanTime: setLog.meanTime,
      peakTime: setLog.peakTime,
      estimated1RM: setLog.estimated1RM,
      note: setLog.notes,
    }))
  )

  const intervalRows: IntervalRow[] = cardio.flatMap((assignment) => {
    const log = cardioLogByAssignment.get(assignment.id)
    return (log?.segmentLogs ?? []).map((segment) => ({
      athleteId: assignment.athleteId,
      athleteName: assignment.athlete.name,
      label: `${segment.segmentIndex + 1}. ${segment.segmentType}`,
      planned: plannedSegmentLabel(segment),
      actual: [
        formatSeconds(segment.actualDuration),
        formatDistanceKm(segment.actualDistance),
      ].filter(Boolean).join(' · ') || null,
      pace: formatPace(segment.actualPace),
      power: null,
      heartRate: [
        segment.actualAvgHR ? `avg ${segment.actualAvgHR}` : null,
        segment.actualMaxHR ? `max ${segment.actualMaxHR}` : null,
      ].filter(Boolean).join(' · ') || null,
      status: segment.skipped ? 'SKIPPED' : segment.completed ? 'COMPLETED' : 'PENDING',
      note: segment.notes,
    }))
  })

  const completed = athletes.filter((athlete) => athlete.isCompleted).length
  const assigned = athletes.length
  return {
    id: broadcast.id,
    kind: 'broadcast' as DetailKind,
    workoutKind: source.kind,
    workoutName: source.name,
    assignedDate: broadcast.assignedDate.toISOString(),
    overview: {
      assigned,
      completed,
      missing: Math.max(0, activeMemberIds.size - assigned),
      completionRate: completionRate(completed, assigned),
      avgRpe: average(athletes.map((athlete) => athlete.rpe)),
      avgDurationSeconds: average(athletes.map((athlete) => athlete.durationSeconds)),
      notes: broadcast.notes,
    },
    athletes,
    exerciseRows,
    intervalRows,
  }
}

async function buildIntervalDetail(sessionId: string, activeMemberIds: Set<string>) {
  const session = await prisma.intervalSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        where: { clientId: { in: [...activeMemberIds] } },
        include: {
          client: { select: { id: true, name: true, jerseyNumber: true, position: true } },
          laps: { orderBy: { intervalNumber: 'asc' } },
          lactates: { orderBy: { intervalNumber: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
  if (!session) return null

  const expectedIntervals = intervalProtocolCount(session.protocol)
  const athletes = session.participants.map((participant) => {
    const completed = expectedIntervals ? participant.laps.length >= expectedIntervals : participant.laps.length > 0 && session.status === 'ENDED'
    return {
      assignmentId: participant.id,
      athleteId: participant.clientId,
      athleteName: participant.client.name,
      jerseyNumber: participant.client.jerseyNumber,
      position: participant.client.position,
      kind: 'interval' as WorkoutKind,
      status: completed ? 'COMPLETED' : session.status,
      completedAt: completed ? participant.laps.at(-1)?.recordedAt.toISOString() ?? session.endedAt?.toISOString() ?? null : null,
      isCompleted: completed,
      rpe: null,
      durationSeconds: participant.laps.length > 0 ? Math.round(participant.laps.reduce((sum, lap) => sum + lap.splitTimeMs, 0) / 1000) : null,
      notes: null,
    }
  })

  const intervalRows: IntervalRow[] = session.participants.flatMap((participant) =>
    participant.laps.map((lap) => ({
      athleteId: participant.clientId,
      athleteName: participant.client.name,
      label: intervalProtocolStepLabel(session.protocol, lap.intervalNumber) ?? `Intervall ${lap.intervalNumber}`,
      planned: null,
      actual: formatSeconds(Math.round(lap.splitTimeMs / 1000)),
      pace: null,
      power: null,
      heartRate: null,
      status: 'COMPLETED',
      note: participant.lactates.find((lactate) => lactate.intervalNumber === lap.intervalNumber)
        ? `Laktat ${participant.lactates.find((lactate) => lactate.intervalNumber === lap.intervalNumber)?.lactate} mmol/L`
        : null,
    }))
  )

  const completed = athletes.filter((athlete) => athlete.isCompleted).length
  const assigned = athletes.length
  return {
    id: session.id,
    kind: 'interval' as DetailKind,
    workoutKind: 'interval' as WorkoutKind,
    workoutName: session.name ?? 'Intervallpass',
    assignedDate: (session.scheduledDate ?? session.startedAt).toISOString(),
    overview: {
      assigned,
      completed,
      missing: Math.max(0, activeMemberIds.size - assigned),
      completionRate: completionRate(completed, assigned),
      avgRpe: null,
      avgDurationSeconds: average(athletes.map((athlete) => athlete.durationSeconds)),
      notes: null,
    },
    athletes,
    exerciseRows: [] as ExerciseRow[],
    intervalRows,
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { id: teamId } = await context.params
    const teamContext = await getTeamContext(user.id, teamId, scope.businessSlug)

    if (!teamContext) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const days = clampDays(request.nextUrl.searchParams.get('days'))
    const startDate = rangeStart(days)
    const activeMembers = teamContext.team.members
    const activeMemberIds = new Set(activeMembers.map((member) => member.id))

    const detailKind = request.nextUrl.searchParams.get('detailKind') as DetailKind | null
    const detailId = request.nextUrl.searchParams.get('detailId')
    const detail = detailKind && detailId
      ? detailKind === 'broadcast'
        ? await buildBroadcastDetail(detailId, activeMemberIds)
        : await buildIntervalDetail(detailId, activeMemberIds)
      : null

    const [broadcasts, intervalSessions] = await Promise.all([
      prisma.teamWorkoutBroadcast.findMany({
        where: { teamId, assignedDate: { gte: startDate } },
        include: {
          strengthSession: { select: { id: true, name: true } },
          cardioSession: { select: { id: true, name: true } },
          hybridWorkout: { select: { id: true, name: true } },
          agilityWorkout: { select: { id: true, name: true } },
        },
        orderBy: { assignedDate: 'desc' },
        take: 100,
      }),
      prisma.intervalSession.findMany({
        where: {
          teamId,
          OR: [
            { scheduledDate: { gte: startDate } },
            { AND: [{ scheduledDate: null }, { startedAt: { gte: startDate } }] },
          ],
        },
        include: {
          participants: {
            where: { clientId: { in: [...activeMemberIds] } },
            select: {
              clientId: true,
              laps: { select: { intervalNumber: true, splitTimeMs: true, recordedAt: true } },
            },
          },
        },
        orderBy: [{ scheduledDate: 'desc' }, { startedAt: 'desc' }],
        take: 50,
      }),
    ])

    const broadcastIds = broadcasts.map((broadcast) => broadcast.id)
    const [strength, cardio, hybrid, agility] = broadcastIds.length > 0
      ? await Promise.all([
          prisma.strengthSessionAssignment.findMany({
            where: { teamBroadcastId: { in: broadcastIds }, athleteId: { in: [...activeMemberIds] } },
            select: { id: true, teamBroadcastId: true, athleteId: true, status: true, completedAt: true, rpe: true, duration: true },
          }),
          prisma.cardioSessionAssignment.findMany({
            where: { teamBroadcastId: { in: broadcastIds }, athleteId: { in: [...activeMemberIds] } },
            select: { id: true, teamBroadcastId: true, athleteId: true, status: true, completedAt: true, actualDuration: true },
          }),
          prisma.hybridWorkoutAssignment.findMany({
            where: { teamBroadcastId: { in: broadcastIds }, athleteId: { in: [...activeMemberIds] } },
            select: { id: true, teamBroadcastId: true, athleteId: true, status: true, completedAt: true, resultId: true },
          }),
          prisma.agilityWorkoutAssignment.findMany({
            where: { teamBroadcastId: { in: broadcastIds }, athleteId: { in: [...activeMemberIds] } },
            select: { id: true, teamBroadcastId: true, athleteId: true, status: true, completedAt: true },
          }),
        ])
      : [[], [], [], []]

    const cardioLogs = cardio.length > 0
      ? await prisma.cardioSessionLog.findMany({
          where: { assignmentId: { in: cardio.map((assignment) => assignment.id) } },
          select: { assignmentId: true, sessionRPE: true, actualDuration: true, completedAt: true },
        })
      : []
    const hybridResults = hybrid.some((assignment) => assignment.resultId)
      ? await prisma.hybridWorkoutResult.findMany({
          where: { id: { in: hybrid.map((assignment) => assignment.resultId).filter(Boolean) as string[] } },
          select: { id: true, perceivedEffort: true, timeScore: true, completedAt: true },
        })
      : []
    const cardioLogByAssignment = new Map(cardioLogs.map((log) => [log.assignmentId, log]))
    const hybridResultById = new Map(hybridResults.map((result) => [result.id, result]))

    const assignmentsByBroadcast = new Map<string, Array<{
      athleteId: string
      status: string
      completedAt: Date | null
      resultId?: string | null
      rpe: number | null
      durationSeconds: number | null
    }>>()
    const pushAssignment = (broadcastId: string | null, row: {
      athleteId: string
      status: string
      completedAt: Date | null
      resultId?: string | null
      rpe: number | null
      durationSeconds: number | null
    }) => {
      if (!broadcastId) return
      const current = assignmentsByBroadcast.get(broadcastId) ?? []
      current.push(row)
      assignmentsByBroadcast.set(broadcastId, current)
    }
    strength.forEach((assignment) => pushAssignment(assignment.teamBroadcastId, {
      athleteId: assignment.athleteId,
      status: assignment.status,
      completedAt: assignment.completedAt,
      rpe: assignment.rpe,
      durationSeconds: assignment.duration ? assignment.duration * 60 : null,
    }))
    cardio.forEach((assignment) => {
      const log = cardioLogByAssignment.get(assignment.id)
      pushAssignment(assignment.teamBroadcastId, {
        athleteId: assignment.athleteId,
        status: assignment.status,
        completedAt: log?.completedAt ?? assignment.completedAt,
        rpe: log?.sessionRPE ?? null,
        durationSeconds: log?.actualDuration ?? assignment.actualDuration ?? null,
      })
    })
    hybrid.forEach((assignment) => {
      const result = assignment.resultId ? hybridResultById.get(assignment.resultId) : null
      pushAssignment(assignment.teamBroadcastId, {
        athleteId: assignment.athleteId,
        status: assignment.status,
        completedAt: result?.completedAt ?? assignment.completedAt,
        resultId: assignment.resultId,
        rpe: result?.perceivedEffort ?? null,
        durationSeconds: result?.timeScore ?? null,
      })
    })
    agility.forEach((assignment) => pushAssignment(assignment.teamBroadcastId, {
      athleteId: assignment.athleteId,
      status: assignment.status,
      completedAt: assignment.completedAt,
      rpe: null,
      durationSeconds: null,
    }))

    const playerStats = new Map(activeMembers.map((member) => [member.id, {
      athleteId: member.id,
      name: member.name,
      jerseyNumber: member.jerseyNumber,
      position: member.position,
      assigned: 0,
      completed: 0,
      missed: 0,
      pending: 0,
      avgRpe: null as number | null,
      rpes: [] as number[],
    }]))

    const sessions = broadcasts.map((broadcast) => {
      const source = sourceForBroadcast(broadcast)
      const assignments = assignmentsByBroadcast.get(broadcast.id) ?? []
      const completed = assignments.filter(isCompleted).length
      const missed = assignments.filter((assignment) => isMissed(assignment, broadcast.assignedDate)).length
      assignments.forEach((assignment) => {
        const player = playerStats.get(assignment.athleteId)
        if (!player) return
        player.assigned += 1
        if (isCompleted(assignment)) player.completed += 1
        else if (isMissed(assignment, broadcast.assignedDate)) player.missed += 1
        else player.pending += 1
        if (assignment.rpe) player.rpes.push(assignment.rpe)
      })
      return {
        id: broadcast.id,
        detailKind: 'broadcast' as DetailKind,
        workoutKind: source.kind,
        workoutName: source.name,
        sourceId: source.sourceId,
        assignedDate: broadcast.assignedDate.toISOString(),
        assigned: assignments.length,
        completed,
        missed,
        pending: Math.max(0, assignments.length - completed - missed),
        missing: Math.max(0, activeMembers.length - assignments.length),
        completionRate: completionRate(completed, assignments.length),
        avgRpe: average(assignments.map((assignment) => assignment.rpe)),
        avgDurationSeconds: average(assignments.map((assignment) => assignment.durationSeconds)),
        notes: broadcast.notes,
      }
    })

    intervalSessions.forEach((session) => {
      const expected = intervalProtocolCount(session.protocol)
      session.participants.forEach((participant) => {
        const player = playerStats.get(participant.clientId)
        if (!player) return
        const done = expected ? participant.laps.length >= expected : participant.laps.length > 0 && session.status === 'ENDED'
        player.assigned += 1
        if (done) player.completed += 1
        else if (session.status === 'ENDED') player.missed += 1
        else player.pending += 1
      })
    })

    const intervalSessionSummaries = intervalSessions.map((session) => {
      const expected = intervalProtocolCount(session.protocol)
      const completed = session.participants.filter((participant) => (
        expected ? participant.laps.length >= expected : participant.laps.length > 0 && session.status === 'ENDED'
      )).length
      const missed = session.status === 'ENDED' ? Math.max(0, session.participants.length - completed) : 0
      return {
        id: session.id,
        detailKind: 'interval' as DetailKind,
        workoutKind: 'interval' as WorkoutKind,
        workoutName: session.name ?? 'Intervallpass',
        sourceId: session.id,
        assignedDate: (session.scheduledDate ?? session.startedAt).toISOString(),
        assigned: session.participants.length,
        completed,
        missed,
        pending: Math.max(0, session.participants.length - completed - missed),
        missing: Math.max(0, activeMembers.length - session.participants.length),
        completionRate: completionRate(completed, session.participants.length),
        avgRpe: null,
        avgDurationSeconds: average(session.participants.map((participant) => (
          participant.laps.length > 0
            ? Math.round(participant.laps.reduce((sum, lap) => sum + lap.splitTimeMs, 0) / 1000)
            : null
        ))),
        notes: null,
      }
    })

    const allSessions = [...sessions, ...intervalSessionSummaries]
      .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())

    const assigned = allSessions.reduce((sum, session) => sum + session.assigned, 0)
    const completed = allSessions.reduce((sum, session) => sum + session.completed, 0)
    const missed = allSessions.reduce((sum, session) => sum + session.missed, 0)
    const missing = allSessions.reduce((sum, session) => sum + session.missing, 0)
    const players = [...playerStats.values()].map((player) => ({
      ...player,
      avgRpe: average(player.rpes),
      completionRate: completionRate(player.completed, player.assigned),
      rpes: undefined,
    }))

    return NextResponse.json({
      success: true,
      data: {
        team: { id: teamContext.team.id, name: teamContext.team.name, memberCount: activeMembers.length },
        days,
        totals: {
          assigned,
          completed,
          missed,
          missing,
          pending: Math.max(0, assigned - completed - missed),
          completionRate: completionRate(completed, assigned),
        },
        sessions: allSessions,
        players,
        detail,
      },
    })
  } catch (error) {
    logger.error('Error fetching team workout monitor', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team workout monitor' },
      { status: 500 }
    )
  }
}
