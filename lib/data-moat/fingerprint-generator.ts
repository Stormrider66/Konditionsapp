/**
 * Data Moat Phase 2: Training Fingerprint Generation
 *
 * Analyzes training data to create a "fingerprint" of the training period.
 * Used for pattern matching and finding what works for similar athletes.
 */

import { prisma } from '@/lib/prisma'

export interface TrainingFingerprintData {
  // Zone distribution
  zone1Percent: number
  zone2Percent: number
  zone3Percent: number
  zone4Percent: number
  zone5Percent: number

  // Volume patterns
  avgWeeklyHours: number
  weeklyVolumeVariation: number
  longSessionRatio: number

  // Intensity patterns
  intensityDistribution: {
    easy: number
    moderate: number
    hard: number
  }
  avgSessionIntensity: number
  hardDayFrequency: number

  // Session composition
  strengthSessionsPerWeek: number
  crossTrainingPercent: number
  restDaysPerWeek: number

  // Periodization pattern
  periodizationType: string | null
  progressionRate: number | null

  // Key workout types
  keyWorkoutTypes: string[]
}

interface WorkoutData {
  date: Date
  duration: number // minutes
  type: string
  intensity: string
  zone?: number
}

/**
 * Generate a training fingerprint from workout logs for a specific period.
 */
