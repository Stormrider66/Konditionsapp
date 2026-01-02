/**
 * Muscular Fatigue Calculator
 *
 * Calculates fatigue levels per muscle group based on recent workout logs.
 * Used to display fatigue indicators on the athlete dashboard.
 *
 * Fatigue is determined by:
 * 1. Volume (sets × reps × weight)
 * 2. Recency (more recent = higher fatigue weight)
 * 3. Intensity (RPE/perceived effort)
 */

export type FatigueLevel = 'HIGH' | 'MODERATE' | 'FRESH'

export interface MuscularFatigueData {
  muscleGroup: string
  level: FatigueLevel
  lastWorked: Date | null
  volumeScore: number // 0-100 normalized
}

export interface SetLogWithExercise {
  id: string
  exerciseId: string
  weight: number
  repsCompleted: number
  rpe: number | null
  completedAt: Date
  exercise?: {
    muscleGroup: string | null
    biomechanicalPillar: string | null
    category: string
  } | null
}

export interface WorkoutLogWithSetLogs {
  id: string
  completedAt: Date | null
  completed: boolean
  perceivedEffort: number | null
  workout?: {
    type: string
    intensity: string
  } | null
  setLogs: SetLogWithExercise[]
}

// Map biomechanical pillars to display muscle groups
const PILLAR_TO_MUSCLE_GROUP: Record<string, string> = {
  POSTERIOR_CHAIN: 'Ben & Rumpa',
  KNEE_DOMINANCE: 'Ben & Rumpa',
  UNILATERAL: 'Ben & Rumpa',
  FOOT_ANKLE: 'Vader & Fötter',
  ANTI_ROTATION_CORE: 'Core',
  UPPER_BODY: 'Överkropp',
}

// Running/cardio workout types affect legs
const CARDIO_TYPES = ['RUNNING', 'CYCLING', 'SKIING', 'TRIATHLON', 'HYROX']

// Default muscle groups to track
const DEFAULT_MUSCLE_GROUPS = ['Ben & Rumpa', 'Core', 'Överkropp']

/**
 * Calculate time-based decay factor
 * More recent workouts have higher weight
 */
function calculateDecayFactor(completedAt: Date, now: Date): number {
  const hoursAgo =
    (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60)

  // Full weight (1.0) for first 24 hours
  // Decays to 0.5 at 48 hours
  // Decays to 0.25 at 72 hours
  // Near zero after 7 days
  if (hoursAgo <= 24) return 1.0
  if (hoursAgo <= 48) return 0.75
  if (hoursAgo <= 72) return 0.5
  if (hoursAgo <= 96) return 0.35
  if (hoursAgo <= 120) return 0.25
  if (hoursAgo <= 168) return 0.15
  return 0.05
}

/**
 * Calculate volume score from sets
 */
function calculateSetVolume(
  weight: number,
  reps: number,
  rpe: number | null
): number {
  // Base volume = weight × reps
  let volume = weight * reps

  // If bodyweight exercise (weight = 0), use reps × 10
  if (weight === 0) {
    volume = reps * 10
  }

  // Apply RPE multiplier (higher RPE = more fatigue)
  if (rpe !== null && rpe >= 7) {
    volume *= 1 + (rpe - 7) * 0.1 // RPE 10 = 1.3x multiplier
  }

  return volume
}

/**
 * Get muscle group from exercise or workout type
 */
function getMuscleGroup(
  exercise: { muscleGroup: string | null; biomechanicalPillar: string | null } | null,
  workoutType?: string
): string | null {
  // Try biomechanical pillar first
  if (exercise?.biomechanicalPillar) {
    return PILLAR_TO_MUSCLE_GROUP[exercise.biomechanicalPillar] || null
  }

  // Try muscle group
  if (exercise?.muscleGroup) {
    // Normalize to our display groups
    const normalized = exercise.muscleGroup.toLowerCase()
    if (normalized.includes('leg') || normalized.includes('glute') || normalized.includes('quad') || normalized.includes('hamstring')) {
      return 'Ben & Rumpa'
    }
    if (normalized.includes('core') || normalized.includes('abs') || normalized.includes('abdominal')) {
      return 'Core'
    }
    if (normalized.includes('upper') || normalized.includes('chest') || normalized.includes('back') || normalized.includes('shoulder') || normalized.includes('arm')) {
      return 'Överkropp'
    }
    return exercise.muscleGroup
  }

  // For cardio workouts, affect legs
  if (workoutType && CARDIO_TYPES.includes(workoutType)) {
    return 'Ben & Rumpa'
  }

  return null
}

/**
 * Determine fatigue level from normalized score
 */
function scoreToLevel(score: number): FatigueLevel {
  if (score >= 70) return 'HIGH'
  if (score >= 35) return 'MODERATE'
  return 'FRESH'
}

/**
 * Main function: Calculate muscular fatigue from recent workout logs
 */
