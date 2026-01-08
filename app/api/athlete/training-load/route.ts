/**
 * Training Load API
 *
 * Calculates training load metrics from synced activities:
 * - Weekly TSS (Training Stress Score)
 * - ACWR (Acute:Chronic Workload Ratio)
 * - Activity breakdown by type
 * - Load trend analysis
 *
 * Uses deduplication to prevent double-counting when same activity
 * is synced from multiple sources (e.g., Strava + Garmin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  deduplicateActivities,
  normalizeStravaActivity,
  normalizeGarminActivity,
  aggregateTSSByDay,
  aggregateByType,
  type NormalizedActivity,
} from '@/lib/training/activity-deduplication'

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

    // Fetch manual TrainingLoad entries (from workout logs)
    const manualTrainingLoads = await prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: twentyEightDaysAgo },
      },
      select: {
        date: true,
        dailyLoad: true,
        loadType: true,
        workoutType: true,
        distance: true,
        duration: true,
      },
      orderBy: { date: 'desc' },
    })

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

    // Fetch Garmin activities from GarminActivity model (Gap 5 fix)
    const garminActivities = await prisma.garminActivity.findMany({
      where: {
        clientId,
        startDate: { gte: twentyEightDaysAgo },
      },
      select: {
        id: true,
        startDate: true,
        duration: true,
        distance: true,
        mappedType: true,
        tss: true,
        trimp: true,
      },
      orderBy: { startDate: 'desc' },
    })

    // Normalize all activities to unified format for deduplication
    const allActivities: NormalizedActivity[] = []

    // Add Strava activities (priority 4)
    for (const activity of stravaActivities) {
      allActivities.push(
        normalizeStravaActivity({
          id: activity.startDate.toISOString() + '-strava', // Unique ID
          startDate: activity.startDate,
          movingTime: activity.movingTime,
          distance: activity.distance,
          mappedType: activity.mappedType,
          tss: activity.tss,
          trimp: activity.trimp,
        })
      )
    }

    // Add Garmin activities (priority 3) - now from GarminActivity model
    for (const activity of garminActivities) {
      allActivities.push(
        normalizeGarminActivity({
          activityId: activity.id,
          tss: activity.tss || undefined,
          duration: activity.duration || undefined,
          mappedType: activity.mappedType || undefined,
          distance: activity.distance || undefined,
          startTimeSeconds: Math.floor(activity.startDate.getTime() / 1000),
        }, activity.startDate)
      )
    }

    // Deduplicate activities from multiple sources
    const { deduplicated, duplicatesRemoved } = deduplicateActivities(allActivities, {
      debug: process.env.NODE_ENV === 'development',
    })

    // Log deduplication results in development
    if (process.env.NODE_ENV === 'development' && duplicatesRemoved > 0) {
      logger.debug('Training load deduplication', { clientId, duplicatesRemoved })
    }

    // Aggregate TSS by day from deduplicated activities
    const dailyTSS = aggregateTSSByDay(deduplicated)

    // Aggregate by type from deduplicated activities
    const byType = aggregateByType(deduplicated)

    // Also add manual TrainingLoad entries (these are separate from synced activities)
    // Manual entries are typically from coach-assigned workouts, not duplicates
    for (const load of manualTrainingLoads) {
      const dateKey = load.date.toISOString().split('T')[0]
      const tss = load.dailyLoad || 0

      dailyTSS[dateKey] = (dailyTSS[dateKey] || 0) + tss

      const type = load.workoutType || 'MANUAL'
      if (!byType[type]) {
        byType[type] = { count: 0, tss: 0, distance: 0 }
      }
      byType[type].count++
      byType[type].tss += tss
      byType[type].distance += (load.distance || 0) / 1000
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
      // Deduplication info for debugging/transparency
      deduplication: {
        totalActivities: allActivities.length + manualTrainingLoads.length,
        duplicatesRemoved,
        sources: {
          strava: stravaActivities.length,
          garmin: allActivities.length - stravaActivities.length,
          manual: manualTrainingLoads.length,
        },
      },
    })
  } catch (error) {
    logger.error('Error calculating training load', {}, error)
    return NextResponse.json({ error: 'Failed to calculate training load' }, { status: 500 })
  }
}

// Estimate TSS from duration if not available
function estimateTSS(durationSeconds: number): number {
  // Rough estimate: 1 hour of moderate activity = ~60 TSS
  return Math.round((durationSeconds / 3600) * 60)
}