/**
 * Milestone Detection Service
 *
 * Detects and celebrates athlete achievements:
 * - Personal Records (PRs) in strength/cardio
 * - Consistency streaks (training days, check-ins)
 * - Goal completions
 * - Training anniversaries
 */

import { prisma } from '@/lib/prisma'

export type MilestoneType =
  | 'PERSONAL_RECORD'
  | 'CONSISTENCY_STREAK'
  | 'WORKOUT_COUNT'
  | 'TRAINING_ANNIVERSARY'
  | 'FIRST_WORKOUT'
  | 'COMEBACK'

export interface DetectedMilestone {
  type: MilestoneType
  title: string
  description: string
  value?: number
  unit?: string
  previousBest?: number
  improvement?: number
  icon: string
  celebrationLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
}

/**
 * Calculate consistency streak (consecutive days with workouts or check-ins)
 */
async function calculateConsistencyStreak(clientId: string): Promise<number> {
  // Get all check-in dates for the last 60 days
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const checkIns = await prisma.dailyCheckIn.findMany({
    where: {
      clientId,
      date: { gte: sixtyDaysAgo },
    },
    select: { date: true },
    orderBy: { date: 'desc' },
  })

  if (checkIns.length === 0) return 0

  // Count consecutive days from today
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const checkInDates = new Set(
    checkIns.map((c) => c.date.toISOString().split('T')[0])
  )

  for (let i = 0; i <= 60; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (checkInDates.has(dateStr)) {
      streak++
    } else if (i > 0) {
      // Allow missing today, but break on any other gap
      break
    }
  }

  return streak
}

/**
 * Get total workout count for an athlete
 */
async function getTotalWorkoutCount(clientId: string): Promise<number> {
  const [strengthCount, cardioCount, hybridCount, programCount] = await Promise.all([
    prisma.strengthSessionAssignment.count({
      where: { athleteId: clientId, status: 'COMPLETED' },
    }),
    prisma.cardioSessionAssignment.count({
      where: { athleteId: clientId, status: 'COMPLETED' },
    }),
    prisma.hybridWorkoutAssignment.count({
      where: { athleteId: clientId, status: 'COMPLETED' },
    }),
    prisma.workoutLog.count({
      where: {
        completed: true,
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
      },
    }),
  ])

  return strengthCount + cardioCount + hybridCount + programCount
}

/**
 * Check for personal records in recent workouts
 */
