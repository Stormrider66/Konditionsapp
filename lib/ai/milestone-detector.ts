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
import { logger } from '@/lib/logger'

export type MilestoneType =
  | 'PERSONAL_RECORD'
  | 'CONSISTENCY_STREAK'
  | 'WORKOUT_COUNT'
  | 'TRAINING_ANNIVERSARY'
  | 'FIRST_WORKOUT'
  | 'COMEBACK'
  | 'PROGRAM_COMPLETED'

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

export interface MilestoneDetectionOptions {
  batchLimit?: number
  pageSize?: number
  concurrency?: number
  executionBudgetMs?: number
}

type AthleteCandidate = {
  id: string
}

type MilestoneDetectionOutcome =
  | { status: 'processed'; milestonesFound: number; notificationsCreated: number }
  | { status: 'error' }

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

async function calculateConsistencyStreak(clientId: string): Promise<number> {
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

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const checkInDates = new Set(checkIns.map((c) => c.date.toISOString().split('T')[0]))

  for (let i = 0; i <= 60; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (checkInDates.has(dateStr)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}

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

async function checkForPersonalRecords(clientId: string): Promise<DetectedMilestone[]> {
  const milestones: DetectedMilestone[] = []

  const recentSetLogs = await prisma.setLog.findMany({
    where: {
      assignment: {
        athleteId: clientId,
        completedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    },
    include: {
      exercise: { select: { name: true } },
      assignment: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const exercisePRs = new Map<string, { weight: number; reps: number; exerciseName: string }>()

  for (const log of recentSetLogs) {
    if (!log.weight || !log.repsCompleted) continue

    const existing = exercisePRs.get(log.exerciseId)
    if (!existing || log.weight > existing.weight) {
      exercisePRs.set(log.exerciseId, {
        weight: log.weight,
        reps: log.repsCompleted,
        exerciseName: log.exercise?.name || 'Unknown',
      })
    }
  }

  for (const [exerciseId, recent] of exercisePRs) {
    const historicalMax = await prisma.setLog.findFirst({
      where: {
        exerciseId,
        assignment: {
          athleteId: clientId,
          completedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        weight: { gt: 0 },
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

async function checkTrainingAnniversary(clientId: string): Promise<DetectedMilestone | null> {
  const firstWorkout = await prisma.strengthSessionAssignment.findFirst({
    where: { athleteId: clientId, status: 'COMPLETED' },
    orderBy: { completedAt: 'asc' },
    select: { completedAt: true },
  })

  if (!firstWorkout?.completedAt) return null

  const now = new Date()
  const start = new Date(firstWorkout.completedAt)
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

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

async function checkProgramCompletions(clientId: string): Promise<DetectedMilestone[]> {
  const milestones: DetectedMilestone[] = []
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const programs = await prisma.trainingProgram.findMany({
    where: {
      clientId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      weeks: {
        select: {
          days: {
            select: {
              workouts: {
                select: {
                  id: true,
                  logs: {
                    where: { completed: true },
                    select: { id: true, completedAt: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  for (const program of programs) {
    const allWorkouts = program.weeks.flatMap((w) => w.days.flatMap((d) => d.workouts))
    if (allWorkouts.length === 0) continue

    const allCompleted = allWorkouts.every((w) => w.logs.length > 0)
    if (!allCompleted) continue

    const lastCompletion = allWorkouts
      .flatMap((w) => w.logs)
      .map((l) => l.completedAt)
      .filter(Boolean)
      .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0]

    if (lastCompletion && lastCompletion >= oneDayAgo) {
      milestones.push({
        type: 'PROGRAM_COMPLETED',
        title: `Program slutfört: ${program.name}!`,
        description: `Du har genomfört alla ${allWorkouts.length} pass i ${program.name}!`,
        value: allWorkouts.length,
        unit: 'pass',
        icon: 'trophy',
        celebrationLevel: 'GOLD',
      })
    }
  }

  return milestones
}

export async function detectMilestones(clientId: string): Promise<DetectedMilestone[]> {
  const milestones: DetectedMilestone[] = []

  const prs = await checkForPersonalRecords(clientId)
  milestones.push(...prs)

  const streak = await calculateConsistencyStreak(clientId)
  const streakMilestone = checkStreakMilestone(streak)
  if (streakMilestone) milestones.push(streakMilestone)

  const workoutCount = await getTotalWorkoutCount(clientId)
  const countMilestone = checkWorkoutCountMilestone(workoutCount)
  if (countMilestone) milestones.push(countMilestone)

  const anniversary = await checkTrainingAnniversary(clientId)
  if (anniversary) milestones.push(anniversary)

  const programCompletions = await checkProgramCompletions(clientId)
  milestones.push(...programCompletions)

  return milestones
}

export async function createMilestoneNotification(
  clientId: string,
  milestone: DetectedMilestone
): Promise<string | null> {
  const triggerKey = getMilestoneTriggerKey(milestone)

  const existing = await prisma.aINotification.findFirst({
    where: {
      clientId,
      notificationType: 'MILESTONE',
      triggeredBy: triggerKey,
    },
  })

  if (existing) return null

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
      triggeredBy: triggerKey,
      triggerReason: `Milestone achieved: ${milestone.type}`,
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  })

  return notification.id
}

function getMilestoneTriggerKey(milestone: DetectedMilestone): string {
  if (milestone.type === 'PROGRAM_COMPLETED' || milestone.type === 'PERSONAL_RECORD') {
    return `${milestone.type}:${milestone.title}`
  }

  return `${milestone.type}:${milestone.value}`
}

async function processAthleteMilestones(
  athlete: AthleteCandidate
): Promise<MilestoneDetectionOutcome> {
  try {
    const milestones = await detectMilestones(athlete.id)

    let notificationsCreated = 0
    for (const milestone of milestones) {
      const notificationId = await createMilestoneNotification(athlete.id, milestone)
      if (notificationId) {
        notificationsCreated++
      }
    }

    return {
      status: 'processed',
      milestonesFound: milestones.length,
      notificationsCreated,
    }
  } catch (error) {
    logger.error('Error detecting milestones for athlete', { athleteId: athlete.id }, error)
    return { status: 'error' }
  }
}

export async function processAllAthleteMilestones(
  options: MilestoneDetectionOptions = {}
): Promise<{
  scanned: number
  processed: number
  milestonesFound: number
  notificationsCreated: number
  errors: number
  exhausted: boolean
  timedOut: boolean
  hasMore: boolean
}> {
  const batchLimit = options.batchLimit ?? DEFAULT_BATCH_LIMIT
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const executionBudgetMs = options.executionBudgetMs ?? DEFAULT_EXECUTION_BUDGET_MS

  const results = {
    scanned: 0,
    processed: 0,
    milestonesFound: 0,
    notificationsCreated: 0,
    errors: 0,
    exhausted: false,
    timedOut: false,
    hasMore: false,
  }

  const startTime = Date.now()

  try {
    let cursor: string | null = null

    while (results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const athletes: AthleteCandidate[] = await prisma.client.findMany({
        where: { athleteAccount: { isNot: null } },
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        take: pageSize,
        orderBy: { id: 'asc' },
        select: { id: true },
      })

      if (athletes.length === 0) {
        results.exhausted = true
        break
      }

      results.scanned += athletes.length
      cursor = athletes[athletes.length - 1].id

      const remainingCapacity = batchLimit - results.processed
      if (athletes.length > remainingCapacity) {
        results.hasMore = true
      }
      const athletesToProcess = athletes.slice(0, remainingCapacity)

      for (let i = 0; i < athletesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = athletesToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map(processAthleteMilestones))

        for (const outcome of outcomes) {
          results.processed++
          if (outcome.status === 'error') {
            results.errors++
            continue
          }

          results.milestonesFound += outcome.milestonesFound
          results.notificationsCreated += outcome.notificationsCreated
        }

        if (results.processed >= batchLimit) {
          break
        }
      }

      if (results.timedOut) {
        break
      }

      if (athletes.length < pageSize) {
        results.exhausted = true
        break
      }

      results.hasMore = true
    }

    return results
  } catch (error) {
    logger.error('Milestone detection failed', {}, error)
    return results
  }
}
