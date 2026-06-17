import type { Prisma } from '@prisma/client'
import {
  differenceInCalendarDays,
  endOfWeek,
  startOfWeek,
  subDays,
} from 'date-fns'
import { prisma } from '@/lib/prisma'
import { painAlertOutcomeLabel } from '@/lib/coach/pain-alert-outcomes'

export {
  filterCommandCenterQueueItems,
  type CoachCommandCenterData,
  type CommandCenterPriority,
  type CommandCenterQueueFilter,
  type CommandCenterQueueItem,
  type CommandCenterRecommendation,
} from '@/lib/coach/command-center-shared'
import type {
  CoachCommandCenterData,
  CommandCenterPriority,
  CommandCenterQueueItem,
  CommandCenterRecommendation,
} from '@/lib/coach/command-center-shared'

interface GetCoachCommandCenterDataParams {
  userId: string
  businessId: string
  coachIds: string[]
  basePath: string
  now?: Date
}

const alertPriority: Record<string, CommandCenterPriority> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

const priorityRank: Record<CommandCenterPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function maxPriority(
  current: CommandCenterPriority,
  candidate: CommandCenterPriority,
): CommandCenterPriority {
  return priorityRank[candidate] > priorityRank[current] ? candidate : current
}

function ageLabel(ageDays: number, noun: string): string {
  if (ageDays <= 0) return `${noun} today`
  if (ageDays === 1) return `1 day ${noun}`
  return `${ageDays} days ${noun}`
}

function dueLabel(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'Due today'
  if (daysOverdue === 1) return '1 day overdue'
  return `${daysOverdue} days overdue`
}

function alertOps(now: Date, createdAt: Date, status: string, alertType: string): {
  priorityBump?: CommandCenterPriority
  opsLabel?: string
  opsTone?: CommandCenterQueueItem['opsTone']
} {
  if (status === 'SNOOZED') {
    return {
      opsLabel: 'Snooze due',
      opsTone: 'watch',
    }
  }

  const ageDays = differenceInCalendarDays(now, createdAt)

  if (ageDays >= 7) {
    return {
      priorityBump: 'critical',
      opsLabel: ageLabel(ageDays, 'open'),
      opsTone: 'overdue',
    }
  }

  if (ageDays >= 3 || (alertType === 'PAIN_MENTION' && ageDays >= 2)) {
    return {
      priorityBump: 'high',
      opsLabel: ageLabel(ageDays, 'open'),
      opsTone: 'overdue',
    }
  }

  return {}
}

function testReviewOps(now: Date, updatedAt: Date): {
  priorityBump?: CommandCenterPriority
  opsLabel?: string
  opsTone?: CommandCenterQueueItem['opsTone']
} {
  const ageDays = differenceInCalendarDays(now, updatedAt)

  if (ageDays >= 7) {
    return {
      priorityBump: 'critical',
      opsLabel: ageLabel(ageDays, 'waiting'),
      opsTone: 'overdue',
    }
  }

  if (ageDays >= 3) {
    return {
      priorityBump: 'high',
      opsLabel: ageLabel(ageDays, 'waiting'),
      opsTone: 'overdue',
    }
  }

  return {}
}

function openCoachAlertWhere(now: Date): Prisma.CoachAlertWhereInput {
  return {
    OR: [
      { status: 'ACTIVE' },
      { status: 'SNOOZED', snoozedUntil: { lte: now } },
    ],
  }
}

function unexpiredCoachAlertWhere(now: Date): Prisma.CoachAlertWhereInput {
  return {
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ],
  }
}

function isQuickErgAlertType(alertType: string): boolean {
  return alertType.startsWith('QUICK_ERG_')
}

function quickErgSessionId(contextData: Prisma.JsonValue | null): string | null {
  if (!contextData || typeof contextData !== 'object' || Array.isArray(contextData)) return null

  const sessionId = (contextData as Record<string, Prisma.JsonValue>).sessionId
  return typeof sessionId === 'string' ? sessionId : null
}

function coachAlertHref(alert: {
  alertType: string
  clientId: string
  contextData: Prisma.JsonValue | null
}, basePath: string): string {
  const sessionId = isQuickErgAlertType(alert.alertType)
    ? quickErgSessionId(alert.contextData)
    : null

  if (sessionId) {
    return `${basePath}/coach/clients/${alert.clientId}/quick-erg/${sessionId}`
  }

  if (alert.alertType === 'PAIN_MENTION') {
    return `${basePath}/coach/athletes/${alert.clientId}/logs`
  }

  if (alert.alertType === 'COACH_OPS_OVERDUE') {
    return `${basePath}/coach/clients/${alert.clientId}`
  }

  return `${basePath}/coach/clients/${alert.clientId}`
}

