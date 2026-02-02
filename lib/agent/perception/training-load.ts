/**
 * Training Load Perception Module
 *
 * Collects and analyzes training load metrics including ACWR.
 */

import { prisma } from '@/lib/prisma'
import type { TrainingLoadData, ACWRZone, LoadTrend } from '../types'
import { getACWRZone } from '../guardrails/safety-bounds'

/**
 * Perceive training load data for an athlete
 */
export async function perceiveTrainingLoad(
  clientId: string
): Promise<TrainingLoadData> {
  // Get the most recent training load record
  const latestLoad = await prisma.trainingLoad.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
  })

  // Get load from 7 days ago for trend calculation
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const previousLoad = await prisma.trainingLoad.findFirst({
    where: {
      clientId,
      date: { lte: sevenDaysAgo },
    },
    orderBy: { date: 'desc' },
  })

  // Calculate values
  const acuteLoad = latestLoad?.acuteLoad ?? 0
  const chronicLoad = latestLoad?.chronicLoad ?? 1 // Avoid division by zero
  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0

  // Determine trend
  let loadTrend: LoadTrend = 'STABLE'
  if (previousLoad) {
    const previousAcute = previousLoad.acuteLoad ?? 0
    const changePct = previousAcute > 0 ? (acuteLoad - previousAcute) / previousAcute : 0

    if (changePct > 0.1) {
      loadTrend = 'INCREASING'
    } else if (changePct < -0.1) {
      loadTrend = 'DECREASING'
    }
  }

  return {
    acuteLoad,
    chronicLoad,
    acwr,
    acwrZone: getACWRZone(acwr),
    loadTrend,
  }
}

/**
 * Get training load history for a period
 */
export async function getTrainingLoadHistory(
  clientId: string,
  days: number = 28
): Promise<
  Array<{
    date: Date
    acuteLoad: number
    chronicLoad: number
    acwr: number
    zone: ACWRZone
  }>
> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const loads = await prisma.trainingLoad.findMany({
    where: {
      clientId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  })

  return loads.map((load) => {
    const acuteLoad = load.acuteLoad ?? 0
    const chronicLoad = load.chronicLoad ?? 1
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0

    return {
      date: load.date,
      acuteLoad,
      chronicLoad,
      acwr,
      zone: getACWRZone(acwr),
    }
  })
}

/**
 * Calculate weekly training load summary
 */
export async function getWeeklyLoadSummary(
  clientId: string
): Promise<{
  totalLoad: number
  avgDailyLoad: number
  trainingDays: number
  restDays: number
  hardDays: number
}> {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  // Get training loads for the week
  const loads = await prisma.trainingLoad.findMany({
    where: {
      clientId,
      date: { gte: weekStart },
    },
  })

  const totalLoad = loads.reduce(
    (sum, l) => sum + (l.dailyLoad ?? 0),
    0
  )
  const trainingDays = loads.filter(
    (l) => l.dailyLoad && l.dailyLoad > 0
  ).length
  const restDays = 7 - trainingDays

  // Hard days = high intensity workouts (simplified: load > average)
  const avgLoad = trainingDays > 0 ? totalLoad / trainingDays : 0
  const hardDays = loads.filter(
    (l) => l.dailyLoad && l.dailyLoad > avgLoad * 1.2
  ).length

  return {
    totalLoad,
    avgDailyLoad: totalLoad / 7,
    trainingDays,
    restDays,
    hardDays,
  }
}

/**
 * Detect training load spikes
 */
export async function detectLoadSpike(
  clientId: string
): Promise<{
  hasSpike: boolean
  spikePercent: number
  recommendation: string | null
}> {
  const load = await perceiveTrainingLoad(clientId)

  // A spike is when ACWR > 1.5 (DANGER zone)
  if (load.acwr >= 1.5) {
    const spikePercent = ((load.acwr - 1.0) / 1.0) * 100

    return {
      hasSpike: true,
      spikePercent,
      recommendation:
        load.acwr >= 2.0
          ? 'Critical load spike detected. Strongly recommend reducing intensity immediately.'
          : 'Training load spike detected. Consider reducing intensity in upcoming workouts.',
    }
  }

  return {
    hasSpike: false,
    spikePercent: 0,
    recommendation: null,
  }
}

/**
 * Check consecutive hard training days
 */
export async function getConsecutiveHardDays(
  clientId: string
): Promise<number> {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const loads = await prisma.trainingLoad.findMany({
    where: {
      clientId,
      date: { gte: twoWeeksAgo },
    },
    orderBy: { date: 'desc' },
  })

  // Calculate average load to determine "hard" threshold
  const loadsWithValues = loads.filter((l) => l.dailyLoad && l.dailyLoad > 0)
  if (loadsWithValues.length === 0) return 0

  const avgLoad =
    loadsWithValues.reduce((sum, l) => sum + (l.dailyLoad ?? 0), 0) /
    loadsWithValues.length

  const hardThreshold = avgLoad * 1.2 // 20% above average is "hard"

  // Count consecutive hard days from today backwards
  let consecutiveHardDays = 0
  for (const load of loads) {
    if (load.dailyLoad && load.dailyLoad >= hardThreshold) {
      consecutiveHardDays++
    } else if (load.dailyLoad && load.dailyLoad > 0) {
      // Non-hard training day breaks the streak
      break
    }
    // Rest days (load = 0 or null) don't break the streak for this calculation
  }

  return consecutiveHardDays
}
