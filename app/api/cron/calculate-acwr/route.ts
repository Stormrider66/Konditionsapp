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
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting nightly ACWR calculation...')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all active athletes (have workouts or programs)
    const activeAthletes = await prisma.client.findMany({
      where: {
        OR: [
          { workouts: { some: {} } },
          { programs: { some: {} } },
        ],
      },
      select: { id: true, name: true },
    })

    console.log(`  Found ${activeAthletes.length} active athletes`)

    let processed = 0
    let updated = 0
    let errors = 0

    for (const athlete of activeAthletes) {
      try {
        // Get yesterday's training load (daily TSS/TRIMP)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const yesterdayLog = await prisma.workoutLog.findFirst({
          where: {
            clientId: athlete.id,
            completedAt: {
              gte: yesterday,
              lt: today,
            },
          },
          select: { id: true },
        })

        // Calculate TSS for yesterday (if workout was logged)
        let dailyTSS = 0
        if (yesterdayLog) {
          // Get workout details
          const workoutLog = await prisma.workoutLog.findUnique({
            where: { id: yesterdayLog.id },
            include: {
              workout: true,
            },
          })

          if (workoutLog) {
            // Simple TSS calculation based on duration and intensity
            const duration = workoutLog.duration || workoutLog.workout?.duration || 0
            const intensityMultiplier = {
              RECOVERY: 0.5,
              EASY: 0.6,
              MODERATE: 0.75,
              THRESHOLD: 1.0,
              INTERVAL: 1.2,
              MAX: 1.5,
            }

            const intensity = workoutLog.workout?.intensity as keyof typeof intensityMultiplier
            const multiplier = intensityMultiplier[intensity] || 0.7
            dailyTSS = duration * multiplier
          }
        }

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
            tss: dailyTSS > 0 ? dailyTSS : null,
            trimp: null, // TODO: Calculate TRIMP if HR data available
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
          console.log(`  ⚠️  ${athlete.name}: ACWR ${acwr.toFixed(2)} (${zone})`)
        }
      } catch (athleteError: any) {
        console.error(`  ❌ Error processing ${athlete.name}:`, athleteError.message)
        errors++
        processed++
      }
    }

    console.log('✅ ACWR calculation complete')
    console.log(`  Processed: ${processed}/${activeAthletes.length}`)
    console.log(`  Updated: ${updated}`)
    console.log(`  Errors: ${errors}`)

    return NextResponse.json({
      success: true,
      processed,
      updated,
      errors,
      timestamp: today.toISOString(),
    })
  } catch (error: any) {
    console.error('❌ ACWR calculation job failed:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Require auth for manual triggers too
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}