export function calculateMuscularFatigue(
  recentLogs: WorkoutLogWithSetLogs[],
  days: number = 7
): MuscularFatigueData[] {
  const now = new Date()
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Filter to completed logs within timeframe
  const relevantLogs = recentLogs.filter(
    (log) =>
      log.completed &&
      log.completedAt &&
      new Date(log.completedAt) >= cutoff
  )

  // Accumulate fatigue per muscle group
  const fatigueMap: Record<
    string,
    { volume: number; lastWorked: Date | null }
  > = {}

  // Initialize default groups
  for (const group of DEFAULT_MUSCLE_GROUPS) {
    fatigueMap[group] = { volume: 0, lastWorked: null }
  }

  for (const log of relevantLogs) {
    const completedAt = log.completedAt ? new Date(log.completedAt) : now
    const decayFactor = calculateDecayFactor(completedAt, now)

    // Process set logs
    for (const setLog of log.setLogs) {
      const muscleGroup = getMuscleGroup(
        setLog.exercise || null,
        log.workout?.type
      )

      if (!muscleGroup) continue

      // Initialize if new group
      if (!fatigueMap[muscleGroup]) {
        fatigueMap[muscleGroup] = { volume: 0, lastWorked: null }
      }

      // Calculate and add volume with decay
      const setVolume = calculateSetVolume(
        setLog.weight,
        setLog.repsCompleted,
        setLog.rpe
      )
      fatigueMap[muscleGroup].volume += setVolume * decayFactor

      // Track last worked
      if (
        !fatigueMap[muscleGroup].lastWorked ||
        completedAt > fatigueMap[muscleGroup].lastWorked!
      ) {
        fatigueMap[muscleGroup].lastWorked = completedAt
      }
    }

    // For cardio workouts without set logs, add base fatigue
    if (
      log.setLogs.length === 0 &&
      log.workout?.type &&
      CARDIO_TYPES.includes(log.workout.type)
    ) {
      const muscleGroup = 'Ben & Rumpa'

      // Estimate volume based on perceived effort and workout intensity
      let baseVolume = 100
      if (log.perceivedEffort) {
        baseVolume = log.perceivedEffort * 20 // RPE 5 = 100, RPE 10 = 200
      }
      if (log.workout.intensity === 'INTERVAL' || log.workout.intensity === 'THRESHOLD') {
        baseVolume *= 1.5
      }

      fatigueMap[muscleGroup].volume += baseVolume * decayFactor

      if (
        !fatigueMap[muscleGroup].lastWorked ||
        completedAt > fatigueMap[muscleGroup].lastWorked!
      ) {
        fatigueMap[muscleGroup].lastWorked = completedAt
      }
    }
  }

  // Find max volume for normalization
  const maxVolume = Math.max(
    ...Object.values(fatigueMap).map((d) => d.volume),
    1 // Prevent division by zero
  )

  // Convert to result format
  const results: MuscularFatigueData[] = []

  for (const [muscleGroup, data] of Object.entries(fatigueMap)) {
    // Normalize to 0-100 scale
    const normalizedScore = Math.min((data.volume / maxVolume) * 100, 100)

    results.push({
      muscleGroup,
      level: scoreToLevel(normalizedScore),
      lastWorked: data.lastWorked,
      volumeScore: Math.round(normalizedScore),
    })
  }

  // Sort by volume score (highest fatigue first)
  results.sort((a, b) => b.volumeScore - a.volumeScore)

  return results
}

/**
 * Simplified fatigue calculation for running workouts only
 * Used when athlete has no strength training data
 */
export function calculateRunningFatigue(
  recentLogs: { completedAt: Date | null; perceivedEffort: number | null }[],
  days: number = 7
): FatigueLevel {
  const now = new Date()
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Filter to recent logs
  const relevantLogs = recentLogs.filter(
    (log) => log.completedAt && new Date(log.completedAt) >= cutoff
  )

  if (relevantLogs.length === 0) {
    return 'FRESH'
  }

  // Calculate average RPE with recency weighting
  let totalWeightedRPE = 0
  let totalWeight = 0

  for (const log of relevantLogs) {
    if (!log.completedAt) continue
    const decayFactor = calculateDecayFactor(new Date(log.completedAt), now)
    const rpe = log.perceivedEffort || 5 // Default to middle
    totalWeightedRPE += rpe * decayFactor
    totalWeight += decayFactor
  }

  const avgRPE = totalWeight > 0 ? totalWeightedRPE / totalWeight : 5

  // Determine level
  if (avgRPE >= 7) return 'HIGH'
  if (avgRPE >= 5) return 'MODERATE'
  return 'FRESH'
}

/**
 * Get human-readable fatigue description
 */
export function getFatigueDescription(level: FatigueLevel): string {
  switch (level) {
    case 'HIGH':
      return 'Hög belastning - prioritera återhämtning'
    case 'MODERATE':
      return 'Måttlig belastning - normal träning möjlig'
    case 'FRESH':
      return 'Utvilad - redo för intensiv träning'
  }
}

/**
 * Get fatigue badge color class
 */
export function getFatigueBadgeColor(level: FatigueLevel): string {
  switch (level) {
    case 'HIGH':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'MODERATE':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'FRESH':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
  }
}
