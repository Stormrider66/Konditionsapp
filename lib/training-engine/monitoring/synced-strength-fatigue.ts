/**
 * Synced Strength Fatigue Calculator
 *
 * Calculates objective muscular fatigue from synced strength activities
 * in Strava and Garmin. This complements the subjective muscle soreness
 * rating (1-10) that athletes report in their daily check-in.
 *
 * Factors considered:
 * - Total strength volume in last 7 days (duration)
 * - Number of strength sessions
 * - Days since last strength session (recovery time)
 * - Intensity based on RPE or HR if available
 */

import { PrismaClient } from '@prisma/client'

export interface SyncedStrengthFatigue {
  /** Fatigue score 0-10 (10 = fresh, 0 = very fatigued) */
  score: number
  /** Total strength training duration in last 7 days (minutes) */
  strengthVolume7d: number
  /** Number of strength sessions in last 7 days */
  strengthSessions7d: number
  /** Date of last strength session, null if none */
  lastStrengthDate: Date | null
  /** Days since last strength session */
  daysSinceLastStrength: number
  /** Warning message if fatigue is high */
  warning?: string
  /** Source breakdown */
  sources: {
    strava: number
    garmin: number
  }
}

interface StrengthActivity {
  date: Date
  duration: number // seconds
  source: 'strava' | 'garmin'
  avgHR?: number
}

/**
 * Calculate synced strength fatigue for an athlete
 *
 * @param clientId - The athlete's client ID
 * @param prisma - Prisma client instance
 * @returns Strength fatigue metrics
 */
export async function calculateSyncedStrengthFatigue(
  clientId: string,
  prisma: PrismaClient
): Promise<SyncedStrengthFatigue> {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Collect strength activities from both sources
  const strengthActivities: StrengthActivity[] = []

  // 1. Query Strava for strength activities (WeightTraining, Crossfit, etc.)
  try {
    const stravaActivities = await prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: { gte: sevenDaysAgo },
        OR: [
          { mappedType: 'STRENGTH' },
          { type: { in: ['WeightTraining', 'Crossfit', 'Workout', 'HIIT'] } },
        ],
      },
      select: {
        startDate: true,
        movingTime: true,
        averageHeartrate: true,
      },
    })

    for (const activity of stravaActivities) {
      strengthActivities.push({
        date: activity.startDate,
        duration: activity.movingTime || 0,
        source: 'strava',
        avgHR: activity.averageHeartrate || undefined,
      })
    }
  } catch (error) {
    console.error('Error fetching Strava strength activities:', error)
  }

  // 2. Query Garmin strength activities from GarminActivity model (Gap 5 fix)
  try {
    const garminActivities = await prisma.garminActivity.findMany({
      where: {
        clientId,
        startDate: { gte: sevenDaysAgo },
        OR: [
          { mappedType: 'STRENGTH' },
          { type: { contains: 'STRENGTH' } },
          { type: { contains: 'WEIGHT' } },
          { type: { in: ['HIIT', 'PILATES', 'YOGA'] } },
        ],
      },
      select: {
        startDate: true,
        duration: true,
        averageHeartrate: true,
      },
    })

    for (const activity of garminActivities) {
      strengthActivities.push({
        date: activity.startDate,
        duration: activity.duration || 0,
        source: 'garmin',
        avgHR: activity.averageHeartrate || undefined,
      })
    }
  } catch (error) {
    console.error('Error fetching Garmin strength activities:', error)
  }

  // Calculate metrics
  const stravaSessions = strengthActivities.filter(a => a.source === 'strava').length
  const garminSessions = strengthActivities.filter(a => a.source === 'garmin').length
  const totalSessions = strengthActivities.length
  const totalDurationSeconds = strengthActivities.reduce((sum, a) => sum + a.duration, 0)
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60)

  // Find last strength session
  let lastStrengthDate: Date | null = null
  if (strengthActivities.length > 0) {
    strengthActivities.sort((a, b) => b.date.getTime() - a.date.getTime())
    lastStrengthDate = strengthActivities[0].date
  }

  // Calculate days since last strength
  let daysSinceLastStrength = 999
  if (lastStrengthDate) {
    daysSinceLastStrength = Math.floor(
      (now.getTime() - lastStrengthDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  // Calculate fatigue score (10 = fresh, 0 = fatigued)
  // Factors:
  // - Volume penalty: More volume = more fatigue
  // - Frequency penalty: More sessions = more fatigue
  // - Recovery bonus: More days since last session = more recovered

  let score = 10

  // Volume penalty (baseline: 180 min/week = 3x 60min sessions)
  // Over 240 min/week starts to increase fatigue significantly
  if (totalDurationMinutes > 0) {
    const volumeRatio = totalDurationMinutes / 180 // Normalized to typical week
    score -= Math.min(4, volumeRatio * 2) // Max 4 points penalty
  }

  // Frequency penalty (baseline: 3 sessions/week)
  // More than 4 sessions = additional fatigue
  if (totalSessions > 3) {
    score -= Math.min(2, (totalSessions - 3) * 0.5) // Max 2 points penalty
  }

  // Recovery bonus (if no strength in 48h+, add recovery)
  if (daysSinceLastStrength >= 2) {
    score += Math.min(2, (daysSinceLastStrength - 1) * 0.5) // Max 2 points bonus
  } else if (daysSinceLastStrength === 0) {
    // Trained today - additional fatigue
    score -= 1
  }

  // Clamp score between 0 and 10
  score = Math.max(0, Math.min(10, score))
  score = Math.round(score * 10) / 10 // Round to 1 decimal

  // Generate warning if needed
  let warning: string | undefined
  if (score < 4) {
    warning = 'Hög muskulär belastning - överväg vila eller lättare pass'
  } else if (score < 6) {
    warning = 'Måttlig muskulär trötthet - planera återhämtning'
  }

  return {
    score,
    strengthVolume7d: totalDurationMinutes,
    strengthSessions7d: totalSessions,
    lastStrengthDate,
    daysSinceLastStrength: daysSinceLastStrength === 999 ? -1 : daysSinceLastStrength,
    warning,
    sources: {
      strava: stravaSessions,
      garmin: garminSessions,
    },
  }
}

/**
 * Blend objective synced strength fatigue with subjective muscle soreness
 *
 * @param objectiveFatigue - Calculated from synced activities (0-10, 10 = fresh)
 * @param subjectiveSoreness - Self-reported soreness (1-10, 1 = very sore, 10 = no soreness)
 * @returns Blended fatigue score (0-10, 10 = fresh)
 */
export function blendStrengthFatigue(
  objectiveFatigue: number,
  subjectiveSoreness: number | null
): number {
  if (subjectiveSoreness === null) {
    return objectiveFatigue
  }

  // Weights: 40% objective (synced data), 60% subjective (athlete perception)
  // Subjective is weighted higher because athlete knows their body best
  const objectiveWeight = 0.4
  const subjectiveWeight = 0.6

  // Normalize subjective to same scale (already 1-10, same direction)
  const blended =
    objectiveFatigue * objectiveWeight + subjectiveSoreness * subjectiveWeight

  return Math.round(blended * 10) / 10
}
