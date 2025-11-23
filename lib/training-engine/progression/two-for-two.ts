// lib/training-engine/progression/two-for-two.ts
/**
 * The 2-for-2 Rule Implementation
 *
 * Scientific progression rule for strength training:
 * If an athlete can perform 2 or more additional reps beyond the target
 * for 2 consecutive sessions, increase the load.
 *
 * Load increases:
 * - Upper body: 2.5-5% (2.5-5kg)
 * - Lower body: 5-10% (5-10kg)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TwoForTwoResult {
  readyForIncrease: boolean
  consecutiveSessions: number
  recommendedLoad: number
  increasePercentage: number
  reasoning: string
}

/**
 * Check if athlete meets 2-for-2 rule criteria
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise ID
 * @param currentLoad - Current weight being used
 * @param targetReps - Prescribed target reps
 * @param actualReps - Actual reps completed
 * @returns 2-for-2 analysis result
 */
export async function check2For2Rule(
  clientId: string,
  exerciseId: string,
  currentLoad: number,
  targetReps: number,
  actualReps: number
): Promise<TwoForTwoResult> {
  // Check if current session has 2+ extra reps
  const extraReps = actualReps - targetReps
  const currentSessionQualifies = extraReps >= 2

  // Get last 2 sessions for this exercise at current load
  const recentSessions = await prisma.progressionTracking.findMany({
    where: {
      clientId,
      exerciseId,
      actualLoad: currentLoad,
    },
    orderBy: {
      date: 'desc',
    },
    take: 2,
  })

  // Count consecutive sessions with 2+ extra reps
  let consecutiveSessions = 0
  if (currentSessionQualifies) {
    consecutiveSessions = 1

    // Check if previous session also qualified
    if (recentSessions.length > 0) {
      const previousSession = recentSessions[0]
      const previousExtraReps = previousSession.repsCompleted - previousSession.repsTarget
      if (previousExtraReps >= 2) {
        consecutiveSessions = 2
      }
    }
  }

  const readyForIncrease = consecutiveSessions >= 2

  // Determine exercise type (upper vs lower body)
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { biomechanicalPillar: true },
  })

  const isLowerBody =
    exercise?.biomechanicalPillar === 'POSTERIOR_CHAIN' ||
    exercise?.biomechanicalPillar === 'KNEE_DOMINANCE' ||
    exercise?.biomechanicalPillar === 'UNILATERAL' ||
    exercise?.biomechanicalPillar === 'FOOT_ANKLE'

  // Calculate recommended load increase
  let increasePercentage: number
  if (isLowerBody) {
    increasePercentage = 5 // 5% for lower body
  } else {
    increasePercentage = 2.5 // 2.5% for upper body
  }

  const recommendedLoad = currentLoad * (1 + increasePercentage / 100)

  // Round to nearest 0.5kg (standard plate increments)
  const roundedLoad = Math.round(recommendedLoad * 2) / 2

  let reasoning = ''
  if (readyForIncrease) {
    reasoning = `Athlete performed ${extraReps}+ extra reps for 2 consecutive sessions. Increase load by ${increasePercentage}% (${isLowerBody ? 'lower' : 'upper'} body).`
  } else if (consecutiveSessions === 1) {
    reasoning = `Athlete performed ${extraReps}+ extra reps this session. One more qualifying session needed.`
  } else {
    reasoning = `Athlete did not meet 2-for-2 criteria (${actualReps} reps completed, ${targetReps} target).`
  }

  return {
    readyForIncrease,
    consecutiveSessions,
    recommendedLoad: roundedLoad,
    increasePercentage,
    reasoning,
  }
}

/**
 * Update progression tracking with 2-for-2 status
 *
 * @param progressionTrackingId - ProgressionTracking record ID
 * @param result - 2-for-2 analysis result
 */
export async function update2For2Status(
  progressionTrackingId: string,
  result: TwoForTwoResult
): Promise<void> {
  await prisma.progressionTracking.update({
    where: { id: progressionTrackingId },
    data: {
      consecutiveSessionsWithExtraReps: result.consecutiveSessions,
      readyForIncrease: result.readyForIncrease,
      nextRecommendedLoad: result.readyForIncrease ? result.recommendedLoad : null,
    },
  })
}

/**
 * Apply load increase and reset 2-for-2 tracking
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise ID
 * @param newLoad - New load to apply
 * @returns Updated progression tracking record
 */
