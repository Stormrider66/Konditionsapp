import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays, startOfWeek } from 'date-fns'
import { getCoachScopedIds } from '@/lib/coach/scoping'

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const clientId = request.nextUrl.searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    // Get coach scope
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]

    const now = new Date()
    const fourteenDaysAgo = subDays(now, 14)
    const fiveWeeksAgo = subDays(now, 35)
    const tenDaysAgo = subDays(now, 10)

    // 8 parallel queries
    const [
      client,
      dailyMetrics,
      weeklySummaries,
      stravaActivities,
      garminActivities,
      alerts,
      injuries,
    ] = await Promise.all([
      // 1. Client with sport profile
      prisma.client.findFirst({
        where: { id: clientId, userId: { in: coachIds } },
        select: {
          id: true,
          name: true,
          sportProfile: { select: { primarySport: true } },
        },
      }),

      // 2. Daily metrics — last 14 days
      prisma.dailyMetrics.findMany({
        where: { clientId, date: { gte: fourteenDaysAgo } },
        select: {
          date: true,
          hrvRMSSD: true,
          hrvStatus: true,
          hrvTrend: true,
          restingHR: true,
          restingHRStatus: true,
          sleepQuality: true,
          sleepHours: true,
          readinessScore: true,
          readinessLevel: true,
          energyLevel: true,
          mood: true,
          stress: true,
          muscleSoreness: true,
        },
        orderBy: { date: 'asc' },
      }),

      // 3. Weekly training summaries — last 5 weeks
      prisma.weeklyTrainingSummary.findMany({
        where: {
          clientId,
          weekStart: { gte: fiveWeeksAgo },
        },
        select: {
          weekStart: true,
          weekNumber: true,
          totalDistance: true,
          totalDuration: true,
          totalTSS: true,
          completedWorkoutCount: true,
          zone1Minutes: true,
          zone2Minutes: true,
          zone3Minutes: true,
          zone4Minutes: true,
          zone5Minutes: true,
          polarizationRatio: true,
          acwrAtWeekEnd: true,
        },
        orderBy: { weekStart: 'asc' },
      }),

      // 4. Strava activities — last 10
      prisma.stravaActivity.findMany({
        where: { clientId, startDate: { gte: tenDaysAgo } },
        select: {
          id: true,
          name: true,
          type: true,
          mappedType: true,
          startDate: true,
          distance: true,
          movingTime: true,
          averageHeartrate: true,
          maxHeartrate: true,
          averageSpeed: true,
          averageCadence: true,
          elevationGain: true,
        },
        orderBy: { startDate: 'desc' },
        take: 10,
      }),

      // 5. Garmin activities — last 10
      prisma.garminActivity.findMany({
        where: { clientId, startDate: { gte: tenDaysAgo } },
        select: {
          id: true,
          name: true,
          type: true,
          mappedType: true,
          startDate: true,
          distance: true,
          duration: true,
          averageHeartrate: true,
          maxHeartrate: true,
          averageSpeed: true,
          averageCadence: true,
          averageWatts: true,
          elevationGain: true,
        },
        orderBy: { startDate: 'desc' },
        take: 10,
      }),

      // 6. Active coach alerts for this client
      prisma.coachAlert.findMany({
        where: {
          coachId: user.id,
          clientId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          alertType: true,
          severity: true,
          title: true,
          message: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 7. Active injuries
      prisma.injuryAssessment.findMany({
        where: {
          clientId,
          status: { in: ['ACTIVE', 'MONITORING'] },
          resolved: false,
        },
        select: {
          id: true,
          bodyPart: true,
          side: true,
          painLevel: true,
          phase: true,
          status: true,
        },
      }),
    ])

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Merge Strava + Garmin activities, sorted by date desc
    const recentActivities = [
      ...stravaActivities.map(a => ({
        id: a.id,
        source: 'strava' as const,
        name: a.name || 'Aktivitet',
        type: a.mappedType || a.type || 'Unknown',
        startDate: a.startDate.toISOString(),
        distance: a.distance,
        duration: a.movingTime,
        avgHR: a.averageHeartrate,
        maxHR: a.maxHeartrate,
        avgSpeed: a.averageSpeed,
        avgCadence: a.averageCadence,
        avgWatts: null as number | null,
        elevationGain: a.elevationGain,
      })),
      ...garminActivities.map(a => ({
        id: a.id,
        source: 'garmin' as const,
        name: a.name || 'Aktivitet',
        type: a.mappedType || a.type || 'Unknown',
        startDate: a.startDate.toISOString(),
        distance: a.distance,
        duration: a.duration,
        avgHR: a.averageHeartrate,
        maxHR: a.maxHeartrate,
        avgSpeed: a.averageSpeed,
        avgCadence: a.averageCadence,
        avgWatts: a.averageWatts,
        elevationGain: a.elevationGain,
      })),
    ]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 10)

    // Current week zone distribution
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const currentWeek = weeklySummaries.find(
      w => new Date(w.weekStart).getTime() >= currentWeekStart.getTime()
    )

    return NextResponse.json({
      clientId: client.id,
      name: client.name,
      primarySport: client.sportProfile?.primarySport ?? null,

      dailyMetrics: dailyMetrics.map(m => ({
        date: m.date.toISOString().split('T')[0],
        hrvRMSSD: m.hrvRMSSD,
        hrvStatus: m.hrvStatus,
        hrvTrend: m.hrvTrend,
        restingHR: m.restingHR,
        restingHRStatus: m.restingHRStatus,
        sleepQuality: m.sleepQuality,
        sleepHours: m.sleepHours,
        readinessScore: m.readinessScore,
        readinessLevel: m.readinessLevel,
        energyLevel: m.energyLevel,
        mood: m.mood,
        stress: m.stress,
        muscleSoreness: m.muscleSoreness,
      })),

      weeklySummaries: weeklySummaries.map(w => ({
        weekStart: w.weekStart.toISOString().split('T')[0],
        weekNumber: w.weekNumber,
        totalDistance: w.totalDistance,
        totalDuration: w.totalDuration,
        totalTSS: w.totalTSS,
        workoutCount: w.completedWorkoutCount ?? 0,
        zone1Minutes: w.zone1Minutes,
        zone2Minutes: w.zone2Minutes,
        zone3Minutes: w.zone3Minutes,
        zone4Minutes: w.zone4Minutes,
        zone5Minutes: w.zone5Minutes,
        polarizationRatio: w.polarizationRatio,
        acwrAtWeekEnd: w.acwrAtWeekEnd,
      })),

      currentZoneDistribution: currentWeek
        ? {
            zone1Minutes: currentWeek.zone1Minutes,
            zone2Minutes: currentWeek.zone2Minutes,
            zone3Minutes: currentWeek.zone3Minutes,
            zone4Minutes: currentWeek.zone4Minutes,
            zone5Minutes: currentWeek.zone5Minutes,
            totalMinutes: currentWeek.zone1Minutes + currentWeek.zone2Minutes + currentWeek.zone3Minutes + currentWeek.zone4Minutes + currentWeek.zone5Minutes,
            polarizationRatio: currentWeek.polarizationRatio,
          }
        : null,

      recentActivities,

      alerts: alerts.map(a => ({
        id: a.id,
        alertType: a.alertType,
        severity: a.severity,
        title: a.title,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),

      injuries: injuries.map(i => ({
        id: i.id,
        bodyPart: i.bodyPart,
        side: i.side,
        painLevel: i.painLevel,
        phase: i.phase,
        status: i.status,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
