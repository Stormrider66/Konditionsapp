import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays, startOfWeek, endOfWeek } from 'date-fns'

export async function GET() {
  try {
    const user = await requireCoach()
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    // Get all business memberships for this coach
    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        user: { role: 'COACH' },
      },
      select: { businessId: true },
    })

    const businessIds = memberships.map(m => m.businessId)

    const members = await prisma.businessMember.findMany({
      where: {
        businessId: { in: businessIds },
        isActive: true,
        user: { role: 'COACH' },
      },
      select: { userId: true },
    })
    const coachIds = [...new Set([user.id, ...members.map(m => m.userId)])]

    // 9 parallel queries for per-client status
    const [
      clients,
      latestMetrics,
      latestLoads,
      activeInjuries,
      lastActivities,
      pendingFeedback,
      weeklySummaries,
      activeAlerts,
      activePrograms,
    ] = await Promise.all([
      // 1. Clients with sport profile
      prisma.client.findMany({
        where: { userId: { in: coachIds } },
        select: {
          id: true,
          name: true,
          sportProfile: { select: { primarySport: true } },
        },
      }),

      // 2. Latest DailyMetrics per client — readiness
      prisma.dailyMetrics.findMany({
        where: {
          client: { userId: { in: coachIds } },
          date: { gte: subDays(now, 2) },
        },
        select: {
          clientId: true,
          readinessScore: true,
          readinessLevel: true,
          recommendedAction: true,
          date: true,
        },
        orderBy: { date: 'desc' },
      }),

      // 3. Latest TrainingLoad per client — ACWR
      prisma.trainingLoad.findMany({
        where: {
          client: { userId: { in: coachIds } },
          date: { gte: subDays(now, 7) },
        },
        select: {
          clientId: true,
          acwr: true,
          acwrZone: true,
          date: true,
        },
        orderBy: { date: 'desc' },
      }),

      // 4. Active injury count per client
      prisma.injuryAssessment.groupBy({
        by: ['clientId'],
        where: {
          client: { userId: { in: coachIds } },
          status: { in: ['ACTIVE', 'MONITORING'] },
          resolved: false,
        },
        _count: { id: true },
      }),

      // 5. Last workout activity per client
      prisma.workoutLog.groupBy({
        by: ['athleteId'],
        where: {
          workout: {
            day: { week: { program: { coachId: { in: coachIds } } } },
          },
          completed: true,
        },
        _max: { completedAt: true },
      }),

      // 6. Pending feedback — completed logs without coach feedback (last 14 days)
      prisma.workoutLog.groupBy({
        by: ['athleteId'],
        where: {
          workout: {
            day: { week: { program: { coachId: { in: coachIds } } } },
          },
          completed: true,
          coachFeedback: null,
          completedAt: { gte: subDays(now, 14) },
        },
        _count: { id: true },
      }),

      // 7. Weekly training summary — current week compliance
      prisma.weeklyTrainingSummary.findMany({
        where: {
          client: { userId: { in: coachIds } },
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

      // 8. Active coach alerts
      prisma.coachAlert.findMany({
        where: {
          coachId: user.id,
          status: 'ACTIVE',
        },
        select: {
          clientId: true,
          severity: true,
        },
      }),

      // 9. Active training programs
      prisma.trainingProgram.findMany({
        where: {
          coachId: { in: coachIds },
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: {
          clientId: true,
          name: true,
          endDate: true,
        },
        orderBy: { endDate: 'desc' },
      }),
    ])

    // Build lookup maps (take first = most recent due to orderBy desc)
    const metricsMap = new Map<string, { readinessScore: number | null; readinessLevel: string | null; recommendedAction: string | null }>()
    for (const m of latestMetrics) {
      if (!metricsMap.has(m.clientId)) {
        metricsMap.set(m.clientId, {
          readinessScore: m.readinessScore,
          readinessLevel: m.readinessLevel,
          recommendedAction: m.recommendedAction,
        })
      }
    }

    const loadMap = new Map<string, { acwr: number | null; acwrZone: string | null }>()
    for (const l of latestLoads) {
      if (!loadMap.has(l.clientId)) {
        loadMap.set(l.clientId, { acwr: l.acwr, acwrZone: l.acwrZone })
      }
    }

    const injuryMap = new Map<string, number>()
    for (const i of activeInjuries) {
      injuryMap.set(i.clientId, i._count.id)
    }

    const activityMap = new Map<string, Date | null>()
    for (const a of lastActivities) {
      activityMap.set(a.athleteId, a._max.completedAt)
    }

    const feedbackMap = new Map<string, number>()
    for (const f of pendingFeedback) {
      feedbackMap.set(f.athleteId, f._count.id)
    }

    const complianceMap = new Map<string, { completed: number; planned: number; percent: number | null }>()
    for (const s of weeklySummaries) {
      if (!complianceMap.has(s.clientId)) {
        complianceMap.set(s.clientId, {
          completed: s.completedWorkoutCount ?? 0,
          planned: s.plannedWorkoutCount ?? 0,
          percent: s.compliancePercent,
        })
      }
    }

    const severityOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
    const alertMap = new Map<string, { count: number; highestSeverity: string | null }>()
    for (const a of activeAlerts) {
      const current = alertMap.get(a.clientId) || { count: 0, highestSeverity: null }
      current.count++
      const currentSev = current.highestSeverity ? (severityOrder[current.highestSeverity] || 0) : 0
      const newSev = severityOrder[a.severity] || 0
      if (newSev > currentSev) current.highestSeverity = a.severity
      alertMap.set(a.clientId, current)
    }

    const programMap = new Map<string, { name: string; endDate: Date }>()
    for (const p of activePrograms) {
      if (!programMap.has(p.clientId)) {
        programMap.set(p.clientId, { name: p.name, endDate: p.endDate })
      }
    }

    // Build per-client response
    const roster = clients.map(client => {
      const lastActivityDate = activityMap.get(client.id)
      let daysSinceLastActivity: number | null = null
      if (lastActivityDate) {
        daysSinceLastActivity = Math.floor(
          (now.getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      const metrics = metricsMap.get(client.id)
      const load = loadMap.get(client.id)
      const compliance = complianceMap.get(client.id)
      const alerts = alertMap.get(client.id)
      const program = programMap.get(client.id)

      return {
        id: client.id,
        name: client.name,
        primarySport: client.sportProfile?.primarySport ?? null,
        readinessScore: metrics?.readinessScore ?? null,
        readinessLevel: metrics?.readinessLevel ?? null,
        recommendedAction: metrics?.recommendedAction ?? null,
        acwr: load?.acwr ?? null,
        acwrZone: load?.acwrZone ?? null,
        completedWorkoutsThisWeek: compliance?.completed ?? 0,
        plannedWorkoutsThisWeek: compliance?.planned ?? 0,
        weeklyCompliancePercent: compliance?.percent ?? null,
        injuryCount: injuryMap.get(client.id) ?? 0,
        lastActivityDate: lastActivityDate?.toISOString() ?? null,
        daysSinceLastActivity,
        pendingFeedbackCount: feedbackMap.get(client.id) ?? 0,
        activeAlertCount: alerts?.count ?? 0,
        highestAlertSeverity: alerts?.highestSeverity ?? null,
        hasActiveProgram: !!program,
        programName: program?.name ?? null,
        programEndDate: program?.endDate?.toISOString() ?? null,
      }
    })

    return NextResponse.json({ roster })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
