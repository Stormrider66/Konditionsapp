/**
 * Training Summary Calculator
 *
 * Aggregates training data into weekly and monthly summaries for efficient
 * trend analysis, coach dashboards, and athlete self-tracking.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { deduplicateActivities } from './activity-deduplication'

// Types for internal calculations
interface DailyTrainingData {
  date: Date
  tss: number
  distance: number // km
  duration: number // minutes
  calories?: number
  workoutType?: string
  intensity?: string
  source: 'strava' | 'garmin' | 'manual' | 'program' | 'adhoc'
}

interface ReadinessData {
  readinessScore?: number
  sleepHours?: number
  sleepQuality?: number
  fatigue?: number
  soreness?: number
}

interface ZoneDistributionData {
  zone1Seconds: number
  zone2Seconds: number
  zone3Seconds: number
  zone4Seconds: number
  zone5Seconds: number
  totalTrackedSeconds: number
}

// Helper to get Monday of a week
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to get Sunday of a week
function getWeekEnd(date: Date): Date {
  const monday = getWeekStart(date)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

// Get ISO week number
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Classify intensity based on workout intensity level, type, and TSS
function classifyIntensity(
  workoutType?: string,
  tss?: number,
  duration?: number,
  intensity?: string
): 'easy' | 'moderate' | 'hard' {
  // First check the actual intensity field (e.g., 'INTERVAL', 'THRESHOLD', 'EASY')
  if (intensity) {
    const upperIntensity = intensity.toUpperCase()
    const easyIntensities = ['EASY', 'RECOVERY']
    const hardIntensities = ['INTERVAL', 'THRESHOLD', 'MAX', 'VO2MAX', 'RACE_PACE']

    if (easyIntensities.includes(upperIntensity)) return 'easy'
    if (hardIntensities.includes(upperIntensity)) return 'hard'
    if (upperIntensity === 'MODERATE') return 'moderate'
  }

  // If we have workout type classification (e.g., 'LONG' run)
  if (workoutType) {
    const easyTypes = ['EASY', 'RECOVERY', 'LONG', 'BASE']
    const hardTypes = ['INTERVALS', 'THRESHOLD', 'TEMPO', 'RACE', 'VO2MAX']

    if (easyTypes.includes(workoutType.toUpperCase())) return 'easy'
    if (hardTypes.includes(workoutType.toUpperCase())) return 'hard'
  }

  // Fallback to TSS-based classification
  if (tss && duration) {
    const tssPerHour = (tss / duration) * 60
    if (tssPerHour < 50) return 'easy'
    if (tssPerHour > 75) return 'hard'
  }

  return 'moderate'
}

/**
 * Fetch all training data for a week from multiple sources
 */
