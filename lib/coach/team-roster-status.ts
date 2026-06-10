import { prisma } from '@/lib/prisma'
import { AssignmentStatus } from '@prisma/client'

export interface TeamRosterRestrictionSummary {
  type: string
  severity: string
  source: string
  bodyParts: string[]
  reason: string | null
}

/**
 * Per-member roster status for a team on a given day. Superset of the
 * `TeamRosterMember` shape consumed by `TeamRosterTable` (with an added
 * `todayCompletedCount`), so it can feed both the Trupp tab and the Idag
 * cockpit rail.
 *
 * "today*" counts are scoped to `referenceDate` (defaults to the current day),
 * which lets the cockpit show coverage for whichever day is being viewed.
 */
export interface TeamRosterMemberStatus {
  id: string
  name: string
  email: string | null
  birthDate: Date | null
  height: number | null
  weight: number | null
  businessId: string | null
  jerseyNumber: number | null
  position: string | null
  photoUrl: string | null
  athleteAccount: { id: string } | null
  hasAthleteAccount: boolean
  /** Active (PENDING/SCHEDULED/MODIFIED) assignments on the reference day. */
  todayWorkoutCount: number
  /** COMPLETED assignments on the reference day. */
  todayCompletedCount: number
  /** Active assignments from the reference day through the next 7 days. */
  upcomingWorkoutCount: number
  activeInjuryCount: number
  activeRestrictionCount: number
  restrictionSummaries: TeamRosterRestrictionSummary[]
  /** Latest readiness level within the recent window (DailyMetrics), or null. */
  readinessLevel: string | null
  /** Latest ACWR zone within the recent window (TrainingLoad), or null. */
  acwrZone: string | null
}

/**
 * How many days back to look for the most recent readiness / load reading.
 * Check-ins are sparse, so "current state" means the latest within this window
 * rather than strictly today.
 */
const READINESS_LOOKBACK_DAYS = 3

const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.PENDING,
  AssignmentStatus.SCHEDULED,
  AssignmentStatus.MODIFIED,
]