async function checkForPersonalRecords(clientId: string): Promise<DetectedMilestone[]> {
  const milestones: DetectedMilestone[] = []

  // Check strength PRs from set logs
  const recentSetLogs = await prisma.setLog.findMany({
    where: {
      assignment: {
        athleteId: clientId,
        completedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    },
    include: {
      exercise: { select: { name: true } },
      assignment: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Group by exercise and find max weights
  const exercisePRs = new Map<string, { weight: number; reps: number; exerciseName: string }>()

  for (const log of recentSetLogs) {
    if (!log.weight || !log.repsCompleted) continue

    const key = log.exerciseId
    const existing = exercisePRs.get(key)

    if (!existing || log.weight > existing.weight) {
      exercisePRs.set(key, {
        weight: log.weight,
        reps: log.repsCompleted,
        exerciseName: log.exercise?.name || 'Unknown',
      })
    }
  }

  // Check if any are actual PRs (compare to historical data)
  for (const [exerciseId, recent] of exercisePRs) {
    const historicalMax = await prisma.setLog.findFirst({
      where: {
        exerciseId,
        assignment: {
          athleteId: clientId,
          completedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Before last 24 hours
          },
        },
        weight: { gt: 0 }, // Only consider non-zero weights
      },
      orderBy: { weight: 'desc' },
      select: { weight: true },
    })

    if (!historicalMax || recent.weight > (historicalMax.weight || 0)) {
      const improvement = historicalMax?.weight
        ? ((recent.weight - historicalMax.weight) / historicalMax.weight) * 100
        : 100

      milestones.push({
        type: 'PERSONAL_RECORD',
        title: `Nytt PR: ${recent.exerciseName}!`,
        description: `${recent.weight} kg x ${recent.reps} reps`,
        value: recent.weight,
        unit: 'kg',
        previousBest: historicalMax?.weight || undefined,
        improvement: Math.round(improvement),
        icon: 'trophy',
        celebrationLevel: improvement >= 10 ? 'GOLD' : improvement >= 5 ? 'SILVER' : 'BRONZE',
      })
    }
  }

  return milestones
}

/**
 * Check for workout count milestones
 */
function checkWorkoutCountMilestone(count: number): DetectedMilestone | null {
  const milestones = [
    { count: 1, title: 'Första träningen!', level: 'BRONZE' as const },
    { count: 10, title: '10 träningar!', level: 'BRONZE' as const },
    { count: 25, title: '25 träningar!', level: 'SILVER' as const },
    { count: 50, title: '50 träningar!', level: 'SILVER' as const },
    { count: 100, title: '100 träningar!', level: 'GOLD' as const },
    { count: 200, title: '200 träningar!', level: 'GOLD' as const },
    { count: 365, title: '365 träningar!', level: 'PLATINUM' as const },
    { count: 500, title: '500 träningar!', level: 'PLATINUM' as const },
  ]

  const milestone = milestones.find((m) => m.count === count)
  if (!milestone) return null

  return {
    type: 'WORKOUT_COUNT',
    title: milestone.title,
    description: `Du har genomfört ${count} träningspass!`,
    value: count,
    unit: 'träningar',
    icon: 'award',
    celebrationLevel: milestone.level,
  }
}

/**
 * Check for consistency streak milestones
 */
function checkStreakMilestone(streak: number): DetectedMilestone | null {
  const milestones = [
    { days: 3, title: '3 dagar i rad!', level: 'BRONZE' as const },
    { days: 7, title: 'En hel vecka!', level: 'SILVER' as const },
    { days: 14, title: '2 veckor i rad!', level: 'SILVER' as const },
    { days: 21, title: '3 veckor i rad!', level: 'GOLD' as const },
    { days: 30, title: 'En hel månad!', level: 'GOLD' as const },
    { days: 60, title: '60 dagar i rad!', level: 'PLATINUM' as const },
    { days: 100, title: '100 dagar!', level: 'PLATINUM' as const },
  ]

  const milestone = milestones.find((m) => m.days === streak)
  if (!milestone) return null

  return {
    type: 'CONSISTENCY_STREAK',
    title: milestone.title,
    description: `Du har checkat in ${streak} dagar i rad!`,
    value: streak,
    unit: 'dagar',
    icon: 'flame',
    celebrationLevel: milestone.level,
  }
}

/**
 * Check for training anniversary
 */
async function checkTrainingAnniversary(clientId: string): Promise<DetectedMilestone | null> {
  // Find first workout ever
  const firstWorkout = await prisma.strengthSessionAssignment.findFirst({
    where: { athleteId: clientId, status: 'COMPLETED' },
    orderBy: { completedAt: 'asc' },
    select: { completedAt: true },
  })

  if (!firstWorkout?.completedAt) return null

  const now = new Date()
  const start = new Date(firstWorkout.completedAt)
  const daysSinceStart = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Check for anniversary milestones
  const anniversaries = [
    { days: 30, title: '1 månad av träning!', level: 'BRONZE' as const },
    { days: 90, title: '3 månader av träning!', level: 'SILVER' as const },
    { days: 180, title: '6 månader av träning!', level: 'GOLD' as const },
    { days: 365, title: '1 år av träning!', level: 'PLATINUM' as const },
    { days: 730, title: '2 år av träning!', level: 'PLATINUM' as const },
  ]

  const anniversary = anniversaries.find((a) => a.days === daysSinceStart)
  if (!anniversary) return null

  return {
    type: 'TRAINING_ANNIVERSARY',
    title: anniversary.title,
    description: `Grattis! Du började träna för ${daysSinceStart} dagar sedan.`,
    value: daysSinceStart,
    unit: 'dagar',
    icon: 'cake',
    celebrationLevel: anniversary.level,
  }
}

/**
 * Detect all milestones for an athlete
 */
export async function detectMilestones(clientId: string): Promise<DetectedMilestone[]> {
  const milestones: DetectedMilestone[] = []

  // Check for PRs
  const prs = await checkForPersonalRecords(clientId)
  milestones.push(...prs)

  // Check consistency streak
  const streak = await calculateConsistencyStreak(clientId)
  const streakMilestone = checkStreakMilestone(streak)
  if (streakMilestone) milestones.push(streakMilestone)

  // Check workout count
  const workoutCount = await getTotalWorkoutCount(clientId)
  const countMilestone = checkWorkoutCountMilestone(workoutCount)
  if (countMilestone) milestones.push(countMilestone)

  // Check training anniversary
  const anniversary = await checkTrainingAnniversary(clientId)
  if (anniversary) milestones.push(anniversary)

  return milestones
}

/**
 * Create milestone celebration notification
 */
export async function createMilestoneNotification(
  clientId: string,
  milestone: DetectedMilestone
): Promise<string | null> {
  // Check if we already celebrated this milestone today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existing = await prisma.aINotification.findFirst({
    where: {
      clientId,
      notificationType: 'MILESTONE',
      triggeredBy: `${milestone.type}:${milestone.value}`,
      createdAt: { gte: today },
    },
  })

  if (existing) return null

  // Check if milestones are enabled
  const prefs = await prisma.aINotificationPreferences.findUnique({
    where: { clientId },
    select: { milestoneAlertsEnabled: true },
  })

  if (prefs && !prefs.milestoneAlertsEnabled) return null

  const notification = await prisma.aINotification.create({
    data: {
      clientId,
      notificationType: 'MILESTONE',
      priority: milestone.celebrationLevel === 'PLATINUM' ? 'HIGH' : 'NORMAL',
      title: milestone.title,
      message: milestone.description,
      icon: milestone.icon,
      contextData: {
        milestoneType: milestone.type,
        value: milestone.value,
        unit: milestone.unit,
        previousBest: milestone.previousBest,
        improvement: milestone.improvement,
        celebrationLevel: milestone.celebrationLevel,
      },
      triggeredBy: `${milestone.type}:${milestone.value}`,
      triggerReason: `Milestone achieved: ${milestone.type}`,
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Expire after 48 hours
    },
  })

  return notification.id
}

/**
 * Process milestone detection for all athletes
 */
export async function processAllAthleteMilestones(): Promise<{
  processed: number
  milestonesFound: number
  notificationsCreated: number
  errors: number
}> {
  const results = {
    processed: 0,
    milestonesFound: 0,
    notificationsCreated: 0,
    errors: 0,
  }

  const athletes = await prisma.client.findMany({
    where: { athleteAccount: { isNot: null } },
    select: { id: true },
  })

  for (const athlete of athletes) {
    results.processed++

    try {
      const milestones = await detectMilestones(athlete.id)
      results.milestonesFound += milestones.length

      for (const milestone of milestones) {
        const notificationId = await createMilestoneNotification(athlete.id, milestone)
        if (notificationId) {
          results.notificationsCreated++
        }
      }
    } catch (error) {
      results.errors++
      console.error(`Error detecting milestones for athlete ${athlete.id}:`, error)
    }
  }

  return results
}
