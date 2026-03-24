/**
 * Readiness Perception Module
 *
 * Collects and analyzes athlete readiness from multiple sources.
 */

import { prisma } from '@/lib/prisma'
import type { ReadinessData, ReadinessSource } from '../types'

/**
 * Collect readiness data for an athlete
 */
export async function perceiveReadiness(clientId: string): Promise<ReadinessData> {
  const sources: ReadinessSource[] = []

  // Get the most recent daily check-in
  const latestCheckIn = await prisma.dailyCheckIn.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
  })

  let readinessScore: number | null = null
  let fatigueScore: number | null = null
  let sleepScore: number | null = null
  let stressScore: number | null = null

  if (latestCheckIn) {
    sources.push('DAILY_CHECKIN')

    // Convert check-in values to 0-100 scale
    // readinessScore is already 0-100, use directly
    if (latestCheckIn.readinessScore !== null) {
      readinessScore = latestCheckIn.readinessScore
    }

    if (latestCheckIn.fatigue !== null) {
      // Fatigue: higher is worse, so invert for the score
      fatigueScore = latestCheckIn.fatigue * 10
    }

    if (latestCheckIn.sleepQuality !== null) {
      sleepScore = latestCheckIn.sleepQuality * 10
    }

    if (latestCheckIn.stress !== null) {
      // Stress: higher is worse
      stressScore = latestCheckIn.stress * 10
    }
  }

  // Use DailyMetrics as fallback/supplement — contains Garmin-synced health data
  // (HRV, resting HR, sleep, stress) that may be available even without a manual check-in.
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const latestMetrics = await prisma.dailyMetrics.findFirst({
    where: {
      clientId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'desc' },
    select: {
      readinessScore: true,
      hrvRMSSD: true,
      hrvStatus: true,
      restingHR: true,
      restingHRStatus: true,
      sleepHours: true,
      sleepQuality: true,
      stress: true,
    },
  })

  if (latestMetrics) {
    // Use DailyMetrics readiness if no manual check-in readiness
    if (readinessScore === null && latestMetrics.readinessScore !== null) {
      readinessScore = latestMetrics.readinessScore
      sources.push('DAILY_METRICS')
    }

    // Fill sleep score from Garmin sleep data if not set from check-in
    if (sleepScore === null && latestMetrics.sleepQuality !== null) {
      sleepScore = latestMetrics.sleepQuality * 10
      if (!sources.includes('DAILY_METRICS')) sources.push('DAILY_METRICS')
    }

    // Fill stress from Garmin if not set from check-in (Garmin stress is 0-100, higher = worse)
    if (stressScore === null && latestMetrics.stress !== null) {
      stressScore = latestMetrics.stress
      if (!sources.includes('DAILY_METRICS')) sources.push('DAILY_METRICS')
    }

    // Derive fatigue from HRV status if not set from check-in
    if (fatigueScore === null && latestMetrics.hrvStatus) {
      const hrvFatigueMap: Record<string, number> = {
        EXCELLENT: 10, ABOVE_AVERAGE: 20, AVERAGE: 40,
        BELOW_AVERAGE: 65, POOR: 80, VERY_POOR: 95,
      }
      fatigueScore = hrvFatigueMap[latestMetrics.hrvStatus] ?? null
      if (fatigueScore !== null && !sources.includes('GARMIN')) sources.push('GARMIN')
    }
  }

  // Check for Garmin/Strava activity presence
  const [garminActivity, stravaActivity] = await Promise.all([
    prisma.garminActivity.findFirst({
      where: { clientId },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    }),
    prisma.stravaActivity.findFirst({
      where: { clientId },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    }),
  ])

  if (garminActivity && !sources.includes('GARMIN')) {
    sources.push('GARMIN')
  }
  if (stravaActivity) {
    sources.push('STRAVA')
  }

  // Calculate composite readiness if we have component scores but no direct readiness
  if (readinessScore === null && (sleepScore !== null || fatigueScore !== null)) {
    const components: number[] = []
    if (sleepScore !== null) components.push(sleepScore)
    if (fatigueScore !== null) components.push(100 - fatigueScore) // Invert fatigue
    if (stressScore !== null) components.push(100 - stressScore) // Invert stress

    if (components.length > 0) {
      readinessScore = Math.round(
        components.reduce((a, b) => a + b, 0) / components.length
      )
    }
  }

  return {
    readinessScore,
    fatigueScore,
    sleepScore,
    stressScore,
    sources,
  }
}

/**
 * Get readiness trend over a period
 */
export async function getReadinessTrend(
  clientId: string,
  days: number = 7
): Promise<{ date: Date; score: number }[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Fetch from both DailyCheckIn and DailyMetrics, merge by date
  const [checkIns, metrics] = await Promise.all([
    prisma.dailyCheckIn.findMany({
      where: { clientId, date: { gte: startDate } },
      orderBy: { date: 'asc' },
      select: { date: true, readinessScore: true },
    }),
    prisma.dailyMetrics.findMany({
      where: { clientId, date: { gte: startDate }, readinessScore: { not: null } },
      orderBy: { date: 'asc' },
      select: { date: true, readinessScore: true },
    }),
  ])

  // Merge: prefer DailyCheckIn, fill gaps with DailyMetrics
  const scoreByDate = new Map<string, { date: Date; score: number }>()
  for (const m of metrics) {
    if (m.readinessScore !== null) {
      scoreByDate.set(m.date.toISOString().split('T')[0], { date: m.date, score: m.readinessScore })
    }
  }
  for (const c of checkIns) {
    if (c.readinessScore !== null) {
      scoreByDate.set(c.date.toISOString().split('T')[0], { date: c.date, score: c.readinessScore })
    }
  }

  return Array.from(scoreByDate.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Detect low readiness patterns
 */
export async function detectLowReadinessPattern(
  clientId: string
): Promise<{
  hasPattern: boolean
  consecutiveLowDays: number
  averageReadiness7d: number | null
}> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Merge readiness from both DailyCheckIn and DailyMetrics
  const [checkIns, metrics] = await Promise.all([
    prisma.dailyCheckIn.findMany({
      where: { clientId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'desc' },
      select: { date: true, readinessScore: true },
    }),
    prisma.dailyMetrics.findMany({
      where: { clientId, date: { gte: sevenDaysAgo }, readinessScore: { not: null } },
      orderBy: { date: 'desc' },
      select: { date: true, readinessScore: true },
    }),
  ])

  // Merge by date: prefer DailyCheckIn, fill gaps with DailyMetrics
  const scoreByDate = new Map<string, number>()
  for (const m of metrics) {
    if (m.readinessScore !== null) {
      scoreByDate.set(m.date.toISOString().split('T')[0], m.readinessScore)
    }
  }
  for (const c of checkIns) {
    if (c.readinessScore !== null) {
      scoreByDate.set(c.date.toISOString().split('T')[0], c.readinessScore)
    }
  }

  const scores = Array.from(scoreByDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // desc by date
    .map(([, score]) => score)

  if (scores.length === 0) {
    return {
      hasPattern: false,
      consecutiveLowDays: 0,
      averageReadiness7d: null,
    }
  }

  // Count consecutive low readiness days (readiness < 50 on 0-100 scale)
  let consecutiveLowDays = 0
  for (const score of scores) {
    if (score < 50) {
      consecutiveLowDays++
    } else {
      break
    }
  }

  // Calculate average
  const averageReadiness7d =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null

  return {
    hasPattern: consecutiveLowDays >= 3,
    consecutiveLowDays,
    averageReadiness7d,
  }
}