export async function getTeamRosterStatus(
  teamId: string,
  referenceDate?: Date
): Promise<TeamRosterMemberStatus[]> {
  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          birthDate: true,
          height: true,
          weight: true,
          businessId: true,
          jerseyNumber: true,
          position: true,
          photoUrl: true,
          athleteAccount: { select: { id: true } },
        },
      },
    },
  })

  const members = team?.members ?? []
  const memberIds = members.map((member) => member.id)
  if (memberIds.length === 0) {
    return []
  }

  const dayStart = referenceDate ? new Date(referenceDate) : new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const upcomingUntil = new Date(dayStart)
  upcomingUntil.setDate(upcomingUntil.getDate() + 7)
  const readinessSince = new Date(dayStart)
  readinessSince.setDate(readinessSince.getDate() - READINESS_LOOKBACK_DAYS)

  const dayActiveWhere = {
    athleteId: { in: memberIds },
    status: { in: ACTIVE_ASSIGNMENT_STATUSES },
    assignedDate: { gte: dayStart, lt: dayEnd },
  }
  const dayCompletedWhere = {
    athleteId: { in: memberIds },
    status: AssignmentStatus.COMPLETED,
    assignedDate: { gte: dayStart, lt: dayEnd },
  }
  const upcomingWhere = {
    athleteId: { in: memberIds },
    status: { in: ACTIVE_ASSIGNMENT_STATUSES },
    assignedDate: { gte: dayStart, lte: upcomingUntil },
  }

  const [
    strengthToday,
    cardioToday,
    hybridToday,
    strengthDone,
    cardioDone,
    hybridDone,
    strengthUpcoming,
    cardioUpcoming,
    hybridUpcoming,
    activeInjuries,
    activeRestrictions,
    recentMetrics,
    recentLoads,
  ] = await Promise.all([
    prisma.strengthSessionAssignment.groupBy({ by: ['athleteId'], where: dayActiveWhere, _count: { id: true } }),
    prisma.cardioSessionAssignment.groupBy({ by: ['athleteId'], where: dayActiveWhere, _count: { id: true } }),
    prisma.hybridWorkoutAssignment.groupBy({ by: ['athleteId'], where: dayActiveWhere, _count: { id: true } }),
    prisma.strengthSessionAssignment.groupBy({ by: ['athleteId'], where: dayCompletedWhere, _count: { id: true } }),
    prisma.cardioSessionAssignment.groupBy({ by: ['athleteId'], where: dayCompletedWhere, _count: { id: true } }),
    prisma.hybridWorkoutAssignment.groupBy({ by: ['athleteId'], where: dayCompletedWhere, _count: { id: true } }),
    prisma.strengthSessionAssignment.groupBy({ by: ['athleteId'], where: upcomingWhere, _count: { id: true } }),
    prisma.cardioSessionAssignment.groupBy({ by: ['athleteId'], where: upcomingWhere, _count: { id: true } }),
    prisma.hybridWorkoutAssignment.groupBy({ by: ['athleteId'], where: upcomingWhere, _count: { id: true } }),
    prisma.injuryAssessment.groupBy({
      by: ['clientId'],
      where: { clientId: { in: memberIds }, status: { in: ['ACTIVE', 'MONITORING'] }, resolved: false },
      _count: { id: true },
    }),
    prisma.trainingRestriction.findMany({
      where: {
        clientId: { in: memberIds },
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: {
        clientId: true,
        type: true,
        severity: true,
        source: true,
        bodyParts: true,
        reason: true,
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.dailyMetrics.findMany({
      where: {
        clientId: { in: memberIds },
        date: { gte: readinessSince, lt: dayEnd },
        readinessLevel: { not: null },
      },
      select: { clientId: true, readinessLevel: true },
      orderBy: { date: 'desc' },
    }),
    prisma.trainingLoad.findMany({
      where: {
        clientId: { in: memberIds },
        date: { gte: readinessSince, lt: dayEnd },
        source: 'ACWR_SUMMARY',
      },
      select: { clientId: true, acwrZone: true },
      orderBy: { date: 'desc' },
    }),
  ])

  const addCounts = (
    target: Map<string, number>,
    rows: Array<{ athleteId: string; _count: { id: number } }>
  ) => {
    rows.forEach((row) => {
      target.set(row.athleteId, (target.get(row.athleteId) ?? 0) + row._count.id)
    })
  }

  const todayActiveCounts = new Map<string, number>()
  addCounts(todayActiveCounts, strengthToday)
  addCounts(todayActiveCounts, cardioToday)
  addCounts(todayActiveCounts, hybridToday)

  const todayCompletedCounts = new Map<string, number>()
  addCounts(todayCompletedCounts, strengthDone)
  addCounts(todayCompletedCounts, cardioDone)
  addCounts(todayCompletedCounts, hybridDone)

  const upcomingCounts = new Map<string, number>()
  addCounts(upcomingCounts, strengthUpcoming)
  addCounts(upcomingCounts, cardioUpcoming)
  addCounts(upcomingCounts, hybridUpcoming)

  const injuryCounts = new Map<string, number>()
  activeInjuries.forEach((injury) => {
    injuryCounts.set(injury.clientId, injury._count.id)
  })

  const restrictionSummaries = new Map<string, TeamRosterRestrictionSummary[]>()
  activeRestrictions.forEach((restriction) => {
    const current = restrictionSummaries.get(restriction.clientId) ?? []
    current.push({
      type: restriction.type,
      severity: restriction.severity,
      source: restriction.source,
      bodyParts: restriction.bodyParts,
      reason: restriction.reason,
    })
    restrictionSummaries.set(restriction.clientId, current)
  })

  // Rows arrive date-desc, so the first one seen per client is the most recent.
  const readinessLevels = new Map<string, string>()
  recentMetrics.forEach((metric) => {
    if (metric.readinessLevel && !readinessLevels.has(metric.clientId)) {
      readinessLevels.set(metric.clientId, metric.readinessLevel)
    }
  })

  const acwrZones = new Map<string, string>()
  recentLoads.forEach((load) => {
    if (load.acwrZone && !acwrZones.has(load.clientId)) {
      acwrZones.set(load.clientId, load.acwrZone)
    }
  })

  return members.map((member) => ({
    ...member,
    hasAthleteAccount: Boolean(member.athleteAccount),
    todayWorkoutCount: todayActiveCounts.get(member.id) ?? 0,
    todayCompletedCount: todayCompletedCounts.get(member.id) ?? 0,
    upcomingWorkoutCount: upcomingCounts.get(member.id) ?? 0,
    activeInjuryCount: injuryCounts.get(member.id) ?? 0,
    activeRestrictionCount: restrictionSummaries.get(member.id)?.length ?? 0,
    restrictionSummaries: restrictionSummaries.get(member.id) ?? [],
    readinessLevel: readinessLevels.get(member.id) ?? null,
    acwrZone: acwrZones.get(member.id) ?? null,
  }))
}