export async function generateFingerprint(
  athleteId: string,
  startDate: Date,
  endDate: Date
): Promise<TrainingFingerprintData> {
  // Fetch all workout logs for the period
  const workoutLogs = await prisma.workoutLog.findMany({
    where: {
      workout: {
        day: {
          week: {
            program: {
              clientId: athleteId,
            },
          },
        },
      },
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      workout: {
        select: {
          type: true,
          duration: true,
          intensity: true,
        },
      },
    },
  })

  // Fetch daily check-ins for additional data
  const checkIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId: athleteId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Fetch strength sessions
  const strengthSessions = await prisma.strengthTrainingSession.findMany({
    where: {
      clientId: athleteId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  // Transform workout logs to our format
  const workouts: WorkoutData[] = workoutLogs.map((log) => ({
    date: log.completedAt || new Date(),
    duration: log.duration || log.workout.duration || 0,
    type: log.workout.type,
    intensity: log.workout.intensity || 'moderate',
    zone: log.powerZone || undefined,
  }))

  // Calculate zone distribution
  const zoneDistribution = calculateZoneDistribution(workouts)

  // Calculate volume patterns
  const volumePatterns = calculateVolumePatterns(workouts, startDate, endDate)

  // Calculate intensity patterns
  const intensityPatterns = calculateIntensityPatterns(workouts)

  // Calculate session composition
  const sessionComposition = calculateSessionComposition(
    workouts,
    strengthSessions.length,
    startDate,
    endDate
  )

  // Detect periodization pattern
  const periodizationType = detectPeriodizationType(zoneDistribution)

  // Calculate progression rate
  const progressionRate = calculateProgressionRate(workouts)

  // Identify key workout types
  const keyWorkoutTypes = identifyKeyWorkoutTypes(workouts)

  return {
    ...zoneDistribution,
    ...volumePatterns,
    ...intensityPatterns,
    ...sessionComposition,
    periodizationType,
    progressionRate,
    keyWorkoutTypes,
  }
}

/**
 * Calculate zone distribution from workout data.
 */
function calculateZoneDistribution(workouts: WorkoutData[]): {
  zone1Percent: number
  zone2Percent: number
  zone3Percent: number
  zone4Percent: number
  zone5Percent: number
} {
  const zoneCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let totalWithZone = 0

  for (const workout of workouts) {
    if (workout.zone && workout.zone >= 1 && workout.zone <= 5) {
      zoneCounts[workout.zone as 1 | 2 | 3 | 4 | 5] += workout.duration
      totalWithZone += workout.duration
    } else {
      // Estimate zone from intensity
      const estimatedZone = estimateZoneFromIntensity(workout.intensity)
      zoneCounts[estimatedZone] += workout.duration
      totalWithZone += workout.duration
    }
  }

  if (totalWithZone === 0) {
    return {
      zone1Percent: 0,
      zone2Percent: 0,
      zone3Percent: 0,
      zone4Percent: 0,
      zone5Percent: 0,
    }
  }

  return {
    zone1Percent: (zoneCounts[1] / totalWithZone) * 100,
    zone2Percent: (zoneCounts[2] / totalWithZone) * 100,
    zone3Percent: (zoneCounts[3] / totalWithZone) * 100,
    zone4Percent: (zoneCounts[4] / totalWithZone) * 100,
    zone5Percent: (zoneCounts[5] / totalWithZone) * 100,
  }
}

/**
 * Estimate training zone from intensity label.
 */
function estimateZoneFromIntensity(intensity: string): 1 | 2 | 3 | 4 | 5 {
  switch (intensity.toLowerCase()) {
    case 'easy':
    case 'recovery':
      return 1
    case 'aerobic':
    case 'base':
      return 2
    case 'moderate':
    case 'tempo':
      return 3
    case 'hard':
    case 'threshold':
      return 4
    case 'race_pace':
    case 'max':
    case 'vo2max':
      return 5
    default:
      return 2 // Default to zone 2
  }
}

/**
 * Calculate volume patterns from workout data.
 */
function calculateVolumePatterns(
  workouts: WorkoutData[],
  startDate: Date,
  endDate: Date
): {
  avgWeeklyHours: number
  weeklyVolumeVariation: number
  longSessionRatio: number
} {
  // Group workouts by week
  const weeklyMinutes: number[] = []
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerWeek)

  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(startDate.getTime() + i * msPerWeek)
    const weekEnd = new Date(weekStart.getTime() + msPerWeek)

    const weekMinutes = workouts
      .filter((w) => w.date >= weekStart && w.date < weekEnd)
      .reduce((sum, w) => sum + w.duration, 0)

    weeklyMinutes.push(weekMinutes)
  }

  const avgWeeklyMinutes =
    weeklyMinutes.length > 0
      ? weeklyMinutes.reduce((a, b) => a + b, 0) / weeklyMinutes.length
      : 0

  // Calculate standard deviation
  const variance =
    weeklyMinutes.length > 0
      ? weeklyMinutes.reduce((sum, mins) => sum + Math.pow(mins - avgWeeklyMinutes, 2), 0) /
        weeklyMinutes.length
      : 0
  const stdDev = Math.sqrt(variance)
  const weeklyVolumeVariation = avgWeeklyMinutes > 0 ? stdDev / avgWeeklyMinutes : 0

  // Calculate long session ratio (sessions > 90 minutes)
  const longSessions = workouts.filter((w) => w.duration > 90).length
  const longSessionRatio = workouts.length > 0 ? longSessions / workouts.length : 0

  return {
    avgWeeklyHours: avgWeeklyMinutes / 60,
    weeklyVolumeVariation,
    longSessionRatio,
  }
}

/**
 * Calculate intensity patterns from workout data.
 */
function calculateIntensityPatterns(workouts: WorkoutData[]): {
  intensityDistribution: { easy: number; moderate: number; hard: number }
  avgSessionIntensity: number
  hardDayFrequency: number
} {
  let easyCount = 0
  let moderateCount = 0
  let hardCount = 0
  let totalIntensityScore = 0

  for (const workout of workouts) {
    const intensity = workout.intensity.toLowerCase()
    if (intensity === 'easy' || intensity === 'recovery') {
      easyCount++
      totalIntensityScore += 0.3
    } else if (intensity === 'moderate' || intensity === 'tempo') {
      moderateCount++
      totalIntensityScore += 0.6
    } else {
      hardCount++
      totalIntensityScore += 1.0
    }
  }

  const total = workouts.length || 1

  // Group by date for hard day frequency
  const dateMap = new Map<string, WorkoutData[]>()
  for (const workout of workouts) {
    const dateKey = workout.date.toISOString().split('T')[0]
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, [])
    }
    dateMap.get(dateKey)!.push(workout)
  }

  const hardDays = Array.from(dateMap.values()).filter((dayWorkouts) =>
    dayWorkouts.some((w) => !['easy', 'recovery', 'moderate'].includes(w.intensity.toLowerCase()))
  ).length

  const totalDays = dateMap.size || 1
  const weeks = totalDays / 7

  return {
    intensityDistribution: {
      easy: easyCount / total,
      moderate: moderateCount / total,
      hard: hardCount / total,
    },
    avgSessionIntensity: totalIntensityScore / total,
    hardDayFrequency: hardDays / (weeks || 1),
  }
}

/**
 * Calculate session composition metrics.
 */
