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

  // Try to get Garmin/Strava data if available
  const garminActivity = await prisma.garminActivity.findFirst({
    where: { clientId },
    orderBy: { startDate: 'desc' },
  })

  if (garminActivity) {
    sources.push('GARMIN')
    // Could extract HRV-based readiness from Garmin if available
  }

  const stravaActivity = await prisma.stravaActivity.findFirst({
    where: { clientId },
    orderBy: { startDate: 'desc' },
  })

  if (stravaActivity) {
    sources.push('STRAVA')
  }

  // Calculate composite readiness if we have component scores
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

  const checkIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      readinessScore: true,
    },
  })

  return checkIns
    .filter((c) => c.readinessScore !== null)
    .map((c) => ({
      date: c.date,
      score: c.readinessScore || 0,
    }))
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

  const checkIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'desc' },
    select: { readinessScore: true },
  })

  if (checkIns.length === 0) {
    return {
      hasPattern: false,
      consecutiveLowDays: 0,
      averageReadiness7d: null,
    }
  }

  // Count consecutive low readiness days (readiness < 50 on 0-100 scale)
  let consecutiveLowDays = 0
  for (const checkIn of checkIns) {
    if (checkIn.readinessScore !== null && checkIn.readinessScore < 50) {
      consecutiveLowDays++
    } else {
      break
    }
  }

  // Calculate average
  const validCheckIns = checkIns.filter((c) => c.readinessScore !== null)
  const averageReadiness7d =
    validCheckIns.length > 0
      ? validCheckIns.reduce((sum, c) => sum + (c.readinessScore || 0), 0) /
        validCheckIns.length
      : null

  return {
    hasPattern: consecutiveLowDays >= 3,
    consecutiveLowDays,
    averageReadiness7d,
  }
}
