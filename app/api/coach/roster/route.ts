import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import { getCoachScopedIds } from '@/lib/coach/scoping'

export async function GET() {
  try {
    const user = await requireCoach()
    const now = new Date()

    // Get first active business membership + role for scoping
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: { businessId: true, role: true },
    })

    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]

    // Fetch all clients with related status data in parallel
    const [clients, latestMetrics, latestLoads, activeInjuries] = await Promise.all([
      prisma.client.findMany({
        where: { userId: { in: coachIds } },
        select: {
          id: true,
          name: true,
          sportProfile: {
            select: { primarySport: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.dailyMetrics.findMany({
        where: {
          client: { userId: { in: coachIds } },
          date: { gte: subDays(now, 2) },
        },
        select: {
          clientId: true,
          readinessScore: true,
          readinessLevel: true,
          date: true,
        },
        orderBy: { date: 'desc' },
      }),
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
      prisma.injuryAssessment.groupBy({
        by: ['clientId'],
        where: {
          client: { userId: { in: coachIds } },
          status: { in: ['ACTIVE', 'MONITORING'] },
          resolved: false,
        },
        _count: { id: true },
      }),
    ])

    // Build lookup maps
    const metricsMap = new Map<string, { readinessScore: number | null; readinessLevel: string | null }>()
    latestMetrics.forEach(m => {
      if (!metricsMap.has(m.clientId)) {
        metricsMap.set(m.clientId, { readinessScore: m.readinessScore, readinessLevel: m.readinessLevel })
      }
    })

    const loadMap = new Map<string, { acwr: number | null; acwrZone: string | null }>()
    latestLoads.forEach(l => {
      if (!loadMap.has(l.clientId)) {
        loadMap.set(l.clientId, { acwr: l.acwr, acwrZone: l.acwrZone })
      }
    })

    const injuryMap = new Map<string, number>()
    activeInjuries.forEach(i => {
      injuryMap.set(i.clientId, i._count.id)
    })

    // Get last workout activity per client
    const lastActivities = await prisma.workoutLog.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: clients.map(c => c.id) },
        completed: true,
      },
      _max: { completedAt: true },
    })

    const activityMap = new Map<string, Date | null>()
    lastActivities.forEach(a => {
      activityMap.set(a.athleteId, a._max.completedAt)
    })

    // Build roster response
    const roster = clients.map(client => ({
      id: client.id,
      name: client.name,
      primarySport: client.sportProfile?.primarySport ?? null,
      team: client.team ?? null,
      readinessScore: metricsMap.get(client.id)?.readinessScore ?? null,
      readinessLevel: metricsMap.get(client.id)?.readinessLevel ?? null,
      acwr: loadMap.get(client.id)?.acwr ?? null,
      acwrZone: loadMap.get(client.id)?.acwrZone ?? null,
      injuryCount: injuryMap.get(client.id) ?? 0,
      lastActivity: activityMap.get(client.id) ?? null,
    }))

    return NextResponse.json({ roster })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
