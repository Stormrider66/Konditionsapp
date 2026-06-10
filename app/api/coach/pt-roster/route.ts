import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays, startOfWeek, endOfWeek } from 'date-fns'
import { getCoachScopedIds } from '@/lib/coach/scoping'

type EngagementLevel = 'ACTIVE' | 'MODERATE' | 'INACTIVE' | 'NEW'

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const scope = getRequestedBusinessScope(request)

    // Get active business membership + role for scoping. Business-scoped dashboards
    // pass businessSlug so coaches in multiple businesses do not fall back to the
    // first membership.
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        ...(scope.businessSlug
          ? { business: { slug: scope.businessSlug, isActive: true } }
          : {}),
      },
      select: { businessId: true, role: true },
      orderBy: { createdAt: 'asc' },
    })

    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]
    const clientWhere = {
      userId: { in: coachIds },
      ...(membership ? { businessId: membership.businessId } : {}),
    }

    const sevenDaysAgo = subDays(now, 7)

    // 14 parallel queries for per-client status
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
      stravaLastActivities,
      garminLastActivities,
      integrationTokens,
      stravaWeekly,
      garminWeekly,
    ] = await Promise.all([
      // 1. Clients with sport profile
      prisma.client.findMany({
        where: clientWhere,
        select: {
          id: true,
          name: true,
          sportProfile: { select: { primarySport: true } },
        },
      }),

      // 2. Latest DailyMetrics per client — readiness
      prisma.dailyMetrics.findMany({
        where: {
          client: clientWhere,
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

      // 3. Latest TrainingLoad per client — ACWR. Only ACWR_SUMMARY rows
      // carry acwr; a newer workout row would otherwise mask it.
      prisma.trainingLoad.findMany({
        where: {
          client: clientWhere,
          date: { gte: subDays(now, 7) },
          source: 'ACWR_SUMMARY',
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
          client: clientWhere,
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
            day: { week: { program: { coachId: { in: coachIds }, client: clientWhere } } },
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
            day: { week: { program: { coachId: { in: coachIds }, client: clientWhere } } },
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

      // 8. Active coach alerts
      prisma.coachAlert.findMany({
        where: {
          coachId: user.id,
          client: clientWhere,
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
          client: clientWhere,
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

      // 10. Strava — last activity + this-week count per client
      prisma.stravaActivity.groupBy({
        by: ['clientId'],
        where: {
          client: clientWhere,
        },
        _max: { startDate: true },
        _count: { id: true },
      }),

      // 11. Garmin — last activity + this-week count per client
      prisma.garminActivity.groupBy({
        by: ['clientId'],
        where: {
          client: clientWhere,
        },
        _max: { startDate: true },
        _count: { id: true },
      }),

      // 12. Integration tokens — which clients have Strava/Garmin connected
      prisma.integrationToken.findMany({
        where: {
          client: clientWhere,
          type: { in: ['STRAVA', 'GARMIN'] },
          syncEnabled: true,
        },
        select: {
          clientId: true,
          type: true,
        },
      }),

      // 13. Strava activities this week per client
      prisma.stravaActivity.groupBy({
        by: ['clientId'],
        where: {
          client: clientWhere,
          startDate: { gte: sevenDaysAgo },
        },
        _count: { id: true },
      }),

      // 14. Garmin activities this week per client
      prisma.garminActivity.groupBy({
        by: ['clientId'],
        where: {
          client: clientWhere,
          startDate: { gte: sevenDaysAgo },
        },
        _count: { id: true },
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

    const programActivityMap = new Map<string, Date | null>()
    for (const a of lastActivities) {
      programActivityMap.set(a.athleteId, a._max.completedAt)
    }

    const stravaActivityMap = new Map<string, Date | null>()
    for (const s of stravaLastActivities) {
      stravaActivityMap.set(s.clientId, s._max.startDate)
    }

    const garminActivityMap = new Map<string, Date | null>()
    for (const g of garminLastActivities) {
      garminActivityMap.set(g.clientId, g._max.startDate)
    }

    const integrationMap = new Map<string, { strava: boolean; garmin: boolean }>()
    for (const t of integrationTokens) {
      const current = integrationMap.get(t.clientId) || { strava: false, garmin: false }
      if (t.type === 'STRAVA') current.strava = true
      if (t.type === 'GARMIN') current.garmin = true
      integrationMap.set(t.clientId, current)
    }

    const stravaWeeklyMap = new Map<string, number>()
    for (const s of stravaWeekly) {
      stravaWeeklyMap.set(s.clientId, s._count.id)
    }

    const garminWeeklyMap = new Map<string, number>()
    for (const g of garminWeekly) {
      garminWeeklyMap.set(g.clientId, g._count.id)
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
      // Compute best lastActivity across all sources
      const programDate = programActivityMap.get(client.id)
      const stravaDate = stravaActivityMap.get(client.id)
      const garminDate = garminActivityMap.get(client.id)

      const candidates: { date: Date; source: 'program' | 'strava' | 'garmin' }[] = []
      if (programDate) candidates.push({ date: new Date(programDate), source: 'program' })
      if (stravaDate) candidates.push({ date: new Date(stravaDate), source: 'strava' })
      if (garminDate) candidates.push({ date: new Date(garminDate), source: 'garmin' })

      candidates.sort((a, b) => b.date.getTime() - a.date.getTime())
      const bestActivity = candidates[0] ?? null

      let daysSinceLastActivity: number | null = null
      if (bestActivity) {
        daysSinceLastActivity = Math.floor(
          (now.getTime() - bestActivity.date.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      // Weekly activity count from all sources
      const programCompleted = complianceMap.get(client.id)?.completed ?? 0
      const stravaThisWeek = stravaWeeklyMap.get(client.id) ?? 0
      const garminThisWeek = garminWeeklyMap.get(client.id) ?? 0
      const totalActivitiesThisWeek = programCompleted + stravaThisWeek + garminThisWeek

      // Integration status
      const integrations = integrationMap.get(client.id) || { strava: false, garmin: false }

      // Engagement level
      let engagementLevel: EngagementLevel = 'NEW'
      if (bestActivity) {
        if (daysSinceLastActivity !== null && daysSinceLastActivity <= 2) {
          engagementLevel = 'ACTIVE'
        } else if (daysSinceLastActivity !== null && daysSinceLastActivity <= 7) {
          engagementLevel = 'MODERATE'
        } else {
          engagementLevel = 'INACTIVE'
        }
      } else if (integrations.strava || integrations.garmin) {
        // Has integration but never synced any activity
        engagementLevel = 'INACTIVE'
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
        lastActivityDate: bestActivity?.date.toISOString() ?? null,
        lastActivitySource: bestActivity?.source ?? null,
        daysSinceLastActivity,
        totalActivitiesThisWeek,
        pendingFeedbackCount: feedbackMap.get(client.id) ?? 0,
        activeAlertCount: alerts?.count ?? 0,
        highestAlertSeverity: alerts?.highestSeverity ?? null,
        hasActiveProgram: !!program,
        programName: program?.name ?? null,
        programEndDate: program?.endDate?.toISOString() ?? null,
        hasStravaConnected: integrations.strava,
        hasGarminConnected: integrations.garmin,
        engagementLevel,
      }
    })

    return NextResponse.json({ roster })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