export async function applyLoadIncrease(
  clientId: string,
  exerciseId: string,
  newLoad: number
): Promise<void> {
  // Find most recent progression record
  const latestRecord = await prisma.progressionTracking.findFirst({
    where: {
      clientId,
      exerciseId,
    },
    orderBy: {
      date: 'desc',
    },
  })

  if (!latestRecord) {
    throw new Error('No progression tracking record found')
  }

  // Update record with new load and reset counters
  await prisma.progressionTracking.update({
    where: { id: latestRecord.id },
    data: {
      actualLoad: newLoad,
      lastIncrease: new Date(),
      weeksAtCurrentLoad: 0,
      consecutiveSessionsWithExtraReps: 0,
      readyForIncrease: false,
      nextRecommendedLoad: null,
      progressionStatus: 'ON_TRACK',
    },
  })
}

/**
 * Calculate optimal rep range for current phase
 *
 * @param strengthPhase - Current strength training phase
 * @returns {minReps, maxReps, intensity}
 */
export function getRepRangeForPhase(strengthPhase: string): {
  minReps: number
  maxReps: number
  intensity: string
} {
  switch (strengthPhase) {
    case 'ANATOMICAL_ADAPTATION':
      return { minReps: 12, maxReps: 20, intensity: '40-60% 1RM' }
    case 'MAXIMUM_STRENGTH':
      return { minReps: 3, maxReps: 6, intensity: '80-95% 1RM' }
    case 'POWER':
      return { minReps: 4, maxReps: 6, intensity: '30-60% 1RM (max velocity)' }
    case 'MAINTENANCE':
      return { minReps: 3, maxReps: 5, intensity: '80-85% 1RM' }
    case 'TAPER':
      return { minReps: 3, maxReps: 5, intensity: '80-85% 1RM (reduced volume)' }
    default:
      return { minReps: 8, maxReps: 12, intensity: '60-75% 1RM' }
  }
}

/**
 * Determine if load increase should be volume or intensity based
 *
 * @param strengthPhase - Current phase
 * @param currentSets - Current number of sets
 * @param currentReps - Current reps per set
 * @returns "VOLUME" or "INTENSITY"
 */
export function determineProgressionType(
  strengthPhase: string,
  currentSets: number,
  currentReps: number
): 'VOLUME' | 'INTENSITY' {
  if (strengthPhase === 'ANATOMICAL_ADAPTATION') {
    // In AA phase, progress volume first (reps/sets)
    if (currentSets < 3 || currentReps < 15) {
      return 'VOLUME'
    }
  }

  if (strengthPhase === 'MAXIMUM_STRENGTH' || strengthPhase === 'POWER') {
    // In strength/power phases, progress intensity (load)
    return 'INTENSITY'
  }

  // Default: intensity progression
  return 'INTENSITY'
}

/**
 * Check if athlete has plateaued (no progress for 3+ weeks)
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise ID
 * @returns Plateau analysis
 */
export async function checkForPlateau(
  clientId: string,
  exerciseId: string
): Promise<{
  isPlateau: boolean
  weeksWithoutProgress: number
  recommendation: string
}> {
  // Get last 6 sessions (approximately 3 weeks with 2x weekly training)
  const recentSessions = await prisma.progressionTracking.findMany({
    where: {
      clientId,
      exerciseId,
    },
    orderBy: {
      date: 'desc',
    },
    take: 6,
  })

  if (recentSessions.length < 4) {
    return {
      isPlateau: false,
      weeksWithoutProgress: 0,
      recommendation: 'Insufficient data to determine plateau',
    }
  }

  // Check if load has increased in last 3 weeks
  const loads = recentSessions.map((s) => s.actualLoad)
  const hasIncreased = loads[0] > loads[loads.length - 1]

  if (!hasIncreased) {
    // No load increase - check 1RM progression
    const estimatedRMs = recentSessions.map((s) => s.estimated1RM)
    const rmChange = ((estimatedRMs[0] - estimatedRMs[estimatedRMs.length - 1]) / estimatedRMs[estimatedRMs.length - 1]) * 100

    const isPlateau = rmChange < 1 // Less than 1% improvement

    if (isPlateau) {
      return {
        isPlateau: true,
        weeksWithoutProgress: 3,
        recommendation:
          'Deload recommended: Reduce volume by 40-50% for 1 week, then resume with exercise variation or different rep scheme.',
      }
    }
  }

  return {
    isPlateau: false,
    weeksWithoutProgress: 0,
    recommendation: 'Progression on track',
  }
}

/**
 * TypeScript types
 */
export interface ProgressionRecommendation {
  action: 'INCREASE_LOAD' | 'INCREASE_VOLUME' | 'DELOAD' | 'MAINTAIN' | 'VARIATION'
  newLoad?: number
  newSets?: number
  newReps?: number
  reasoning: string
}