async function fetchWeeklyTrainingData(
  clientId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{
  activities: DailyTrainingData[]
  readiness: ReadinessData[]
  plannedWorkouts: number
  completedWorkouts: number
  strengthData: { sets: number; volume: number }
  zoneDistribution: ZoneDistributionData
}> {
  // Parallel fetch from all sources
  const [
    trainingLoads,
    stravaActivities,
    garminActivities,
    workoutLogs,
    dailyCheckIns,
    programWorkouts,
    strengthSets,
    stravaZoneDistributions,
    garminZoneDistributions,
    adHocWorkouts,
  ] = await Promise.all([
    // Daily training loads (already calculated TSS)
    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),

    // Strava activities
    prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: { gte: weekStart, lte: weekEnd },
      },
    }),

    // Garmin activities
    prisma.garminActivity.findMany({
      where: {
        clientId,
        startDate: { gte: weekStart, lte: weekEnd },
      },
    }),

    // Manual workout logs
    prisma.workoutLog.findMany({
      where: {
        completedAt: { gte: weekStart, lte: weekEnd },
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
      },
      include: {
        workout: true,
      },
    }),

    // Daily check-ins for readiness
    prisma.dailyCheckIn.findMany({
      where: {
        clientId,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),

    // Count planned workouts from active program
    prisma.workout.count({
      where: {
        day: {
          date: { gte: weekStart, lte: weekEnd },
          week: {
            program: {
              clientId,
              isActive: true,
            },
          },
        },
      },
    }),

    // Strength session logs
    prisma.setLog.findMany({
      where: {
        assignment: {
          athleteId: clientId,
          completedAt: { gte: weekStart, lte: weekEnd },
        },
        weight: { gt: 0 },
        repsCompleted: { gt: 0 },
      },
    }),

    // Strava zone distributions
    prisma.activityHRZoneDistribution.findMany({
      where: {
        stravaActivity: {
          clientId,
          startDate: { gte: weekStart, lte: weekEnd },
        },
      },
    }),

    // Garmin zone distributions
    prisma.activityHRZoneDistribution.findMany({
      where: {
        garminActivity: {
          clientId,
          startDate: { gte: weekStart, lte: weekEnd },
        },
      },
    }),

    // Confirmed ad-hoc workouts
    prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        status: 'CONFIRMED',
        workoutDate: { gte: weekStart, lte: weekEnd },
      },
    }),
  ])

  // Build unified activity list
  const activities: DailyTrainingData[] = []

  // Add Strava activities
  for (const activity of stravaActivities) {
    activities.push({
      date: new Date(activity.startDate),
      tss: activity.tss ?? 0,
      distance: (activity.distance ?? 0) / 1000, // m to km
      duration: (activity.movingTime ?? 0) / 60, // sec to min
      calories: activity.calories ?? undefined,
      workoutType: activity.mappedIntensity ?? undefined,
      intensity: activity.mappedIntensity ?? undefined,
      source: 'strava',
    })
  }

  // Add Garmin activities
  for (const activity of garminActivities) {
    activities.push({
      date: new Date(activity.startDate),
      tss: activity.tss ?? 0,
      distance: (activity.distance ?? 0) / 1000,
      duration: (activity.duration ?? 0) / 60,
      calories: activity.calories ?? undefined,
      workoutType: activity.mappedIntensity ?? undefined,
      intensity: activity.mappedIntensity ?? undefined,
      source: 'garmin',
    })
  }

  // Add manual workout logs
  for (const log of workoutLogs) {
    activities.push({
      date: new Date(log.completedAt!),
      tss: log.tss ?? 0,
      distance: log.distance ?? 0,
      duration: log.duration ?? 0,
      calories: undefined,
      workoutType: log.workout?.type ?? undefined,
      intensity: log.workout?.intensity ?? undefined,
      source: 'program',
    })
  }

  // Add confirmed ad-hoc workouts
  // Build a map of trainingLoadId -> TSS for quick lookup
  const trainingLoadTssMap = new Map<string, number>()
  for (const load of trainingLoads) {
    trainingLoadTssMap.set(load.id, load.dailyLoad)
  }

  for (const adhoc of adHocWorkouts) {
    // Extract data from parsedStructure
    const parsed = adhoc.parsedStructure as {
      duration?: number
      distance?: number
      intensity?: string
      type?: string
    } | null

    // Get TSS from linked TrainingLoad
    const tss = adhoc.trainingLoadId ? trainingLoadTssMap.get(adhoc.trainingLoadId) ?? 0 : 0

    activities.push({
      date: new Date(adhoc.workoutDate),
      tss,
      distance: parsed?.distance ? parsed.distance / 1000 : 0, // Convert m to km
      duration: parsed?.duration ?? 0,
      calories: undefined,
      workoutType: adhoc.parsedType ?? parsed?.type ?? undefined,
      intensity: parsed?.intensity ?? undefined,
      source: 'adhoc',
    })
  }

  // Deduplicate activities - map to NormalizedActivity format
  // Note: 'program' and 'adhoc' sources are mapped to 'manual' for deduplication
  const normalizedForDedup = activities.map((a, i) => ({
    id: `${a.source}-${i}`,
    source: (a.source === 'program' || a.source === 'adhoc' ? 'manual' : a.source) as 'strava' | 'garmin' | 'manual',
    date: a.date,
    startTime: a.date,
    duration: a.duration * 60, // back to seconds for dedup
    type: a.workoutType || 'UNKNOWN',
    distance: a.distance * 1000, // back to meters for dedup
    tss: a.tss,
  }))

  const { deduplicated } = deduplicateActivities(normalizedForDedup, {
    timeTolerance: 15 * 60 * 1000, // 15 minutes in milliseconds
  })

  // Get IDs of activities that survived deduplication
  const keptIds = new Set(deduplicated.map((a) => a.id))

  // Filter original activities to only include those that survived deduplication
  const uniqueActivities: DailyTrainingData[] = activities
    .filter((a, i) => keptIds.has(`${a.source}-${i}`))
    .map((a) => ({
      date: a.date,
      tss: a.tss,
      distance: a.distance,
      duration: a.duration,
      calories: a.calories,
      workoutType: a.workoutType,
      intensity: a.intensity,
      source: a.source,
    }))

  // Build readiness data
  const readiness: ReadinessData[] = dailyCheckIns.map((checkIn) => ({
    readinessScore: checkIn.readinessScore ?? undefined,
    sleepHours: checkIn.sleepHours ?? undefined,
    sleepQuality: checkIn.sleepQuality ?? undefined,
    fatigue: checkIn.fatigue ?? undefined,
    soreness: checkIn.soreness ?? undefined,
  }))

  // Calculate strength volume
  let totalSets = 0
  let totalVolume = 0
  for (const set of strengthSets) {
    totalSets++
    totalVolume += (set.weight ?? 0) * (set.repsCompleted ?? 0)
  }

  // Count completed program workouts
  const completedWorkouts = workoutLogs.filter((log) => log.completed).length

  // Aggregate zone distributions from both sources
  const allZoneDistributions = [...stravaZoneDistributions, ...garminZoneDistributions]
  const zoneDistribution: ZoneDistributionData = {
    zone1Seconds: 0,
    zone2Seconds: 0,
    zone3Seconds: 0,
    zone4Seconds: 0,
    zone5Seconds: 0,
    totalTrackedSeconds: 0,
  }

  for (const dist of allZoneDistributions) {
    zoneDistribution.zone1Seconds += dist.zone1Seconds
    zoneDistribution.zone2Seconds += dist.zone2Seconds
    zoneDistribution.zone3Seconds += dist.zone3Seconds
    zoneDistribution.zone4Seconds += dist.zone4Seconds
    zoneDistribution.zone5Seconds += dist.zone5Seconds
    zoneDistribution.totalTrackedSeconds += dist.totalTrackedSeconds
  }

  return {
    activities: uniqueActivities,
    readiness,
    plannedWorkouts: programWorkouts,
    completedWorkouts,
    strengthData: { sets: totalSets, volume: totalVolume },
    zoneDistribution,
  }
}

