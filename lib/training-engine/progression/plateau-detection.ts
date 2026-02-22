// lib/training-engine/progression/plateau-detection.ts
/**
 * Plateau Detection & Deload System
 *
 * Detects when an athlete has stopped progressing and recommends interventions:
 * - Plateau: No progress for 3+ weeks → Deload or variation
 * - Deload: Reduce volume 40-50% for 1 week
 * - Exercise variation: Swap to similar movement pattern
 * - Recovery week: Auto-scheduling
 */

import { prisma } from '@/lib/prisma'
import { calculate1RMTrend } from './rm-estimation'
import { logger } from '@/lib/logger'

export interface PlateauAnalysis {
  isPlateau: boolean
  weeksWithoutProgress: number
  recommendation: 'CONTINUE' | 'DELOAD' | 'VARIATION' | 'DETRAINING'
  reasoning: string
  suggestedActions: string[]
}

/**
 * Detect plateau for a specific exercise
 *
 * Criteria:
 * - No load increase for 3+ weeks
 * - 1RM estimation stagnant or declining
 * - Reps not increasing at current load
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise ID
 * @returns Plateau analysis
 */
export async function detectPlateau(clientId: string, exerciseId: string): Promise<PlateauAnalysis> {
  // Get last 8 sessions (4 weeks with 2x weekly training)
  const recentSessions = await prisma.progressionTracking.findMany({
    where: {
      clientId,
      exerciseId,
    },
    orderBy: {
      date: 'desc',
    },
    take: 8,
  })

  if (recentSessions.length < 4) {
    return {
      isPlateau: false,
      weeksWithoutProgress: 0,
      recommendation: 'CONTINUE',
      reasoning: 'Insufficient data to assess plateau (need 4+ sessions)',
      suggestedActions: [],
    }
  }

  // Sort chronologically (oldest first)
  const sessions = recentSessions.reverse()

  // Check 1: Load progression
  const firstLoad = sessions[0].actualLoad
  const lastLoad = sessions[sessions.length - 1].actualLoad
  const loadIncreased = lastLoad > firstLoad

  // Check 2: 1RM trend
  const progressionData = sessions.map((s) => ({
    date: s.date,
    estimated1RM: s.estimated1RM,
  }))
  const trend = calculate1RMTrend(progressionData)

  // Check 3: Reps at current load
  const currentLoad = lastLoad
  const sessionsAtCurrentLoad = sessions.filter((s) => s.actualLoad === currentLoad)

  let repsIncreasing = false
  if (sessionsAtCurrentLoad.length >= 2) {
    const firstReps = sessionsAtCurrentLoad[0].repsCompleted
    const lastReps = sessionsAtCurrentLoad[sessionsAtCurrentLoad.length - 1].repsCompleted
    repsIncreasing = lastReps > firstReps
  }

  // Calculate weeks without progress
  const firstDate = sessions[0].date
  const lastDate = sessions[sessions.length - 1].date
  const weeksSpan = Math.floor(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
  )

  // Determine plateau status
  const isPlateau = !loadIncreased && trend !== 'IMPROVING' && !repsIncreasing

  if (isPlateau) {
    // Check for detraining (declining performance)
    if (trend === 'DECLINING') {
      return {
        isPlateau: true,
        weeksWithoutProgress: weeksSpan,
        recommendation: 'DELOAD',
        reasoning: `Performance declining over ${weeksSpan} weeks. Immediate deload needed.`,
        suggestedActions: [
          'Deload: Reduce volume by 40-50% for 1 week',
          'Check for overtraining signs (sleep, stress, nutrition)',
          'Consider extending recovery between sessions',
        ],
      }
    }

    // Standard plateau
    if (weeksSpan >= 3) {
      return {
        isPlateau: true,
        weeksWithoutProgress: weeksSpan,
        recommendation: 'DELOAD',
        reasoning: `No progress for ${weeksSpan} weeks. Plateau detected.`,
        suggestedActions: [
          'Deload: Reduce volume by 40-50% for 1 week',
          'After deload, try exercise variation (see alternatives)',
          'Consider changing rep scheme (e.g., 5×5 → 3×8)',
        ],
      }
    }

    // Early plateau (2-3 weeks)
    return {
      isPlateau: true,
      weeksWithoutProgress: weeksSpan,
      recommendation: 'VARIATION',
      reasoning: `Minimal progress for ${weeksSpan} weeks. Consider variation.`,
      suggestedActions: [
        'Try exercise variation (similar movement pattern)',
        'Adjust rep scheme slightly',
        'Add tempo work (3-1-1-0) for new stimulus',
      ],
    }
  }

  // No plateau detected
  return {
    isPlateau: false,
    weeksWithoutProgress: 0,
    recommendation: 'CONTINUE',
    reasoning: trend === 'IMPROVING' ? 'Progressing well' : 'Stable performance',
    suggestedActions: [],
  }
}

/**
 * Calculate deload recommendations
 *
 * Deload reduces volume (sets × reps) by 40-50% while maintaining intensity
 *
 * @param currentSets - Current sets
 * @param currentReps - Current reps
 * @param currentLoad - Current load (kg)
 * @returns Deload prescription
 */
