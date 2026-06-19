// app/api/cron/calculate-acwr/route.ts
/**
 * Nightly ACWR Calculation Job
 *
 * Automatically calculates Acute:Chronic Workload Ratio (ACWR) for all active athletes
 * to monitor injury risk and prevent overtraining.
 *
 * Trigger: Cron job (daily at 2:00 AM)
 * Method: POST /api/cron/calculate-acwr
 * Auth: Cron secret token (CRON_SECRET environment variable)
 *
 * Algorithm:
 * - Acute Load: 7-day Exponentially Weighted Moving Average (EWMA)
 * - Chronic Load: 28-day Exponentially Weighted Moving Average (EWMA)
 * - ACWR = Acute Load / Chronic Load
 *
 * ACWR Zones:
 * - <0.8: DETRAINING (fitness loss)
 * - 0.8-1.3: OPTIMAL (sweet spot)
 * - 1.3-1.5: CAUTION (moderate risk)
 * - 1.5-2.0: DANGER (high risk)
 * - >2.0: CRITICAL (very high risk)
 *
 * Injury Risk:
 * - ACWR <0.8 or 0.8-1.3: LOW
 * - ACWR 1.3-1.5: MODERATE
 * - ACWR 1.5-2.0: HIGH
 * - ACWR >2.0: VERY_HIGH
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  deduplicateActivities,
  normalizeGarminActivity,
  normalizeStravaActivity,
  type NormalizedActivity,
} from '@/lib/training/activity-deduplication'
import { hasReliableAcwrSummary } from '@/lib/training/acwr-confidence'

export const maxDuration = 300

// EWMA smoothing factor
const ACUTE_ALPHA = 0.4 // 7-day EWMA
const CHRONIC_ALPHA = 0.1 // 28-day EWMA

const CREATE_CHUNK_SIZE = 1000

interface ACWRZone {
  zone: 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'
  injuryRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
}

function determineACWRZone(acwr: number): ACWRZone {
  if (acwr < 0.8) {
    return { zone: 'DETRAINING', injuryRisk: 'LOW' }
  } else if (acwr >= 0.8 && acwr <= 1.3) {
    return { zone: 'OPTIMAL', injuryRisk: 'LOW' }
  } else if (acwr > 1.3 && acwr <= 1.5) {
    return { zone: 'CAUTION', injuryRisk: 'MODERATE' }
  } else if (acwr > 1.5 && acwr <= 2.0) {
    return { zone: 'DANGER', injuryRisk: 'HIGH' }
  } else {
    return { zone: 'CRITICAL', injuryRisk: 'VERY_HIGH' }
  }
}

function calculateEWMA(
  previousEWMA: number | null,
  newValue: number,
  alpha: number
): number {
  if (previousEWMA === null) {
    return newValue
  }
  return alpha * newValue + (1 - alpha) * previousEWMA
}

function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ))
}

async function getSyncedActivityLoadByClient(
  clientIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  if (clientIds.length === 0) {
    return new Map()
  }

  const [stravaActivities, garminActivities] = await Promise.all([
    prisma.stravaActivity.findMany({
      where: {
        clientId: { in: clientIds },
        startDate: { gte: startDate, lt: endDate },
        tss: { not: null },
      },
      select: {
        id: true,
        clientId: true,
        stravaId: true,
        startDate: true,
        movingTime: true,
        distance: true,
        mappedType: true,
        type: true,
        tss: true,
        trimp: true,
        averageHeartrate: true,
      },
    }),
    prisma.garminActivity.findMany({
      where: {
        clientId: { in: clientIds },
        startDate: { gte: startDate, lt: endDate },
        tss: { not: null },
        adHocWorkout: null,
        cardioSessionLog: null,
        hybridWorkoutLog: null,
      },
      select: {
        id: true,
        clientId: true,
        startDate: true,
        duration: true,
        distance: true,
        mappedType: true,
        type: true,
        tss: true,
        trimp: true,
        averageHeartrate: true,
      },
    }),
  ])

  const activitiesByClient = new Map<string, NormalizedActivity[]>()
  const addActivity = (clientId: string, activity: NormalizedActivity) => {
    const activities = activitiesByClient.get(clientId) ?? []
    activities.push(activity)
    activitiesByClient.set(clientId, activities)
  }

  for (const activity of stravaActivities) {
    addActivity(
      activity.clientId,
      normalizeStravaActivity({
        id: activity.id,
        stravaId: activity.stravaId,
        startDate: activity.startDate,
        movingTime: activity.movingTime,
        distance: activity.distance,
        mappedType: activity.mappedType,
        type: activity.type,
        tss: activity.tss,
        trimp: activity.trimp,
        averageHeartrate: activity.averageHeartrate,
      })
    )
  }

  for (const activity of garminActivities) {
    addActivity(
      activity.clientId,
      normalizeGarminActivity(
        {
          activityId: activity.id,
          type: activity.type,
          mappedType: activity.mappedType ?? undefined,
          duration: activity.duration ?? undefined,
          distance: activity.distance ?? undefined,
          tss: activity.tss ?? undefined,
          avgHR: activity.averageHeartrate ?? undefined,
          startTimeSeconds: Math.floor(activity.startDate.getTime() / 1000),
        },
        activity.startDate
      )
    )
  }

  const loadByClient = new Map<string, number>()
  for (const [clientId, activities] of activitiesByClient.entries()) {
    const { deduplicated } = deduplicateActivities(activities)
    const load = deduplicated.reduce((sum, activity) => sum + (activity.tss ?? 0), 0)
    loadByClient.set(clientId, load)
  }

  return loadByClient
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (REQUIRED)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not configured', {})
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET not set' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting nightly ACWR calculation')

    const today = startOfUtcDay()

    // Get all active athletes (have training loads or programs)
    const activeAthletes = await prisma.client.findMany({
      where: {
        OR: [
          { trainingLoads: { some: {} } },
          { trainingPrograms: { some: {} } },
          { garminActivities: { some: {} } },
          { stravaActivities: { some: {} } },
        ],
      },
      select: { id: true, name: true },
    })

    logger.info('Found active athletes', { count: activeAthletes.length })

    const allIds = activeAthletes.map((a) => a.id)

    // Skip athletes that already have today's summary so a re-run (or a
    // retry after a partial failure) resumes instead of writing duplicates.
    const existingToday = await prisma.trainingLoad.findMany({
      where: {
        clientId: { in: allIds },
        source: 'ACWR_SUMMARY',
        date: today,
      },
      select: { clientId: true },
    })
    const alreadyProcessed = new Set(existingToday.map((r) => r.clientId))
    const athletes = activeAthletes.filter((a) => !alreadyProcessed.has(a.id))

    if (athletes.length === 0) {
      logger.info('ACWR calculation complete', {
        processed: 0,
        total: activeAthletes.length,
        skipped: alreadyProcessed.size,
        updated: 0,
        errors: 0,
      })
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: alreadyProcessed.size,
        updated: 0,
        errors: 0,
        timestamp: today.toISOString(),
      })
    }

    const ids = athletes.map((a) => a.id)

    const yesterday = new Date(today)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)

    // Sum all workout-sourced load entries for yesterday in one grouped
    // query. Rows written by this cron are ACWR_SUMMARY and duplicate the
    // workout rows' dailyLoad, so they must be excluded from the sum.
    const loadSums = await prisma.trainingLoad.groupBy({
      by: ['clientId'],
      where: {
        clientId: { in: ids },
        date: {
          gte: yesterday,
          lt: today,
        },
        source: 'WORKOUT',
      },
      _sum: { dailyLoad: true },
    })
    const loadByClient = new Map(
      loadSums.map((r) => [r.clientId, r._sum.dailyLoad || 0])
    )
    const syncedLoadByClient = await getSyncedActivityLoadByClient(ids, yesterday, today)

    // Most recent ACWR carrier entry per athlete (a plain workout row would
    // reset the moving averages). DISTINCT ON walks the
    // (clientId, source, date) index instead of one findFirst per athlete.
    const previousEntries = await prisma.$queryRaw<
      {
        clientId: string
        acuteLoad: number | null
        chronicLoad: number | null
        summaryCount: number | bigint | null
      }[]
    >`
      SELECT DISTINCT ON ("clientId")
        "clientId",
        "acuteLoad",
        "chronicLoad",
        COUNT(*) OVER (PARTITION BY "clientId") AS "summaryCount"
      FROM "TrainingLoad"
      WHERE "source" = 'ACWR_SUMMARY'
        AND "clientId" = ANY(${ids})
        AND "date" < ${today}
      ORDER BY "clientId", "date" DESC
    `
    const previousByClient = new Map(previousEntries.map((r) => [r.clientId, r]))

    const rows = athletes.map((athlete) => {
      const dailyTSS =
        (loadByClient.get(athlete.id) || 0) +
        (syncedLoadByClient.get(athlete.id) || 0)
      const previousEntry = previousByClient.get(athlete.id)

      const acuteLoad = calculateEWMA(
        previousEntry?.acuteLoad ?? null,
        dailyTSS,
        ACUTE_ALPHA
      )
      const chronicLoad = calculateEWMA(
        previousEntry?.chronicLoad ?? null,
        dailyTSS,
        CHRONIC_ALPHA
      )

      // Calculate ACWR (avoid division by zero), but do not publish the risk
      // signal until the EWMA baseline has enough daily summary history.
      const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0
      const previousSummaryCount = Number(previousEntry?.summaryCount ?? 0)
      const hasReliableAcwr = hasReliableAcwrSummary(previousSummaryCount + 1)
      const acwrZone = hasReliableAcwr ? determineACWRZone(acwr) : null

      if (acwrZone?.zone === 'DANGER' || acwrZone?.zone === 'CRITICAL') {
        logger.warn('Athlete in danger zone', { athleteName: athlete.name, acwr: acwr.toFixed(2), zone: acwrZone.zone })
      }

      return {
        clientId: athlete.id,
        date: today,
        source: 'ACWR_SUMMARY' as const,
        dailyLoad: dailyTSS,
        loadType: 'TSS',
        duration: 0, // Will be updated from actual workout logs
        intensity: 'MODERATE', // Default
        acuteLoad,
        chronicLoad,
        acwr: hasReliableAcwr ? acwr : null,
        acwrZone: acwrZone?.zone ?? null,
        injuryRisk: acwrZone?.injuryRisk ?? null,
      }
    })

    let updated = 0
    for (let i = 0; i < rows.length; i += CREATE_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CREATE_CHUNK_SIZE)
      const result = await prisma.trainingLoad.createMany({ data: chunk })
      updated += result.count
    }

    logger.info('ACWR calculation complete', {
      processed: athletes.length,
      total: activeAthletes.length,
      skipped: alreadyProcessed.size,
      updated,
      errors: 0,
    })

    return NextResponse.json({
      success: true,
      processed: athletes.length,
      skipped: alreadyProcessed.size,
      updated,
      errors: 0,
      timestamp: today.toISOString(),
    })
  } catch (error: unknown) {
    logger.error('ACWR calculation job failed', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// Allow GET for manual testing (requires same authentication)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}
