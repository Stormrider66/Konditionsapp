/**
 * Training Load API
 *
 * Calculates training load metrics from synced activities:
 * - Weekly TSS (Training Stress Score)
 * - ACWR (Acute:Chronic Workload Ratio)
 * - Activity breakdown by type
 * - Load trend analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    // Verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === user.id
    const isAthlete = client.athleteAccount?.userId === user.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const twentyEightDaysAgo = new Date(now)
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

    // Fetch Strava activities for last 28 days
    const stravaActivities = await prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: { gte: twentyEightDaysAgo },
      },
      select: {
        startDate: true,
        tss: true,
        trimp: true,
        mappedType: true,
        distance: true,
        movingTime: true,
      },
      orderBy: { startDate: 'desc' },
    })

    // Fetch Garmin activities from DailyMetrics
    const dailyMetrics = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: { gte: twentyEightDaysAgo },
      },
      select: {
        date: true,
        factorScores: true,
      },
    })

    // Aggregate TSS by day
    const dailyTSS: Record<string, number> = {}
    const byType: Record<string, { count: number; tss: number; distance: number }> = {}

    // Process Strava activities
    for (const activity of stravaActivities) {
      const dateKey = activity.startDate.toISOString().split('T')[0]
      const tss = activity.tss || estimateTSS(activity.movingTime || 0)

      dailyTSS[dateKey] = (dailyTSS[dateKey] || 0) + tss

      const type = activity.mappedType || 'OTHER'
      if (!byType[type]) {
        byType[type] = { count: 0, tss: 0, distance: 0 }
      }
      byType[type].count++
      byType[type].tss += tss
      byType[type].distance += (activity.distance || 0) / 1000
    }

    // Process Garmin activities
    for (const metric of dailyMetrics) {
      const factorScores = metric.factorScores as {
        garminActivities?: Array<{
          tss?: number
          duration?: number
          mappedType?: string
          distance?: number
        }>
      } | null

      const garminActivities = factorScores?.garminActivities || []
      const dateKey = metric.date.toISOString().split('T')[0]

      for (const activity of garminActivities) {
        const tss = activity.tss || estimateTSS(activity.duration || 0)

        // Avoid double counting if also in Strava
        if (!dailyTSS[dateKey]) {
          dailyTSS[dateKey] = 0
        }
        dailyTSS[dateKey] += tss

        const type = activity.mappedType || 'OTHER'
        if (!byType[type]) {
          byType[type] = { count: 0, tss: 0, distance: 0 }
        }
        byType[type].count++
        byType[type].tss += tss
        byType[type].distance += (activity.distance || 0) / 1000
      }
    }

    // Calculate acute load (7 days) and chronic load (28 days)
    let acuteLoad = 0
    let chronicLoad = 0
    let previousWeekLoad = 0

    const dates = Object.keys(dailyTSS).sort()

    for (const dateStr of dates) {
      const date = new Date(dateStr)
      const tss = dailyTSS[dateStr]

      if (date >= sevenDaysAgo) {
        acuteLoad += tss
      }
      if (date >= fourteenDaysAgo && date < sevenDaysAgo) {
        previousWeekLoad += tss
      }
      chronicLoad += tss
    }

    // Calculate averages
    const weeklyTSS = acuteLoad
    const dailyAvgTSS = Math.round(acuteLoad / 7)
    const chronicAvg = Math.round(chronicLoad / 28)

    // ACWR calculation (using 28-day chronic)
    const acwr = chronicAvg > 0 ? (dailyAvgTSS / chronicAvg) : 0

    // Determine risk level based on ACWR
    let riskLevel: 'low' | 'optimal' | 'high' | 'very_high' = 'optimal'
    if (acwr < 0.8) {
      riskLevel = 'low'
    } else if (acwr > 1.5) {
      riskLevel = 'very_high'
    } else if (acwr > 1.3) {
      riskLevel = 'high'
    }

    // Determine trend
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable'
    if (acuteLoad > previousWeekLoad * 1.15) {
      trend = 'increasing'
    } else if (acuteLoad < previousWeekLoad * 0.85) {
      trend = 'decreasing'
    }

    return NextResponse.json({
      weeklyTSS: Math.round(weeklyTSS),
      dailyAvgTSS,
      acuteLoad: Math.round(acuteLoad),
      chronicLoad: Math.round(chronicLoad),
      acwr: parseFloat(acwr.toFixed(2)),
      byType,
      trend,
      riskLevel,
    })
  } catch (error) {
    console.error('Error calculating training load:', error)
    return NextResponse.json({ error: 'Failed to calculate training load' }, { status: 500 })
  }
}

// Estimate TSS from duration if not available
function estimateTSS(durationSeconds: number): number {
  // Rough estimate: 1 hour of moderate activity = ~60 TSS
  return Math.round((durationSeconds / 3600) * 60)
}
