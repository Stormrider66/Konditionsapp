// lib/training-engine/progression/index.ts
/**
 * Automatic Progression System - Main Entry Point
 *
 * Coordinates all progression subsystems:
 * - 1RM estimation
 * - 2-for-2 rule
 * - Phase-based progression
 * - Plateau detection
 */

import { PrismaClient } from '@prisma/client'
import {
  estimate1RMWithConfidence,
  calculateAverage1RM,
  calculate1RMTrend,
  calculateProgressionRate,
  type RMEstimation,
} from './rm-estimation'
import {
  check2For2Rule,
  update2For2Status,
  checkForPlateau as checkForPlateauIn2For2,
  type TwoForTwoResult,
} from './two-for-two'
import {
  getPhaseParameters,
  calculateLoadForPhase,
  shouldTransitionPhase,
  alignWithRunningPhase,
  type StrengthPhase,
  type PhaseRecommendation,
} from './phase-progression'
import {
  detectPlateau,
  calculateDeload,
  getExerciseVariations,
  updatePlateauStatus,
  type PlateauAnalysis,
} from './plateau-detection'

const prisma = new PrismaClient()

/**
 * Complete progression calculation for a workout log
 *
 * This is the main function called after each strength workout
 *
 * @param input - Workout data
 * @returns Complete progression recommendation
 */
export async function calculateProgression(input: {
  clientId: string
  exerciseId: string
  date: Date
  sets: number
  repsCompleted: number
  repsTarget: number
  actualLoad: number
  rpe?: number
  strengthPhase?: StrengthPhase
}): Promise<ProgressionRecommendation> {
  const {
    clientId,
    exerciseId,
    date,
    sets,
    repsCompleted,
    repsTarget,
    actualLoad,
    rpe,
    strengthPhase = 'MAXIMUM_STRENGTH',
  } = input

  // Step 1: Calculate 1RM estimation
  const rmEstimation = estimate1RMWithConfidence(actualLoad, repsCompleted, 'AVERAGE')

  // Step 2: Check 2-for-2 rule
  const twoForTwoResult = await check2For2Rule(clientId, exerciseId, actualLoad, repsTarget, repsCompleted)

  // Step 3: Check for plateau
  const plateauAnalysis = await detectPlateau(clientId, exerciseId)

  // Step 4: Get phase parameters
  const phaseParams = getPhaseParameters(strengthPhase)

  // Step 5: Create or update progression tracking record
  const progressionRecord = await prisma.progressionTracking.create({
    data: {
      clientId,
      exerciseId,
      date,
      sets,
      repsCompleted,
      repsTarget,
      actualLoad,
      rpe,
      estimated1RM: rmEstimation.estimated1RM,
      estimationMethod: rmEstimation.method,
      strengthPhase,
      consecutiveSessionsWithExtraReps: twoForTwoResult.consecutiveSessions,
      readyForIncrease: twoForTwoResult.readyForIncrease,
      nextRecommendedLoad: twoForTwoResult.recommendedLoad,
      plateauWeeks: plateauAnalysis.weeksWithoutProgress,
      deloadRecommended: plateauAnalysis.recommendation === 'DELOAD',
      progressionStatus: plateauAnalysis.isPlateau
        ? plateauAnalysis.recommendation === 'DELOAD'
          ? 'DELOAD_NEEDED'
          : 'PLATEAU'
        : twoForTwoResult.readyForIncrease
        ? 'ON_TRACK'
        : 'ON_TRACK',
    },
  })

  // Step 6: Determine primary recommendation
  let primaryAction: ProgressionRecommendation['action']
  let reasoning: string
  let details: any = {}

  if (plateauAnalysis.recommendation === 'DELOAD') {
    primaryAction = 'DELOAD'
    const deloadPrescription = calculateDeload(sets, repsTarget, actualLoad)
    reasoning = plateauAnalysis.reasoning
    details = {
      deload: deloadPrescription,
      alternatives: await getExerciseVariations(exerciseId),
    }
  } else if (twoForTwoResult.readyForIncrease) {
    primaryAction = 'INCREASE_LOAD'
    reasoning = twoForTwoResult.reasoning
    details = {
      newLoad: twoForTwoResult.recommendedLoad,
      increasePercentage: twoForTwoResult.increasePercentage,
    }
  } else if (plateauAnalysis.recommendation === 'VARIATION') {
    primaryAction = 'VARIATION'
    reasoning = plateauAnalysis.reasoning
    details = {
      alternatives: await getExerciseVariations(exerciseId),
    }
  } else {
    primaryAction = 'MAINTAIN'
    reasoning = `Continue current load. ${twoForTwoResult.reasoning}`
    details = {}
  }

  return {
    action: primaryAction,
    reasoning,
    progressionTrackingId: progressionRecord.id,
    estimated1RM: rmEstimation.estimated1RM,
    confidence: rmEstimation.confidence,
    twoForTwo: twoForTwoResult,
    plateau: plateauAnalysis,
    phase: phaseParams,
    details,
  }
}