export function calculateDeload(
  currentSets: number,
  currentReps: number,
  currentLoad: number
): {
  sets: number
  reps: number
  load: number
  volumeReduction: number
  reasoning: string
} {
  // Reduce sets by 50%
  const deloadSets = Math.max(1, Math.floor(currentSets / 2))

  // Reduce reps by 20-30%
  const deloadReps = Math.max(3, Math.floor(currentReps * 0.75))

  // MAINTAIN intensity (load stays the same or slightly reduced)
  const deloadLoad = currentLoad * 0.95 // 5% reduction optional

  const currentVolume = currentSets * currentReps
  const deloadVolume = deloadSets * deloadReps
  const volumeReduction = ((currentVolume - deloadVolume) / currentVolume) * 100

  return {
    sets: deloadSets,
    reps: deloadReps,
    load: Math.round(deloadLoad * 2) / 2, // Round to 0.5kg
    volumeReduction: Math.round(volumeReduction),
    reasoning: `Deload: ${currentSets}×${currentReps} @ ${currentLoad}kg → ${deloadSets}×${deloadReps} @ ${deloadLoad}kg (${Math.round(volumeReduction)}% volume reduction)`,
  }
}

/**
 * Get exercise variation suggestions
 *
 * @param exerciseId - Current exercise ID
 * @returns Array of alternative exercises
 */
export async function getExerciseVariations(exerciseId: string): Promise<
  Array<{
    id: string
    name: string
    similarity: string
    reasoning: string
  }>
> {
  // Get current exercise
  const currentExercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      biomechanicalPillar: true,
      progressionLevel: true,
      category: true,
    },
  })

  if (!currentExercise) return []

  // Find similar exercises (same pillar, similar difficulty)
  const alternatives = await prisma.exercise.findMany({
    where: {
      id: { not: exerciseId }, // Exclude current exercise
      biomechanicalPillar: currentExercise.biomechanicalPillar,
      category: currentExercise.category,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      progressionLevel: true,
    },
    take: 5,
  })

  return alternatives.map((alt) => ({
    id: alt.id,
    name: alt.name,
    similarity: alt.progressionLevel === currentExercise.progressionLevel ? 'SAME_LEVEL' : 'DIFFERENT_LEVEL',
    reasoning: `Alternative ${currentExercise.biomechanicalPillar?.toLowerCase()} exercise`,
  }))
}

/**
 * Schedule recovery week
 *
 * Every 3-4 weeks, schedule a deload week
 *
 * @param lastDeloadDate - Date of last deload
 * @returns {shouldDeload, reasoning}
 */
export function shouldScheduleDeload(lastDeloadDate: Date | null): {
  shouldDeload: boolean
  weeksSinceDeload: number
  reasoning: string
} {
  if (!lastDeloadDate) {
    return {
      shouldDeload: false,
      weeksSinceDeload: 0,
      reasoning: 'No previous deload recorded. Continue regular training.',
    }
  }

  const now = new Date()
  const weeksSinceDeload = Math.floor(
    (now.getTime() - lastDeloadDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
  )

  if (weeksSinceDeload >= 4) {
    return {
      shouldDeload: true,
      weeksSinceDeload,
      reasoning: `${weeksSinceDeload} weeks since last deload. Schedule recovery week.`,
    }
  }

  return {
    shouldDeload: false,
    weeksSinceDeload,
    reasoning: `${weeksSinceDeload}/4 weeks since last deload. Continue training.`,
  }
}

/**
 * Update progression tracking with plateau status
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise ID
 * @param analysis - Plateau analysis
 */
export async function updatePlateauStatus(
  clientId: string,
  exerciseId: string,
  analysis: PlateauAnalysis
): Promise<void> {
  const latestRecord = await prisma.progressionTracking.findFirst({
    where: {
      clientId,
      exerciseId,
    },
    orderBy: {
      date: 'desc',
    },
  })

  if (!latestRecord) return

  await prisma.progressionTracking.update({
    where: { id: latestRecord.id },
    data: {
      plateauWeeks: analysis.weeksWithoutProgress,
      deloadRecommended: analysis.recommendation === 'DELOAD',
      progressionStatus: analysis.isPlateau
        ? analysis.recommendation === 'DELOAD'
          ? 'DELOAD_NEEDED'
          : 'PLATEAU'
        : 'ON_TRACK',
    },
  })
}

/**
 * Create notification for coach about plateau
 *
 * @param clientId - Athlete ID
 * @param exerciseId - Exercise ID
 * @param analysis - Plateau analysis
 */
export async function createPlateauNotification(
  clientId: string,
  exerciseId: string,
  analysis: PlateauAnalysis
): Promise<void> {
  if (!analysis.isPlateau) return

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, userId: true },
  })

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { name: true },
  })

  if (!client || !exercise) return

  const title = analysis.recommendation === 'DELOAD'
    ? `Platå upptäckt: ${exercise.name} — Deload rekommenderas`
    : `Platå upptäckt: ${exercise.name} — Variation rekommenderas`

  const message = `${client.name} har inte gjort framsteg på ${exercise.name} på ${analysis.weeksWithoutProgress} veckor. ${analysis.reasoning}`

  await prisma.aINotification.create({
    data: {
      clientId,
      notificationType: 'PATTERN_ALERT',
      title,
      message,
      priority: analysis.recommendation === 'DELOAD' ? 'HIGH' : 'MEDIUM',
      contextData: {
        exerciseId,
        exerciseName: exercise.name,
        recommendation: analysis.recommendation,
        weeksWithoutProgress: analysis.weeksWithoutProgress,
        suggestedActions: analysis.suggestedActions,
      },
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  })

  logger.info('Plateau notification created', {
    clientName: client.name,
    exerciseName: exercise.name,
    recommendation: analysis.recommendation,
  })
}

/**
 * TypeScript types
 */
export interface DeloadPrescription {
  sets: number
  reps: number
  load: number
  volumeReduction: number
  duration: string // "1 week"
  reasoning: string
}

export interface ExerciseVariation {
  id: string
  name: string
  similarity: 'SAME_LEVEL' | 'DIFFERENT_LEVEL' | 'EASIER' | 'HARDER'
  reasoning: string
}