function coachAlertCtaLabel(alertType: string): string {
  if (alertType === 'PAIN_MENTION') return 'Review pain'
  if (alertType === 'COACH_OPS_OVERDUE') return 'Review overdue'
  return isQuickErgAlertType(alertType) ? 'Open session' : 'Review athlete'
}

function coachAlertCategory(alertType: string): CommandCenterQueueItem['category'] {
  if (alertType === 'PAIN_MENTION') return 'injury'
  if (alertType === 'COACH_OPS_OVERDUE') return 'alert'
  return 'alert'
}

export async function getCoachCommandCenterData({
  userId,
  businessId,
  coachIds,
  basePath,
  now = new Date(),
}: GetCoachCommandCenterDataParams): Promise<CoachCommandCenterData> {
  const clientWhere: Prisma.ClientWhereInput = {
    userId: { in: coachIds },
    businessId,
  }
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const [
    clients,
    latestMetrics,
    latestLoads,
    activeInjuries,
    feedbackLogs,
    weeklySummaries,
    activeAlerts,
    duePainFollowUps,
    activePrograms,
    recentTests,
    reviewRequiredTests,
  ] = await Promise.all([
    prisma.client.findMany({
      where: clientWhere,
      select: {
        id: true,
        name: true,
        createdAt: true,
        sportProfile: { select: { primarySport: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.dailyMetrics.findMany({
      where: {
        client: clientWhere,
        date: { gte: subDays(now, 3) },
      },
      select: {
        clientId: true,
        date: true,
        readinessScore: true,
        readinessLevel: true,
        recommendedAction: true,
        redFlags: true,
        yellowFlags: true,
        injuryPain: true,
        sleepHours: true,
        muscleSoreness: true,
        energyLevel: true,
        stress: true,
      },
      orderBy: { date: 'desc' },
    }),
    // Only ACWR_SUMMARY rows carry the EWMA fields read downstream; an
    // unfiltered "latest row per client" could be a workout row with acwr
    // null, masking an active DANGER/CRITICAL zone.
    prisma.trainingLoad.findMany({
      where: {
        client: clientWhere,
        date: { gte: subDays(now, 7) },
        source: 'ACWR_SUMMARY',
      },
      select: {
        clientId: true,
        date: true,
        acwr: true,
        acwrZone: true,
        injuryRisk: true,
        acuteLoad: true,
        chronicLoad: true,
        dailyLoad: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.injuryAssessment.groupBy({
      by: ['clientId'],
      where: {
        client: clientWhere,
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
      _count: { id: true },
    }),
    prisma.workoutLog.findMany({
      where: {
        completed: true,
        coachFeedback: null,
        completedAt: { gte: subDays(now, 14) },
        workout: {
          day: {
            week: {
              program: {
                coachId: { in: coachIds },
                client: clientWhere,
              },
            },
          },
        },
      },
      select: {
        id: true,
        completedAt: true,
        workout: {
          select: {
            day: {
              select: {
                week: {
                  select: {
                    program: {
                      select: {
                        clientId: true,
                        client: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 100,
    }),
    prisma.weeklyTrainingSummary.findMany({
      where: {
        client: clientWhere,
        weekStart: { gte: weekStart },
        weekEnd: { lte: weekEnd },
      },
      select: {
        clientId: true,
        completedWorkoutCount: true,
        plannedWorkoutCount: true,
        compliancePercent: true,
      },
    }),
    prisma.coachAlert.findMany({
      where: {
        coachId: userId,
        client: clientWhere,
        AND: [
          openCoachAlertWhere(now),
          unexpiredCoachAlertWhere(now),
        ],
      },
      select: {
        id: true,
        alertType: true,
        severity: true,
        status: true,
        title: true,
        message: true,
        contextData: true,
        createdAt: true,
        followUpAt: true,
        snoozedUntil: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.coachAlert.findMany({
      where: {
        coachId: userId,
        alertType: 'PAIN_MENTION',
        status: { in: ['RESOLVED', 'ACTIONED'] },
        followUpAt: {
          gte: subDays(now, 14),
          lte: now,
        },
        client: clientWhere,
        AND: [unexpiredCoachAlertWhere(now)],
      },
      select: {
        id: true,
        alertType: true,
        severity: true,
        status: true,
        title: true,
        message: true,
        contextData: true,
        createdAt: true,
        followUpAt: true,
        resolutionOutcome: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { followUpAt: 'asc' },
      take: 20,
    }),
    prisma.trainingProgram.findMany({
      where: {
        coachId: { in: coachIds },
        client: clientWhere,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        clientId: true,
        name: true,
        endDate: true,
        goalRace: true,
        goalDate: true,
        client: { select: { name: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
    prisma.test.findMany({
      where: {
        client: clientWhere,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        clientId: true,
        testDate: true,
        testType: true,
        vo2max: true,
      },
      orderBy: { testDate: 'desc' },
      take: 500,
    }),
    prisma.test.findMany({
      where: {
        client: clientWhere,
        status: 'COMPLETED',
        qualityReviewStatus: 'REVIEW_REQUIRED',
      },
      select: {
        id: true,
        clientId: true,
        testDate: true,
        testType: true,
        updatedAt: true,
        qualityWarnings: true,
        client: { select: { name: true } },
      },
      orderBy: { testDate: 'desc' },
      take: 25,
    }),
  ])

  const latestMetricsByClient = firstByClient(latestMetrics)
  const latestLoadByClient = firstByClient(latestLoads)
  const latestTestByClient = firstByClient(recentTests)

  const injuryCountByClient = new Map(
    activeInjuries.map(row => [row.clientId, row._count.id])
  )

  const feedbackCountByClient = new Map<string, number>()
  for (const log of feedbackLogs) {
    const clientId = log.workout.day.week.program.clientId
    feedbackCountByClient.set(clientId, (feedbackCountByClient.get(clientId) ?? 0) + 1)
  }

  const weeklySummaryByClient = new Map(weeklySummaries.map(summary => [summary.clientId, summary]))
  const activeProgramByClient = new Map<string, (typeof activePrograms)[number]>()
  for (const program of activePrograms) {
    if (!activeProgramByClient.has(program.clientId)) {
      activeProgramByClient.set(program.clientId, program)
    }
  }

  const alertsByClient = new Map<string, typeof activeAlerts>()
  for (const alert of activeAlerts) {
    const current = alertsByClient.get(alert.clientId) ?? []
    current.push(alert)
    alertsByClient.set(alert.clientId, current)
  }

  const queueItems: CommandCenterQueueItem[] = []

  for (const alert of activeAlerts.slice(0, 6)) {
    const ops = alertOps(now, alert.createdAt, alert.status, alert.alertType)
    const basePriority = alertPriority[alert.severity] ?? 'medium'

    queueItems.push({
      id: `alert-${alert.id}`,
      alertId: alert.id,
      alertStatus: alert.status,
      alertType: alert.alertType,
      title: alert.title,
      description: alert.message,
      priority: ops.priorityBump ? maxPriority(basePriority, ops.priorityBump) : basePriority,
      category: coachAlertCategory(alert.alertType),
      clientName: alert.client.name,
      href: coachAlertHref(alert, basePath),
      ctaLabel: coachAlertCtaLabel(alert.alertType),
      meta: alert.status === 'SNOOZED'
        ? 'snooze ended'
        : alert.alertType.replaceAll('_', ' ').toLowerCase(),
      opsLabel: ops.opsLabel,
      opsTone: ops.opsTone,
    })
  }

  for (const alert of duePainFollowUps.slice(0, 6)) {
    const daysOverdue = alert.followUpAt
      ? differenceInCalendarDays(now, alert.followUpAt)
      : 0

    queueItems.push({
      id: `pain-follow-up-${alert.id}`,
      alertId: alert.id,
      alertStatus: alert.status,
      alertType: alert.alertType,
      title: 'Pain follow-up due',
      description: `${alert.client.name} has a pain follow-up due from a resolved post-workout alert.`,
      priority: daysOverdue >= 2 ? 'high' : 'medium',
      category: 'injury',
      clientName: alert.client.name,
      href: coachAlertHref(alert, basePath),
      ctaLabel: 'Follow up',
      meta: painAlertOutcomeLabel(alert.resolutionOutcome),
      opsLabel: dueLabel(daysOverdue),
      opsTone: daysOverdue > 0 ? 'overdue' : 'watch',
    })
  }

  for (const test of reviewRequiredTests.slice(0, 6)) {
    const warningCount = countJsonSignal(test.qualityWarnings)
    const ops = testReviewOps(now, test.updatedAt)
    const basePriority: CommandCenterPriority = hasCriticalQualityWarning(test.qualityWarnings) || warningCount > 1
      ? 'high'
      : 'medium'

    queueItems.push({
      id: `test-review-${test.id}`,
      title: 'Test data needs review',
      description: `${test.client.name}'s ${test.testType.toLowerCase()} test needs coach approval before it can be used for program decisions.`,
      priority: ops.priorityBump ? maxPriority(basePriority, ops.priorityBump) : basePriority,
      category: 'testing',
      clientName: test.client.name,
      href: `${basePath}/coach/tests/${test.id}#quality-review`,
      ctaLabel: 'Review test',
      meta: warningCount > 0
        ? `${warningCount} quality ${warningCount === 1 ? 'warning' : 'warnings'}`
        : 'Quality review required',
      opsLabel: ops.opsLabel,
      opsTone: ops.opsTone,
    })
  }

  for (const client of clients) {
    const metrics = latestMetricsByClient.get(client.id)
    const load = latestLoadByClient.get(client.id)
    const injuryCount = injuryCountByClient.get(client.id) ?? 0
    const feedbackCount = feedbackCountByClient.get(client.id) ?? 0
    const weekly = weeklySummaryByClient.get(client.id)
    const program = activeProgramByClient.get(client.id)
    const latestTest = latestTestByClient.get(client.id)

    if (metrics?.readinessScore !== null && metrics?.readinessScore !== undefined) {
      const readiness = getReadinessDisplay(metrics.readinessScore)
      if (readiness.status === 'low') {
        queueItems.push({
          id: `readiness-${client.id}`,
          title: 'Readiness needs a same-day adjustment',
          description: `${client.name} reported ${readiness.label}. Consider reducing intensity before the day gets away from you.`,
          priority: 'high',
          category: 'readiness',
          clientName: client.name,
          href: `${basePath}/coach/clients/${client.id}`,
          ctaLabel: 'Open profile',
          meta: metrics.recommendedAction ? formatRecommendedAction(metrics.recommendedAction) : undefined,
        })
      }
    }

    if (load?.acwrZone === 'CRITICAL' || load?.acwrZone === 'DANGER') {
      queueItems.push({
        id: `load-${client.id}`,
        title: load.acwrZone === 'CRITICAL' ? 'Critical load spike' : 'Load spike needs review',
        description: `${client.name} is in ${load.acwrZone.toLowerCase()} ACWR territory${load.acwr ? ` (${load.acwr.toFixed(2)})` : ''}.`,
        priority: load.acwrZone === 'CRITICAL' ? 'critical' : 'high',
        category: 'load',
        clientName: client.name,
        href: `${basePath}/coach/clients/${client.id}`,
        ctaLabel: 'Review load',
        meta: load.injuryRisk ? `${load.injuryRisk.toLowerCase()} injury risk` : undefined,
      })
    }

    if (injuryCount > 0) {
      queueItems.push({
        id: `injury-${client.id}`,
        title: 'Active injury follow-up',
        description: `${client.name} has ${injuryCount} active ${injuryCount === 1 ? 'injury flag' : 'injury flags'} in monitoring.`,
        priority: injuryCount > 1 ? 'high' : 'medium',
        category: 'injury',
        clientName: client.name,
        href: `${basePath}/coach/clients/${client.id}`,
        ctaLabel: 'Open profile',
      })
    }

    if (feedbackCount > 0) {
      queueItems.push({
        id: `feedback-${client.id}`,
        title: 'Workout feedback waiting',
        description: `${client.name} has ${feedbackCount} completed ${feedbackCount === 1 ? 'session' : 'sessions'} without coach feedback.`,
        priority: feedbackCount >= 3 ? 'medium' : 'low',
        category: 'feedback',
        clientName: client.name,
        href: `${basePath}/coach/athletes/${client.id}/logs`,
        ctaLabel: 'Give feedback',
      })
    }

    if (
      weekly?.plannedWorkoutCount &&
      weekly.plannedWorkoutCount > 0 &&
      weekly.compliancePercent !== null &&
      weekly.compliancePercent < 60
    ) {
      queueItems.push({
        id: `compliance-${client.id}`,
        title: 'Plan is slipping this week',
        description: `${client.name} has completed ${weekly.completedWorkoutCount ?? 0}/${weekly.plannedWorkoutCount} planned sessions.`,
        priority: 'medium',
        category: 'program',
        clientName: client.name,
        href: `${basePath}/coach/clients/${client.id}`,
        ctaLabel: 'Check plan',
        meta: `${Math.round(weekly.compliancePercent)}% compliance`,
      })
    }

    if (program) {
      const daysLeft = differenceInCalendarDays(program.endDate, now)
      if (daysLeft <= 10) {
        queueItems.push({
          id: `program-${program.id}`,
          title: 'Program block is ending',
          description: `${program.name} ends ${daysLeft <= 0 ? 'today' : `in ${daysLeft} days`}.`,
          priority: daysLeft <= 3 ? 'medium' : 'low',
          category: 'program',
          clientName: client.name,
          href: `${basePath}/coach/programs`,
          ctaLabel: 'Plan next block',
        })
      }
    }

    const daysSinceTest = latestTest
      ? differenceInCalendarDays(now, latestTest.testDate)
      : differenceInCalendarDays(now, client.createdAt)
    if (daysSinceTest >= 120) {
      queueItems.push({
        id: `test-${client.id}`,
        title: latestTest ? 'Testing data is getting stale' : 'No completed baseline test',
        description: latestTest
          ? `${client.name}'s latest ${latestTest.testType.toLowerCase()} test is ${daysSinceTest} days old.`
          : `${client.name} has not completed a baseline test yet.`,
        priority: 'low',
        category: 'testing',
        clientName: client.name,
        href: `${basePath}/coach/tests/new`,
        ctaLabel: 'Schedule test',
      })
    }
  }

  const sortedQueue = dedupeById(queueItems)
    .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority])
    .slice(0, 8)

  const recommendations = buildRecommendations({
    clients,
    latestMetricsByClient,
    latestLoadByClient,
    injuryCountByClient,
    feedbackCountByClient,
    weeklySummaryByClient,
    activeProgramByClient,
    alertsByClient,
    basePath,
    now,
  })

  const urgentCount = sortedQueue.filter(item => item.priority === 'critical' || item.priority === 'high').length
  const overdueCount = sortedQueue.filter(item => item.opsTone === 'overdue').length
  const reviewClientIds = new Set(sortedQueue.map(item => item.clientName).filter(Boolean))

  return {
    summary: {
      totalClients: clients.length,
      urgentCount,
      reviewCount: reviewClientIds.size,
      stableCount: Math.max(0, clients.length - reviewClientIds.size),
      activeAlerts: activeAlerts.length,
      pendingTestReviews: reviewRequiredTests.length,
      unresolvedPainAlerts: activeAlerts.filter(alert => alert.alertType === 'PAIN_MENTION').length,
      overdueCount,
    },
    queueItems: sortedQueue,
    recommendations,
  }
}

function firstByClient<T extends { clientId: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) {
    if (!map.has(row.clientId)) {
      map.set(row.clientId, row)
    }
  }
  return map
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    deduped.push(item)
  }
  return deduped
}

function getReadinessDisplay(score: number): {
  label: string
  status: 'low' | 'watch' | 'good'
  value: string
} {
  if (score <= 10) {
    return {
      label: `${score.toFixed(1)}/10 readiness`,
      status: score < 4 ? 'low' : score < 6.5 ? 'watch' : 'good',
      value: `${score.toFixed(1)}/10`,
    }
  }

  return {
    label: `${Math.round(score)}/100 readiness`,
    status: score < 40 ? 'low' : score < 65 ? 'watch' : 'good',
    value: `${Math.round(score)}/100`,
  }
}

function formatRecommendedAction(action: string): string {
  return action
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^\w/, char => char.toUpperCase())
}

function countJsonSignal(value: Prisma.JsonValue | null): number {
  if (!value) return 0
  if (Array.isArray(value)) return value.length
  if (typeof value === 'object') return Object.keys(value).length
  return 0
}

function hasCriticalQualityWarning(value: Prisma.JsonValue | null): boolean {
  if (!Array.isArray(value)) return false

  return value.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false
    const severity = (item as Record<string, Prisma.JsonValue>).severity
    return typeof severity === 'string' && ['critical', 'error'].includes(severity.toLowerCase())
  })
}

function buildRecommendations({
  clients,
  latestMetricsByClient,
  latestLoadByClient,
  injuryCountByClient,
  feedbackCountByClient,
  weeklySummaryByClient,
  activeProgramByClient,
  alertsByClient,
  basePath,
  now,
}: {
  clients: Array<{ id: string; name: string }>
  latestMetricsByClient: Map<string, {
    readinessScore: number | null
    recommendedAction: string | null
    redFlags: Prisma.JsonValue | null
    yellowFlags: Prisma.JsonValue | null
    injuryPain: number | null
    sleepHours: number | null
    muscleSoreness: number | null
    energyLevel: number | null
    stress: number | null
  }>
  latestLoadByClient: Map<string, {
    acwr: number | null
    acwrZone: string | null
    injuryRisk: string | null
    acuteLoad: number | null
    chronicLoad: number | null
  }>
  injuryCountByClient: Map<string, number>
  feedbackCountByClient: Map<string, number>
  weeklySummaryByClient: Map<string, {
    completedWorkoutCount: number | null
    plannedWorkoutCount: number | null
    compliancePercent: number | null
  }>
  activeProgramByClient: Map<string, { id: string; name: string; endDate: Date }>
  alertsByClient: Map<string, Array<{ title: string; severity: string }>>
  basePath: string
  now: Date
}): CommandCenterRecommendation[] {
  const recommendations: CommandCenterRecommendation[] = []

  for (const client of clients) {
    const metrics = latestMetricsByClient.get(client.id)
    const load = latestLoadByClient.get(client.id)
    const injuryCount = injuryCountByClient.get(client.id) ?? 0
    const feedbackCount = feedbackCountByClient.get(client.id) ?? 0
    const weekly = weeklySummaryByClient.get(client.id)
    const program = activeProgramByClient.get(client.id)
    const alerts = alertsByClient.get(client.id) ?? []
    const evidence: CommandCenterRecommendation['evidence'] = []
    const why: string[] = []

    if (metrics?.readinessScore !== null && metrics?.readinessScore !== undefined) {
      const readiness = getReadinessDisplay(metrics.readinessScore)
      evidence.push({
        label: 'Readiness',
        value: readiness.value,
        tone: readiness.status === 'low' ? 'risk' : readiness.status === 'watch' ? 'watch' : 'good',
      })

      if (readiness.status === 'low') {
        why.push('Readiness is below the normal training threshold.')
      }
      if (metrics.recommendedAction) {
        evidence.push({
          label: 'Daily action',
          value: formatRecommendedAction(metrics.recommendedAction),
          tone: readiness.status === 'low' ? 'risk' : 'watch',
        })
      }

      const redFlagCount = countJsonSignal(metrics.redFlags)
      const yellowFlagCount = countJsonSignal(metrics.yellowFlags)
      if (redFlagCount > 0) {
        why.push(`${redFlagCount} red readiness ${redFlagCount === 1 ? 'flag is' : 'flags are'} present.`)
      } else if (yellowFlagCount > 0) {
        why.push(`${yellowFlagCount} yellow readiness ${yellowFlagCount === 1 ? 'flag is' : 'flags are'} present.`)
      }
      if (metrics.injuryPain && metrics.injuryPain >= 4) {
        why.push(`Pain was reported at ${metrics.injuryPain}/10.`)
      }
      if (metrics.sleepHours && metrics.sleepHours < 6) {
        why.push(`Sleep was low at ${metrics.sleepHours.toFixed(1)} hours.`)
      }
    }

    if (load?.acwrZone) {
      evidence.push({
        label: 'ACWR',
        value: load.acwr ? `${load.acwr.toFixed(2)} ${load.acwrZone}` : load.acwrZone,
        tone: load.acwrZone === 'DANGER' || load.acwrZone === 'CRITICAL'
          ? 'risk'
          : load.acwrZone === 'CAUTION'
            ? 'watch'
            : 'good',
      })

      if (load.acwrZone === 'DANGER' || load.acwrZone === 'CRITICAL') {
        why.push('Acute load is high relative to the athlete’s chronic load.')
      }
    }

    if (injuryCount > 0) {
      evidence.push({
        label: 'Injuries',
        value: `${injuryCount} active`,
        tone: 'risk',
      })
      why.push('Active injury monitoring should shape the next training choice.')
    }

    if (feedbackCount > 0) {
      evidence.push({
        label: 'Feedback',
        value: `${feedbackCount} pending`,
        tone: 'watch',
      })
      why.push('Recent completed sessions are waiting for coach review.')
    }

    if (weekly?.plannedWorkoutCount && weekly.plannedWorkoutCount > 0) {
      evidence.push({
        label: 'Compliance',
        value: `${weekly.completedWorkoutCount ?? 0}/${weekly.plannedWorkoutCount}`,
        tone: weekly.compliancePercent !== null && weekly.compliancePercent < 60 ? 'watch' : 'good',
      })
    }

    if (alerts.length > 0) {
      evidence.push({
        label: 'AI alerts',
        value: `${alerts.length} active`,
        tone: alerts.some(alert => alert.severity === 'CRITICAL' || alert.severity === 'HIGH') ? 'risk' : 'watch',
      })
      why.push(alerts[0].title)
    }

    const daysLeft = program ? differenceInCalendarDays(program.endDate, now) : null
    if (program && daysLeft !== null && daysLeft <= 10) {
      evidence.push({
        label: 'Program',
        value: daysLeft <= 0 ? 'Ends today' : `${daysLeft} days left`,
        tone: daysLeft <= 3 ? 'watch' : 'neutral',
      })
      why.push('The current training block is close to ending.')
    }

    const readiness = metrics?.readinessScore !== null && metrics?.readinessScore !== undefined
      ? getReadinessDisplay(metrics.readinessScore)
      : null
    const loadRisk = load?.acwrZone === 'DANGER' || load?.acwrZone === 'CRITICAL'
    const hasProgramDeadline = daysLeft !== null && daysLeft <= 10

    if (readiness?.status === 'low' || loadRisk || injuryCount > 0 || feedbackCount >= 2 || hasProgramDeadline) {
      recommendations.push({
        id: `recommendation-${client.id}`,
        title: client.name,
        recommendation: chooseRecommendation({
          readinessStatus: readiness?.status,
          loadRisk,
          injuryCount,
          feedbackCount,
          hasProgramDeadline,
        }),
        why: why.slice(0, 4),
        evidence: evidence.slice(0, 5),
        confidence: evidence.length >= 4 ? 'High' : evidence.length >= 2 ? 'Medium' : 'Low',
        href: `${basePath}/coach/clients/${client.id}`,
        ctaLabel: 'Review decision',
      })
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'recommendation-stable-roster',
      title: 'Roster outlook',
      recommendation: 'Keep the current plan, then use check-ins to spot changes early.',
      why: ['No high-priority readiness, load, injury, or feedback signals are active right now.'],
      evidence: [
        { label: 'Status', value: 'Stable', tone: 'good' },
        { label: 'Next move', value: 'Monitor', tone: 'neutral' },
      ],
      confidence: 'Medium',
      href: `${basePath}/coach/monitoring`,
      ctaLabel: 'Open monitoring',
    })
  }

  return recommendations
    .sort((a, b) => recommendationScore(b) - recommendationScore(a))
    .slice(0, 4)
}

function chooseRecommendation({
  readinessStatus,
  loadRisk,
  injuryCount,
  feedbackCount,
  hasProgramDeadline,
}: {
  readinessStatus?: 'low' | 'watch' | 'good'
  loadRisk: boolean
  injuryCount: number
  feedbackCount: number
  hasProgramDeadline: boolean
}): string {
  if (injuryCount > 0 && (readinessStatus === 'low' || loadRisk)) {
    return 'Move this athlete to a conservative recovery or modified session today.'
  }
  if (loadRisk) {
    return 'Reduce high-intensity work and check the next 7 days of planned load.'
  }
  if (readinessStatus === 'low') {
    return 'Swap today’s hard work for an easier option and ask for a short check-in.'
  }
  if (feedbackCount >= 2) {
    return 'Review the latest workout notes before changing the next prescription.'
  }
  if (hasProgramDeadline) {
    return 'Prepare the next block while recent training response is still fresh.'
  }
  return 'Review the athlete context before approving the next training change.'
}

function recommendationScore(recommendation: CommandCenterRecommendation): number {
  return recommendation.evidence.reduce((score, item) => {
    if (item.tone === 'risk') return score + 3
    if (item.tone === 'watch') return score + 2
    if (item.tone === 'good') return score + 1
    return score
  }, 0)
}