/**
 * Calculate weekly training summary for a specific week
 */
export async function calculateWeeklySummary(
  clientId: string,
  weekStart: Date
): Promise<Prisma.WeeklyTrainingSummaryCreateInput> {
  const weekEnd = getWeekEnd(weekStart)
  const weekNumber = getISOWeekNumber(weekStart)
  const year = weekStart.getFullYear()

  // Fetch all data
  const {
    activities,
    readiness,
    plannedWorkouts,
    completedWorkouts,
    strengthData,
    zoneDistribution,
  } = await fetchWeeklyTrainingData(clientId, weekStart, weekEnd)

  // Aggregate metrics
  let totalTSS = 0
  let totalDistance = 0
  let totalDuration = 0
  let totalCalories = 0
  let easyMinutes = 0
  let moderateMinutes = 0
  let hardMinutes = 0

  const workoutsByType: Record<string, number> = {}
  const tssByType: Record<string, number> = {}
  const distanceByType: Record<string, number> = {}
  const durationByType: Record<string, number> = {}

  let stravaCount = 0
  let garminCount = 0
  let manualCount = 0
  let programCount = 0

  // Daily TSS for peak calculation
  const dailyTSS: Record<string, number> = {}

  for (const activity of activities) {
    totalTSS += activity.tss
    totalDistance += activity.distance
    totalDuration += activity.duration
    if (activity.calories) totalCalories += activity.calories

    // Intensity distribution
    const intensityLevel = classifyIntensity(
      activity.workoutType,
      activity.tss,
      activity.duration,
      activity.intensity
    )
    if (intensityLevel === 'easy') easyMinutes += activity.duration
    else if (intensityLevel === 'moderate') moderateMinutes += activity.duration
    else hardMinutes += activity.duration

    // Type breakdowns
    const type = activity.workoutType || 'OTHER'
    workoutsByType[type] = (workoutsByType[type] || 0) + 1
    tssByType[type] = (tssByType[type] || 0) + activity.tss
    distanceByType[type] = (distanceByType[type] || 0) + activity.distance
    durationByType[type] = (durationByType[type] || 0) + activity.duration

    // Source counts
    if (activity.source === 'strava') stravaCount++
    else if (activity.source === 'garmin') garminCount++
    else if (activity.source === 'program') programCount++
    else manualCount++

    // Daily TSS tracking
    const dateKey = activity.date.toISOString().split('T')[0]
    dailyTSS[dateKey] = (dailyTSS[dateKey] || 0) + activity.tss
  }

  // Calculate averages
  const activeDays = Object.keys(dailyTSS).length
  const avgDailyTSS = activeDays > 0 ? totalTSS / 7 : null // Always divide by 7 for weekly avg
  const peakDailyTSS = Object.values(dailyTSS).length > 0
    ? Math.max(...Object.values(dailyTSS))
    : null

  // Calculate polarization ratio (easy / (easy + hard))
  const totalIntensityMinutes = easyMinutes + moderateMinutes + hardMinutes
  const polarizationRatio = totalIntensityMinutes > 0
    ? (easyMinutes / totalIntensityMinutes) * 100
    : null

  // Compliance percentage
  const compliancePercent = plannedWorkouts > 0
    ? (completedWorkouts / plannedWorkouts) * 100
    : null

  // Readiness averages
  const avgReadiness = readiness.length > 0
    ? readiness.reduce((sum, r) => sum + (r.readinessScore ?? 0), 0) /
      readiness.filter((r) => r.readinessScore !== undefined).length || null
    : null
  const avgSleepHours = readiness.length > 0
    ? readiness.reduce((sum, r) => sum + (r.sleepHours ?? 0), 0) /
      readiness.filter((r) => r.sleepHours !== undefined).length || null
    : null
  const avgSleepQuality = readiness.length > 0
    ? readiness.reduce((sum, r) => sum + (r.sleepQuality ?? 0), 0) /
      readiness.filter((r) => r.sleepQuality !== undefined).length || null
    : null
  const avgFatigue = readiness.length > 0
    ? readiness.reduce((sum, r) => sum + (r.fatigue ?? 0), 0) /
      readiness.filter((r) => r.fatigue !== undefined).length || null
    : null
  const avgSoreness = readiness.length > 0
    ? readiness.reduce((sum, r) => sum + (r.soreness ?? 0), 0) /
      readiness.filter((r) => r.soreness !== undefined).length || null
    : null

  // Get ACWR at week end
  const acwrRecord = await prisma.trainingLoad.findFirst({
    where: {
      clientId,
      date: { lte: weekEnd },
      acwr: { not: null },
    },
    orderBy: { date: 'desc' },
  })

  return {
    client: { connect: { id: clientId } },
    weekStart,
    weekEnd,
    weekNumber,
    year,
    totalTSS,
    totalDistance,
    totalDuration: Math.round(totalDuration),
    totalCalories: totalCalories > 0 ? totalCalories : null,
    workoutCount: activities.length,
    plannedWorkoutCount: plannedWorkouts > 0 ? plannedWorkouts : null,
    completedWorkoutCount: completedWorkouts > 0 ? completedWorkouts : null,
    compliancePercent,
    workoutsByType,
    tssByType,
    distanceByType,
    durationByType,
    easyMinutes: Math.round(easyMinutes),
    moderateMinutes: Math.round(moderateMinutes),
    hardMinutes: Math.round(hardMinutes),
    polarizationRatio,
    avgDailyTSS,
    peakDailyTSS,
    acwrAtWeekEnd: acwrRecord?.acwr ?? null,
    acwrZone: acwrRecord?.acwrZone ?? null,
    avgReadiness,
    avgSleepHours,
    avgSleepQuality,
    avgFatigue,
    avgSoreness,
    strengthSets: strengthData.sets > 0 ? strengthData.sets : null,
    strengthVolume: strengthData.volume > 0 ? strengthData.volume : null,
    stravaActivities: stravaCount,
    garminActivities: garminCount,
    manualActivities: manualCount,
    programWorkouts: programCount,
    // 5-zone HR distribution
    zone1Minutes: Math.round(zoneDistribution.zone1Seconds / 60),
    zone2Minutes: Math.round(zoneDistribution.zone2Seconds / 60),
    zone3Minutes: Math.round(zoneDistribution.zone3Seconds / 60),
    zone4Minutes: Math.round(zoneDistribution.zone4Seconds / 60),
    zone5Minutes: Math.round(zoneDistribution.zone5Seconds / 60),
  }
}

