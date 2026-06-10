import type { Prisma } from '@prisma/client'
import {
  differenceInCalendarDays,
  endOfWeek,
  startOfWeek,
  subDays,
} from 'date-fns'
import { prisma } from '@/lib/prisma'

export type CommandCenterPriority = 'critical' | 'high' | 'medium' | 'low'

export interface CommandCenterQueueItem {
  id: string
  title: string
  description: string
  priority: CommandCenterPriority
  category: 'readiness' | 'load' | 'injury' | 'feedback' | 'program' | 'testing' | 'alert'
  clientName?: string
  href: string
  ctaLabel: string
  meta?: string
}

export interface CommandCenterRecommendation {
  id: string
  title: string
  recommendation: string
  why: string[]
  evidence: Array<{
    label: string
    value: string
    tone: 'good' | 'watch' | 'risk' | 'neutral'
  }>
  confidence: 'High' | 'Medium' | 'Low'
  href: string
  ctaLabel: string
}

export interface CoachCommandCenterData {
  summary: {
    totalClients: number
    urgentCount: number
    reviewCount: number
    stableCount: number
    activeAlerts: number
  }
  queueItems: CommandCenterQueueItem[]
  recommendations: CommandCenterRecommendation[]
}

interface GetCoachCommandCenterDataParams {
  userId: string
  businessId: string
  coachIds: string[]
  basePath: string
  now?: Date
}

const priorityRank: Record<CommandCenterPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const alertPriority: Record<string, CommandCenterPriority> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
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
    activePrograms,
    recentTests,
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
    // Only the nightly ACWR cron's summary rows carry the EWMA fields read
    // downstream; an unfiltered "latest row per client" could be a workout
    // row with acwr null, masking an active DANGER/CRITICAL zone.
    prisma.trainingLoad.findMany({
      where: {
        client: clientWhere,
        date: { gte: subDays(now, 7) },
        acwr: { not: null },
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
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        alertType: true,
        severity: true,
        title: true,
        message: true,
        contextData: true,
        createdAt: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
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
    queueItems.push({
      id: `alert-${alert.id}`,
      title: alert.title,
      description: alert.message,
      priority: alertPriority[alert.severity] ?? 'medium',
      category: 'alert',
      clientName: alert.client.name,
      href: `${basePath}/coach/clients/${alert.clientId}`,
      ctaLabel: 'Review athlete',
      meta: alert.alertType.replaceAll('_', ' ').toLowerCase(),
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
  const reviewClientIds = new Set(sortedQueue.map(item => item.clientName).filter(Boolean))

  return {
    summary: {
      totalClients: clients.length,
      urgentCount,
      reviewCount: reviewClientIds.size,
      stableCount: Math.max(0, clients.length - reviewClientIds.size),
      activeAlerts: activeAlerts.length,
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
