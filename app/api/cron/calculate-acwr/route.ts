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
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

// EWMA smoothing factor
const ACUTE_ALPHA = 0.4 // 7-day EWMA
const CHRONIC_ALPHA = 0.1 // 28-day EWMA

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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all active athletes (have training loads or programs)
    const activeAthletes = await prisma.client.findMany({
      where: {
        OR: [
          { trainingLoads: { some: {} } },
          { trainingPrograms: { some: {} } },
        ],
      },
      select: { id: true, name: true },
    })

    logger.info('Found active athletes', { count: activeAthletes.length })

    let processed = 0
    let updated = 0
    let errors = 0

    for (const athlete of activeAthletes) {
      try {
        // Get yesterday's date range
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        // Check if there's already a training load entry for yesterday
        const existingLoad = await prisma.trainingLoad.findFirst({
          where: {
            clientId: athlete.id,
            date: {
              gte: yesterday,
              lt: today,
            },
          },
        })

        // Calculate TSS for yesterday based on existing training load
        let dailyTSS = existingLoad?.dailyLoad || 0

        // Get most recent ACWR entry for this athlete
        const previousEntry = await prisma.trainingLoad.findFirst({
          where: { clientId: athlete.id },
          orderBy: { date: 'desc' },
        })

        // Calculate new EWMA values
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

        // Calculate ACWR (avoid division by zero)
        const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0

        // Determine zone and injury risk
        const { zone, injuryRisk } = determineACWRZone(acwr)

        // Create new TrainingLoad entry
        await prisma.trainingLoad.create({
          data: {
            clientId: athlete.id,
            date: today,
            dailyLoad: dailyTSS,
            loadType: 'TSS',
            duration: 0, // Will be updated from actual workout logs
            intensity: 'MODERATE', // Default
            acuteLoad,
            chronicLoad,
            acwr,
            acwrZone: zone,
            injuryRisk,
          },
        })

        updated++
        processed++

        // Log if athlete is in danger zone
        if (zone === 'DANGER' || zone === 'CRITICAL') {
          logger.warn('Athlete in danger zone', { athleteName: athlete.name, acwr: acwr.toFixed(2), zone })
        }
      } catch (athleteError: unknown) {
        logger.error('Error processing athlete', { athleteName: athlete.name }, athleteError)
        errors++
        processed++
      }
    }

    logger.info('ACWR calculation complete', {
      processed,
      total: activeAthletes.length,
      updated,
      errors
    })

    return NextResponse.json({
      success: true,
      processed,
      updated,
      errors,
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