/**
 * Calculate monthly training summary
 */
export async function calculateMonthlySummary(
  clientId: string,
  month: number,
  year: number
): Promise<Prisma.MonthlyTrainingSummaryCreateInput> {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // Last day of month

  // Get all weekly summaries for this month
  const weeklySummaries = await prisma.weeklyTrainingSummary.findMany({
    where: {
      clientId,
      weekStart: { gte: monthStart },
      weekEnd: { lte: new Date(monthEnd.getTime() + 7 * 24 * 60 * 60 * 1000) }, // Include partial weeks
    },
    orderBy: { weekStart: 'asc' },
  })

  // If no weekly summaries, return empty
  if (weeklySummaries.length === 0) {
    return {
      client: { connect: { id: clientId } },
      month,
      year,
      monthStart,
      monthEnd,
      totalTSS: 0,
      totalDistance: 0,
      totalDuration: 0,
      workoutCount: 0,
    }
  }

  // Aggregate from weekly summaries
  let totalTSS = 0
  let totalDistance = 0
  let totalDuration = 0
  let totalCalories = 0
  let workoutCount = 0
  let totalEasyMinutes = 0
  let totalHardMinutes = 0
  let totalCompliancePercent = 0
  let complianceCount = 0
  let totalACWR = 0
  let acwrCount = 0
  let peakACWR = 0
  let daysInDangerZone = 0
  let totalReadiness = 0
  let readinessCount = 0

  const workoutsByType: Record<string, number> = {}
  const tssByType: Record<string, number> = {}

  for (const week of weeklySummaries) {
    totalTSS += week.totalTSS
    totalDistance += week.totalDistance
    totalDuration += week.totalDuration
    if (week.totalCalories) totalCalories += week.totalCalories
    workoutCount += week.workoutCount
    totalEasyMinutes += week.easyMinutes
    totalHardMinutes += week.hardMinutes

    if (week.compliancePercent !== null) {
      totalCompliancePercent += week.compliancePercent
      complianceCount++
    }

    if (week.acwrAtWeekEnd !== null) {
      totalACWR += week.acwrAtWeekEnd
      acwrCount++
      if (week.acwrAtWeekEnd > peakACWR) peakACWR = week.acwrAtWeekEnd
      if (week.acwrZone === 'DANGER' || week.acwrZone === 'CRITICAL') {
        daysInDangerZone += 7 // Approximate
      }
    }

    if (week.avgReadiness !== null) {
      totalReadiness += week.avgReadiness
      readinessCount++
    }

    // Merge type breakdowns
    const weekWorkoutsByType = week.workoutsByType as Record<string, number>
    const weekTssByType = week.tssByType as Record<string, number>

    for (const [type, count] of Object.entries(weekWorkoutsByType)) {
      workoutsByType[type] = (workoutsByType[type] || 0) + count
    }
    for (const [type, tss] of Object.entries(weekTssByType)) {
      tssByType[type] = (tssByType[type] || 0) + tss
    }
  }

  // Calculate averages
  const numWeeks = weeklySummaries.length
  const avgWeeklyTSS = numWeeks > 0 ? totalTSS / numWeeks : null
  const avgWeeklyDistance = numWeeks > 0 ? totalDistance / numWeeks : null
  const avgWeeklyDuration = numWeeks > 0 ? totalDuration / numWeeks : null
  const avgWeeklyWorkouts = numWeeks > 0 ? workoutCount / numWeeks : null
  const avgCompliancePercent = complianceCount > 0 ? totalCompliancePercent / complianceCount : null
  const avgACWR = acwrCount > 0 ? totalACWR / acwrCount : null
  const avgReadiness = readinessCount > 0 ? totalReadiness / readinessCount : null

  // Polarization ratio
  const totalIntensityMinutes = totalEasyMinutes + totalHardMinutes
  const avgPolarizationRatio = totalIntensityMinutes > 0
    ? (totalEasyMinutes / totalIntensityMinutes) * 100
    : null

  // Determine readiness trend
  let readinessTrend: string | null = null
  if (weeklySummaries.length >= 2) {
    const firstHalf = weeklySummaries.slice(0, Math.floor(numWeeks / 2))
    const secondHalf = weeklySummaries.slice(Math.floor(numWeeks / 2))

    const firstAvg = firstHalf.reduce((sum, w) => sum + (w.avgReadiness ?? 0), 0) /
      firstHalf.filter((w) => w.avgReadiness !== null).length || 0
    const secondAvg = secondHalf.reduce((sum, w) => sum + (w.avgReadiness ?? 0), 0) /
      secondHalf.filter((w) => w.avgReadiness !== null).length || 0

    if (secondAvg > firstAvg + 0.5) readinessTrend = 'IMPROVING'
    else if (secondAvg < firstAvg - 0.5) readinessTrend = 'DECLINING'
    else readinessTrend = 'STABLE'
  }

  // Get previous month for comparison
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevMonthSummary = await prisma.monthlyTrainingSummary.findUnique({
    where: {
      clientId_month_year: { clientId, month: prevMonth, year: prevYear },
    },
  })

  const tssChangePercent = prevMonthSummary && prevMonthSummary.totalTSS > 0
    ? ((totalTSS - prevMonthSummary.totalTSS) / prevMonthSummary.totalTSS) * 100
    : null
  const distanceChangePercent = prevMonthSummary && prevMonthSummary.totalDistance > 0
    ? ((totalDistance - prevMonthSummary.totalDistance) / prevMonthSummary.totalDistance) * 100
    : null

  return {
    client: { connect: { id: clientId } },
    month,
    year,
    monthStart,
    monthEnd,
    totalTSS,
    totalDistance,
    totalDuration: Math.round(totalDuration),
    totalCalories: totalCalories > 0 ? totalCalories : null,
    workoutCount,
    avgWeeklyTSS,
    avgWeeklyDistance,
    avgWeeklyDuration,
    avgWeeklyWorkouts,
    workoutsByType,
    tssByType,
    avgPolarizationRatio,
    totalEasyMinutes,
    totalHardMinutes,
    avgACWR,
    peakACWR: peakACWR > 0 ? peakACWR : null,
    daysInDangerZone,
    avgCompliancePercent,
    avgReadiness,
    readinessTrend,
    tssChangePercent,
    distanceChangePercent,
  }
}

