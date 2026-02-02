/**
 * Behavior Perception Module
 *
 * Analyzes athlete behavior patterns including check-ins and workout completion.
 */

import { prisma } from '@/lib/prisma'
import type { BehaviorData } from '../types'

/**
 * Perceive behavioral data for an athlete
 */
export async function perceiveBehavior(clientId: string): Promise<BehaviorData> {
  const now = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get client for streak info
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { bestCheckInStreak: true },
  })

  // Calculate current check-in streak
  const checkInStreak = await calculateCheckInStreak(clientId)

  // Count missed workouts in last 7 days
  const missedWorkouts7d = await countMissedWorkouts(clientId, sevenDaysAgo)

  // Calculate completion rate for last 30 days
  const completionRate30d = await calculateCompletionRate(clientId, thirtyDaysAgo)

  // Find days since last activity log
  const daysSinceLastLog = await getDaysSinceLastLog(clientId)

  return {
    checkInStreak,
    bestStreak: client?.bestCheckInStreak ?? 0,
    missedWorkouts7d,
    completionRate30d,
    daysSinceLastLog,
  }
}

/**
 * Calculate current check-in streak
 */
async function calculateCheckInStreak(clientId: string): Promise<number> {
  const checkIns = await prisma.dailyCheckIn.findMany({
    where: { clientId },
    orderBy: { date: 'desc' },
    take: 30,
    select: { date: true },
  })

  if (checkIns.length === 0) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < checkIns.length; i++) {
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)

    const checkInDate = new Date(checkIns[i].date)
    checkInDate.setHours(0, 0, 0, 0)

    if (checkInDate.getTime() === expectedDate.getTime()) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Count missed workouts since a date
 */
async function countMissedWorkouts(clientId: string, since: Date): Promise<number> {
  // Check strength session assignments
  const missedStrength = await prisma.strengthSessionAssignment.count({
    where: {
      athleteId: clientId,
      assignedDate: { gte: since },
      status: 'SKIPPED',
    },
  })

  // Check cardio session assignments
  const missedCardio = await prisma.cardioSessionAssignment.count({
    where: {
      athleteId: clientId,
      assignedDate: { gte: since },
      status: 'SKIPPED',
    },
  })

  // Check hybrid workout assignments
  const missedHybrid = await prisma.hybridWorkoutAssignment.count({
    where: {
      athleteId: clientId,
      assignedDate: { gte: since },
      status: 'SKIPPED',
    },
  })

  // Also count pending assignments past their date as effectively "missed"
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pendingPastStrength = await prisma.strengthSessionAssignment.count({
    where: {
      athleteId: clientId,
      assignedDate: { gte: since, lt: today },
      status: 'PENDING',
    },
  })

  const pendingPastCardio = await prisma.cardioSessionAssignment.count({
    where: {
      athleteId: clientId,
      assignedDate: { gte: since, lt: today },
      status: 'PENDING',
    },
  })

  const pendingPastHybrid = await prisma.hybridWorkoutAssignment.count({
    where: {
      athleteId: clientId,
      assignedDate: { gte: since, lt: today },
      status: 'PENDING',
    },
  })

  return (
    missedStrength +
    missedCardio +
    missedHybrid +
    pendingPastStrength +
    pendingPastCardio +
    pendingPastHybrid
  )
}

/**
 * Calculate workout completion rate
 */
async function calculateCompletionRate(
  clientId: string,
  since: Date
): Promise<number> {
  // Get all assignments in the period
  const [strengthTotal, cardioTotal, hybridTotal] = await Promise.all([
    prisma.strengthSessionAssignment.count({
      where: { athleteId: clientId, assignedDate: { gte: since } },
    }),
    prisma.cardioSessionAssignment.count({
      where: { athleteId: clientId, assignedDate: { gte: since } },
    }),
    prisma.hybridWorkoutAssignment.count({
      where: { athleteId: clientId, assignedDate: { gte: since } },
    }),
  ])

  const total = strengthTotal + cardioTotal + hybridTotal
  if (total === 0) return 100 // No assignments = 100% completion

  // Get completed assignments
  const [strengthCompleted, cardioCompleted, hybridCompleted] = await Promise.all([
    prisma.strengthSessionAssignment.count({
      where: {
        athleteId: clientId,
        assignedDate: { gte: since },
        status: 'COMPLETED',
      },
    }),
    prisma.cardioSessionAssignment.count({
      where: {
        athleteId: clientId,
        assignedDate: { gte: since },
        status: 'COMPLETED',
      },
    }),
    prisma.hybridWorkoutAssignment.count({
      where: {
        athleteId: clientId,
        assignedDate: { gte: since },
        status: 'COMPLETED',
      },
    }),
  ])

  const completed = strengthCompleted + cardioCompleted + hybridCompleted
  return Math.round((completed / total) * 100)
}

/**
 * Get days since last activity log
 */
async function getDaysSinceLastLog(clientId: string): Promise<number> {
  // Check multiple sources for last activity
  const [lastCheckIn, lastAdHocWorkout, lastStrengthLog] = await Promise.all([
    prisma.dailyCheckIn.findFirst({
      where: { clientId },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.adHocWorkout.findFirst({
      where: { athleteId: clientId },
      orderBy: { workoutDate: 'desc' },
      select: { workoutDate: true },
    }),
    prisma.strengthSessionAssignment.findFirst({
      where: { athleteId: clientId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
  ])

  const lastDates = [
    lastCheckIn?.date,
    lastAdHocWorkout?.workoutDate,
    lastStrengthLog?.completedAt,
  ].filter(Boolean) as Date[]

  if (lastDates.length === 0) return 999 // Never logged

  const mostRecent = new Date(Math.max(...lastDates.map((d) => d.getTime())))
  const now = new Date()
  const diffMs = now.getTime() - mostRecent.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check for engagement warning signs
 */
export async function checkEngagementWarnings(clientId: string): Promise<{
  hasWarning: boolean
  warnings: string[]
}> {
  const behavior = await perceiveBehavior(clientId)
  const warnings: string[] = []

  if (behavior.daysSinceLastLog >= 3) {
    warnings.push(`No activity logged in ${behavior.daysSinceLastLog} days`)
  }

  if (behavior.checkInStreak === 0 && behavior.bestStreak > 0) {
    warnings.push('Check-in streak broken')
  }

  if (behavior.missedWorkouts7d >= 3) {
    warnings.push(`${behavior.missedWorkouts7d} missed workouts in last 7 days`)
  }

  if (behavior.completionRate30d < 50) {
    warnings.push(`Low workout completion rate (${behavior.completionRate30d}%)`)
  }

  return {
    hasWarning: warnings.length > 0,
    warnings,
  }
}