/**
 * Get progression history for an athlete-exercise pair
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise ID
 * @param limit - Number of records to return
 * @returns Progression history with trend analysis
 */
export async function getProgressionHistory(
  clientId: string,
  exerciseId: string,
  limit: number = 10
): Promise<{
  history: RMEstimation[]
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  progressionRate: number
  currentStatus: string
}> {
  const records = await prisma.progressionTracking.findMany({
    where: {
      clientId,
      exerciseId,
    },
    orderBy: {
      date: 'desc',
    },
    take: limit,
  })

  const history: RMEstimation[] = records.map((r) => ({
    weight: r.actualLoad,
    reps: r.repsCompleted,
    estimated1RM: r.estimated1RM,
    method: r.estimationMethod as any,
    confidence: 'MEDIUM' as const,
    percentageOf1RM: (r.actualLoad / r.estimated1RM) * 100,
    date: r.date,
  }))

  const progressionData = records.map((r) => ({
    date: r.date,
    estimated1RM: r.estimated1RM,
  }))

  const trend = calculate1RMTrend(progressionData)
  const progressionRate = calculateProgressionRate(
    progressionData.map((p) => ({ ...p, estimated1RM: p.estimated1RM }))
  )

  const latestRecord = records[0]
  const currentStatus = latestRecord ? latestRecord.progressionStatus : 'UNKNOWN'

  return {
    history,
    trend,
    progressionRate,
    currentStatus,
  }
}

/**
 * Get weekly progression summary for athlete
 *
 * @param clientId - Athlete ID
 * @returns Summary of all exercises
 */
export async function getWeeklyProgressionSummary(clientId: string): Promise<{
  totalExercises: number
  onTrack: number
  plateau: number
  deloadNeeded: number
  readyForIncrease: number
}> {
  // Get all unique exercises from last week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const recentRecords = await prisma.progressionTracking.findMany({
    where: {
      clientId,
      date: {
        gte: oneWeekAgo,
      },
    },
    distinct: ['exerciseId'],
    select: {
      progressionStatus: true,
      readyForIncrease: true,
    },
  })

  const summary = {
    totalExercises: recentRecords.length,
    onTrack: recentRecords.filter((r) => r.progressionStatus === 'ON_TRACK').length,
    plateau: recentRecords.filter((r) => r.progressionStatus === 'PLATEAU').length,
    deloadNeeded: recentRecords.filter((r) => r.progressionStatus === 'DELOAD_NEEDED').length,
    readyForIncrease: recentRecords.filter((r) => r.readyForIncrease).length,
  }

  return summary
}

/**
 * TypeScript types
 */
export interface ProgressionRecommendation {
  action: 'INCREASE_LOAD' | 'INCREASE_VOLUME' | 'DELOAD' | 'MAINTAIN' | 'VARIATION'
  reasoning: string
  progressionTrackingId: string
  estimated1RM: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  twoForTwo: TwoForTwoResult
  plateau: PlateauAnalysis
  phase: ReturnType<typeof getPhaseParameters>
  details: any
}

// Re-export all subsystem functions
export * from './rm-estimation'
export * from './two-for-two'
export * from './phase-progression'
export * from './plateau-detection'