/**
 * Save or update weekly summary
 */
export async function saveWeeklySummary(
  clientId: string,
  weekStart: Date
): Promise<string> {
  const data = await calculateWeeklySummary(clientId, weekStart)

  const result = await prisma.weeklyTrainingSummary.upsert({
    where: {
      clientId_weekStart: { clientId, weekStart },
    },
    create: data,
    update: {
      ...data,
      updatedAt: new Date(),
    },
  })

  return result.id
}

/**
 * Save or update monthly summary
 */
export async function saveMonthlySummary(
  clientId: string,
  month: number,
  year: number
): Promise<string> {
  const data = await calculateMonthlySummary(clientId, month, year)

  const result = await prisma.monthlyTrainingSummary.upsert({
    where: {
      clientId_month_year: { clientId, month, year },
    },
    create: data,
    update: {
      ...data,
      updatedAt: new Date(),
    },
  })

  return result.id
}

/**
 * Recalculate all summaries for an athlete from a given date
 */
export async function recalculateAllSummaries(
  clientId: string,
  fromDate?: Date
): Promise<{ weeks: number; months: number }> {
  const startDate = fromDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Default: 1 year
  const now = new Date()

  let weeksCalculated = 0
  let monthsCalculated = 0

  // Calculate weekly summaries
  let currentWeekStart = getWeekStart(startDate)
  while (currentWeekStart < now) {
    await saveWeeklySummary(clientId, currentWeekStart)
    weeksCalculated++
    currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  }

  // Calculate monthly summaries
  let currentMonth = startDate.getMonth() + 1
  let currentYear = startDate.getFullYear()

  while (
    currentYear < now.getFullYear() ||
    (currentYear === now.getFullYear() && currentMonth <= now.getMonth() + 1)
  ) {
    await saveMonthlySummary(clientId, currentMonth, currentYear)
    monthsCalculated++

    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
  }

  return { weeks: weeksCalculated, months: monthsCalculated }
}