function calculateSessionComposition(
  workouts: WorkoutData[],
  strengthSessionCount: number,
  startDate: Date,
  endDate: Date
): {
  strengthSessionsPerWeek: number
  crossTrainingPercent: number
  restDaysPerWeek: number
} {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const totalWeeks = Math.max(1, (endDate.getTime() - startDate.getTime()) / msPerWeek)

  const crossTrainingSessions = workouts.filter((w) =>
    ['CROSS_TRAINING', 'SWIMMING', 'CYCLING'].includes(w.type)
  ).length

  // Count unique workout days
  const workoutDays = new Set(workouts.map((w) => w.date.toISOString().split('T')[0]))
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  const restDays = totalDays - workoutDays.size

  return {
    strengthSessionsPerWeek: strengthSessionCount / totalWeeks,
    crossTrainingPercent: workouts.length > 0 ? crossTrainingSessions / workouts.length : 0,
    restDaysPerWeek: (restDays / totalDays) * 7,
  }
}

/**
 * Detect periodization type from zone distribution.
 */
function detectPeriodizationType(zones: {
  zone1Percent: number
  zone2Percent: number
  zone3Percent: number
  zone4Percent: number
  zone5Percent: number
}): string | null {
  const lowIntensity = zones.zone1Percent + zones.zone2Percent
  const highIntensity = zones.zone4Percent + zones.zone5Percent
  const midIntensity = zones.zone3Percent

  // Polarized: >75% low, minimal mid, some high
  if (lowIntensity > 75 && midIntensity < 10 && highIntensity > 10) {
    return 'POLARIZED'
  }

  // Pyramidal: decreasing distribution from low to high
  if (lowIntensity > 60 && midIntensity > highIntensity && highIntensity < 15) {
    return 'PYRAMIDAL'
  }

  // Threshold-focused: significant zone 3-4 work
  if (midIntensity + zones.zone4Percent > 40) {
    return 'THRESHOLD'
  }

  // High-volume base: very high zone 1-2
  if (lowIntensity > 85) {
    return 'HIGH_VOLUME_BASE'
  }

  return 'MIXED'
}

/**
 * Calculate weekly progression rate.
 */
function calculateProgressionRate(workouts: WorkoutData[]): number | null {
  if (workouts.length < 14) return null // Need at least 2 weeks

  // Sort by date
  const sorted = [...workouts].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate first and last week volume
  const firstWeekEnd = new Date(sorted[0].date.getTime() + 7 * 24 * 60 * 60 * 1000)
  const lastWeekStart = new Date(sorted[sorted.length - 1].date.getTime() - 7 * 24 * 60 * 60 * 1000)

  const firstWeekVolume = sorted
    .filter((w) => w.date < firstWeekEnd)
    .reduce((sum, w) => sum + w.duration, 0)

  const lastWeekVolume = sorted
    .filter((w) => w.date >= lastWeekStart)
    .reduce((sum, w) => sum + w.duration, 0)

  if (firstWeekVolume === 0) return null

  const totalWeeks = Math.ceil(
    (sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )

  const totalChange = (lastWeekVolume - firstWeekVolume) / firstWeekVolume
  return totalChange / (totalWeeks || 1)
}

/**
 * Identify key workout types in the period.
 */
function identifyKeyWorkoutTypes(workouts: WorkoutData[]): string[] {
  const typeCounts = new Map<string, number>()

  for (const workout of workouts) {
    const type = workout.type
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  }

  // Return types that appear at least 10% of the time
  const threshold = workouts.length * 0.1
  return Array.from(typeCounts.entries())
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type)
}

/**
 * Save a fingerprint to the database.
 */
export async function saveFingerprint(
  periodOutcomeId: string,
  fingerprint: TrainingFingerprintData
): Promise<string> {
  const result = await prisma.trainingFingerprint.create({
    data: {
      periodOutcomeId,
      zone1Percent: fingerprint.zone1Percent,
      zone2Percent: fingerprint.zone2Percent,
      zone3Percent: fingerprint.zone3Percent,
      zone4Percent: fingerprint.zone4Percent,
      zone5Percent: fingerprint.zone5Percent,
      avgWeeklyHours: fingerprint.avgWeeklyHours,
      weeklyVolumeVariation: fingerprint.weeklyVolumeVariation,
      longSessionRatio: fingerprint.longSessionRatio,
      intensityDistribution: fingerprint.intensityDistribution,
      avgSessionIntensity: fingerprint.avgSessionIntensity,
      hardDayFrequency: fingerprint.hardDayFrequency,
      strengthSessionsPerWeek: fingerprint.strengthSessionsPerWeek,
      crossTrainingPercent: fingerprint.crossTrainingPercent,
      restDaysPerWeek: fingerprint.restDaysPerWeek,
      periodizationType: fingerprint.periodizationType,
      progressionRate: fingerprint.progressionRate,
      keyWorkoutTypes: fingerprint.keyWorkoutTypes,
    },
  })

  return result.id
}