/**
 * Get recent weekly summaries for an athlete
 */
export async function getRecentWeeklySummaries(
  clientId: string,
  count: number = 12
) {
  return prisma.weeklyTrainingSummary.findMany({
    where: { clientId },
    orderBy: { weekStart: 'desc' },
    take: count,
  })
}

/**
 * Get recent monthly summaries for an athlete
 */
export async function getRecentMonthlySummaries(
  clientId: string,
  count: number = 12
) {
  return prisma.monthlyTrainingSummary.findMany({
    where: { clientId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: count,
  })
}

/**
 * Calculate yearly training summary
 */
export async function calculateYearlySummary(
  clientId: string,
  year: number
): Promise<Prisma.YearlySummaryCreateInput> {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  // Fetch all monthly summaries for the year
  const monthlySummaries = await prisma.monthlyTrainingSummary.findMany({
    where: {
      clientId,
      year,
    },
    orderBy: { month: 'asc' },
  })

  // Fetch all zone distributions for the year
  const [stravaZones, garminZones] = await Promise.all([
    prisma.activityHRZoneDistribution.findMany({
      where: {
        stravaActivity: {
          clientId,
          startDate: { gte: yearStart, lte: yearEnd },
        },
      },
    }),
    prisma.activityHRZoneDistribution.findMany({
      where: {
        garminActivity: {
          clientId,
          startDate: { gte: yearStart, lte: yearEnd },
        },
      },
    }),
  ])

  // Aggregate all zone distributions
  const allZones = [...stravaZones, ...garminZones]
  let zone1Seconds = 0
  let zone2Seconds = 0
  let zone3Seconds = 0
  let zone4Seconds = 0
  let zone5Seconds = 0

  for (const zone of allZones) {
    zone1Seconds += zone.zone1Seconds
    zone2Seconds += zone.zone2Seconds
    zone3Seconds += zone.zone3Seconds
    zone4Seconds += zone.zone4Seconds
    zone5Seconds += zone.zone5Seconds
  }

  // Aggregate from monthly summaries
  let totalTSS = 0
  let totalDistance = 0
  let totalDuration = 0
  let workoutCount = 0
  let totalPolarization = 0
  let polarizationCount = 0

  const workoutsByType: Record<string, number> = {}
  const hoursByType: Record<string, number> = {}
  const monthlyHours: Array<{ month: number; hours: number }> = []
  const monthlyZoneDistribution: Array<{
    month: number
    zone1: number
    zone2: number
    zone3: number
    zone4: number
    zone5: number
  }> = []

  for (const monthly of monthlySummaries) {
    totalTSS += monthly.totalTSS
    totalDistance += monthly.totalDistance
    totalDuration += monthly.totalDuration
    workoutCount += monthly.workoutCount

    // Monthly hours tracking
    monthlyHours.push({
      month: monthly.month,
      hours: Math.round(monthly.totalDuration / 60 * 10) / 10,
    })

    // Aggregate polarization
    if (monthly.avgPolarizationRatio !== null) {
      totalPolarization += monthly.avgPolarizationRatio
      polarizationCount++
    }

    // Aggregate workouts by type
    const monthWorkoutsByType = monthly.workoutsByType as Record<string, number>
    for (const [type, count] of Object.entries(monthWorkoutsByType)) {
      workoutsByType[type] = (workoutsByType[type] || 0) + count
    }
  }

  // Calculate hours by activity type from Strava/Garmin
  const [stravaActivities, garminActivities] = await Promise.all([
    prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: {
        mappedType: true,
        movingTime: true,
      },
    }),
    prisma.garminActivity.findMany({
      where: {
        clientId,
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: {
        mappedType: true,
        duration: true,
      },
    }),
  ])

  for (const activity of stravaActivities) {
    const type = activity.mappedType || 'OTHER'
    const hours = (activity.movingTime || 0) / 3600
    hoursByType[type] = (hoursByType[type] || 0) + hours
  }

  for (const activity of garminActivities) {
    const type = activity.mappedType || 'OTHER'
    const hours = (activity.duration || 0) / 3600
    hoursByType[type] = (hoursByType[type] || 0) + hours
  }

  // Get weekly summaries for monthly zone distribution
  const weeklySummaries = await prisma.weeklyTrainingSummary.findMany({
    where: {
      clientId,
      year,
    },
    orderBy: { weekStart: 'asc' },
  })

  // Group weekly zones by month
  const monthlyZones: Record<number, { zone1: number; zone2: number; zone3: number; zone4: number; zone5: number }> = {}
  for (const week of weeklySummaries) {
    const weekMonth = week.weekStart.getMonth() + 1
    if (!monthlyZones[weekMonth]) {
      monthlyZones[weekMonth] = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 }
    }
    monthlyZones[weekMonth].zone1 += week.zone1Minutes
    monthlyZones[weekMonth].zone2 += week.zone2Minutes
    monthlyZones[weekMonth].zone3 += week.zone3Minutes
    monthlyZones[weekMonth].zone4 += week.zone4Minutes
    monthlyZones[weekMonth].zone5 += week.zone5Minutes
  }

  // Convert to array format
  for (let month = 1; month <= 12; month++) {
    const zones = monthlyZones[month] || { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 }
    monthlyZoneDistribution.push({
      month,
      zone1: zones.zone1,
      zone2: zones.zone2,
      zone3: zones.zone3,
      zone4: zones.zone4,
      zone5: zones.zone5,
    })
  }

  // Average polarization
  const avgPolarizationRatio = polarizationCount > 0
    ? totalPolarization / polarizationCount
    : null

  return {
    client: { connect: { id: clientId } },
    year,
    totalTSS,
    totalDistance,
    totalDuration: Math.round(totalDuration),
    workoutCount,
    zone1Minutes: Math.round(zone1Seconds / 60),
    zone2Minutes: Math.round(zone2Seconds / 60),
    zone3Minutes: Math.round(zone3Seconds / 60),
    zone4Minutes: Math.round(zone4Seconds / 60),
    zone5Minutes: Math.round(zone5Seconds / 60),
    monthlyHours,
    monthlyZoneDistribution,
    workoutsByType,
    hoursByType,
    avgPolarizationRatio,
  }
}

/**
 * Save or update yearly summary
 */
export async function saveYearlySummary(
  clientId: string,
  year: number
): Promise<string> {
  const data = await calculateYearlySummary(clientId, year)

  const result = await prisma.yearlySummary.upsert({
    where: {
      clientId_year: { clientId, year },
    },
    create: data,
    update: {
      ...data,
      updatedAt: new Date(),
    },
  })

  return result.id
}

/**
 * Get recent yearly summaries for an athlete
 */
export async function getRecentYearlySummaries(
  clientId: string,
  count: number = 5
) {
  return prisma.yearlySummary.findMany({
    where: { clientId },
    orderBy: { year: 'desc' },
    take: count,
  })
}
