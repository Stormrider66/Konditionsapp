/**
 * Workout Modification Decision Engine
 *
 * Core logic for determining workout modifications based on:
 * - Athlete readiness score (0-10)
 * - Workout intensity
 * - Training methodology
 * - Red flags
 * - Coach preferences
 *
 * Philosophy:
 * - Safety first: when in doubt, reduce training
 * - Methodology-aware: Norwegian requires higher readiness
 * - Red flags override all other factors
 * - Transparent: always explain decisions
 */

import type {
  ModificationDecision,
  ReadinessLevel,
  WorkoutIntensity,
  RedFlagType,
  WorkoutModification,
} from './types'
import { MethodologyType } from '../methodologies/types'

/**
 * Map readiness score to level
 */
export function getReadinessLevel(score: number): ReadinessLevel {
  if (score >= 9) return 'EXCELLENT'
  if (score >= 7) return 'GOOD'
  if (score >= 5) return 'MODERATE'
  if (score >= 3) return 'FAIR'
  if (score >= 1) return 'POOR'
  return 'VERY_POOR'
}

/**
 * Determine modification decision
 *
 * Main decision engine that combines:
 * - Readiness score
 * - Workout intensity
 * - Methodology requirements
 * - Red flags
 */
export function determineModification(
  readinessScore: number,
  workoutIntensity: WorkoutIntensity,
  methodology: MethodologyType,
  redFlags: RedFlagType[]
): ModificationDecision {
  // RED FLAGS OVERRIDE EVERYTHING
  if (redFlags.length > 0) {
    return handleRedFlags(redFlags, workoutIntensity)
  }

  const readinessLevel = getReadinessLevel(readinessScore)

  // Get methodology-specific thresholds
  const thresholds = getMethodologyThresholds(methodology)

  // Decision matrix based on readiness and intensity
  return applyDecisionMatrix(
    readinessScore,
    readinessLevel,
    workoutIntensity,
    thresholds
  )
}

/**
 * Handle red flag situations
 */
function handleRedFlags(
  redFlags: RedFlagType[],
  workoutIntensity: WorkoutIntensity
): ModificationDecision {
  // Critical flags that force complete rest
  const criticalFlags: RedFlagType[] = [
    'HRV_CRITICAL',
    'RHR_ELEVATED',
    'ILLNESS_SUSPECTED',
    'INJURY_PAIN',
    'POOR_SLEEP',
  ]

  const hasCriticalFlag = redFlags.some(flag => criticalFlags.includes(flag))

  if (hasCriticalFlag) {
    return 'REST' // Mandatory rest
  }

  // Non-critical flags still require caution
  if (workoutIntensity === 'VERY_HARD' || workoutIntensity === 'HARD') {
    return 'EASY_DAY' // Convert hard workouts to easy
  }

  if (workoutIntensity === 'THRESHOLD' || workoutIntensity === 'MODERATE') {
    return 'REDUCE_BOTH' // Reduce intensity and volume
  }

  return 'PROCEED' // Easy workouts can proceed with red flags
}

/**
 * Get methodology-specific readiness thresholds
 */
function getMethodologyThresholds(methodology: MethodologyType): {
  minForThreshold: number
  minForHard: number
  minForVeryHard: number
} {
  const thresholds: Record<
    MethodologyType,
    { minForThreshold: number; minForHard: number; minForVeryHard: number }
  > = {
    POLARIZED: {
      minForThreshold: 5.0, // Moderate readiness OK
      minForHard: 6.0,
      minForVeryHard: 7.0,
    },
    PYRAMIDAL: {
      minForThreshold: 5.5, // More tempo work requires slightly higher
      minForHard: 6.5,
      minForVeryHard: 7.5,
    },
    CANOVA: {
      minForThreshold: 6.0, // Race-specific work requires good readiness
      minForHard: 7.0,
      minForVeryHard: 8.0,
    },
    NORWEGIAN: {
      minForThreshold: 7.0, // STRICT: double threshold requires high readiness
      minForHard: 7.5,
      minForVeryHard: 8.5,
    },
    NORWEGIAN_SINGLE: {
      minForThreshold: 6.5, // Single threshold workout per week, slightly lower than double
      minForHard: 7.0,
      minForVeryHard: 8.0,
    },
  }

  return thresholds[methodology]
}

/**
 * Apply decision matrix
 *
 * Comprehensive decision logic based on all factors
 */
function applyDecisionMatrix(
  readinessScore: number,
  readinessLevel: ReadinessLevel,
  workoutIntensity: WorkoutIntensity,
  thresholds: { minForThreshold: number; minForHard: number; minForVeryHard: number }
): ModificationDecision {
  // EXCELLENT readiness (9-10): Proceed with everything
  if (readinessLevel === 'EXCELLENT') {
    return 'PROCEED'
  }

  // GOOD readiness (7-8.9): Can do most workouts
  if (readinessLevel === 'GOOD') {
    if (workoutIntensity === 'VERY_HARD' && readinessScore < thresholds.minForVeryHard) {
      return 'REDUCE_INTENSITY' // Reduce VO2max intervals
    }
    return 'PROCEED' // All other workouts OK
  }

  // MODERATE readiness (5-6.9): Proceed with caution
  if (readinessLevel === 'MODERATE') {
    if (workoutIntensity === 'VERY_HARD') {
      return 'EASY_DAY' // Convert to easy day
    }
    if (workoutIntensity === 'HARD') {
      if (readinessScore >= thresholds.minForHard) {
        return 'REDUCE_INTENSITY' // Reduce but proceed
      }
      return 'REDUCE_BOTH' // Reduce significantly
    }
    if (workoutIntensity === 'THRESHOLD') {
      if (readinessScore >= thresholds.minForThreshold) {
        return 'REDUCE_VOLUME' // Shorter threshold session
      }
      return 'REDUCE_BOTH'
    }
    if (workoutIntensity === 'MODERATE') {
      return 'REDUCE_VOLUME' // Less tempo work
    }
    return 'PROCEED' // Easy workouts proceed
  }

  // FAIR readiness (3-4.9): Significantly reduce training
  if (readinessLevel === 'FAIR') {
    if (workoutIntensity === 'VERY_HARD' || workoutIntensity === 'HARD') {
      return 'EASY_DAY' // All quality work becomes easy
    }
    if (workoutIntensity === 'THRESHOLD' || workoutIntensity === 'MODERATE') {
      return 'EASY_DAY' // All intensity becomes easy
    }
    if (workoutIntensity === 'EASY') {
      return 'REDUCE_VOLUME' // Shorter easy run
    }
    return 'PROCEED' // Recovery pace OK
  }

  // POOR readiness (1-2.9): Minimal training
  if (readinessLevel === 'POOR') {
    if (workoutIntensity === 'RECOVERY') {
      return 'REDUCE_VOLUME' // Short recovery
    }
    if (workoutIntensity === 'EASY') {
      return 'CROSS_TRAIN' // Consider cross-training
    }
    return 'REST' // All quality work cancelled
  }

  // VERY_POOR readiness (0-0.9): Mandatory rest
  return 'REST'
}

/**
 * Get modification rationale
 *
 * Explain why this modification was made
 */
export function getModificationRationale(
  decision: ModificationDecision,
  readinessScore: number,
  readinessLevel: ReadinessLevel,
  workoutIntensity: WorkoutIntensity,
  methodology: MethodologyType,
  redFlags: RedFlagType[]
): string {
  // Red flag rationale
  if (redFlags.length > 0) {
    const flagDescriptions = redFlags.map(flag => getRedFlagDescription(flag)).join(', ')
    if (decision === 'REST') {
      return `Mandatory rest due to critical recovery markers: ${flagDescriptions}. Your body needs recovery before resuming training.`
    }
    return `Modified due to recovery concerns: ${flagDescriptions}. Reducing training load to prevent overtraining.`
  }

  // Readiness-based rationale
  const readinessDesc = getReadinessDescription(readinessLevel, readinessScore)

  if (decision === 'PROCEED') {
    return `${readinessDesc} You're ready for today's ${workoutIntensity.toLowerCase()} workout.`
  }

  if (decision === 'REDUCE_INTENSITY') {
    return `${readinessDesc} Reducing workout intensity to match current recovery status. ${getMethodologyNote(methodology, workoutIntensity)}`
  }

  if (decision === 'REDUCE_VOLUME') {
    return `${readinessDesc} Shortening workout duration to reduce training stress while maintaining intensity.`
  }

  if (decision === 'REDUCE_BOTH') {
    return `${readinessDesc} Reducing both intensity and volume to allow continued adaptation while respecting recovery needs.`
  }

  if (decision === 'EASY_DAY') {
    return `${readinessDesc} Converting today's ${workoutIntensity.toLowerCase()} workout to easy aerobic pace. Recovery takes priority.`
  }

  if (decision === 'CROSS_TRAIN') {
    return `${readinessDesc} Consider cross-training (cycling, pool running, swimming) for low-impact aerobic stimulus.`
  }

  if (decision === 'REST') {
    return `${readinessDesc} Complete rest is needed. Your body is showing signs it needs recovery time.`
  }

  return `Training modified based on readiness assessment.`
}

/**
 * Get red flag description
 */
function getRedFlagDescription(flag: RedFlagType): string {
  const descriptions: Record<RedFlagType, string> = {
    HRV_CRITICAL: 'critically low HRV (<75% baseline)',
    RHR_ELEVATED: 'elevated resting heart rate (+10 bpm)',
    ILLNESS_SUSPECTED: 'possible illness symptoms',
    INJURY_PAIN: 'pain or injury reported',
    EXTREME_FATIGUE: 'extreme fatigue',
    POOR_SLEEP: 'insufficient sleep (<4 hours)',
    CONSECUTIVE_DECLINE: '5+ days of declining readiness',
  }
  return descriptions[flag]
}

/**
 * Get readiness description
 */
function getReadinessDescription(level: ReadinessLevel, score: number): string {
  const descriptions: Record<ReadinessLevel, string> = {
    EXCELLENT: `Excellent readiness (${score.toFixed(1)}/10).`,
    GOOD: `Good readiness (${score.toFixed(1)}/10).`,
    MODERATE: `Moderate readiness (${score.toFixed(1)}/10).`,
    FAIR: `Fair readiness (${score.toFixed(1)}/10).`,
    POOR: `Poor readiness (${score.toFixed(1)}/10).`,
    VERY_POOR: `Very poor readiness (${score.toFixed(1)}/10).`,
  }
  return descriptions[level]
}

/**
 * Get methodology-specific note
 */
function getMethodologyNote(methodology: MethodologyType, intensity: WorkoutIntensity): string {
  if (methodology === 'NORWEGIAN' && (intensity === 'THRESHOLD' || intensity === 'HARD')) {
    return 'Norwegian method requires high readiness for threshold sessions - prioritizing recovery.'
  }
  if (methodology === 'CANOVA' && intensity === 'THRESHOLD') {
    return 'Race-specific work requires good readiness for quality execution.'
  }
  return ''
}

/**
 * Get modification recommendations
 *
 * Actionable advice for the athlete
 */
export function getModificationRecommendations(
  decision: ModificationDecision,
  readinessLevel: ReadinessLevel,
  redFlags: RedFlagType[]
): string[] {
  const recommendations: string[] = []

  // Red flag recommendations
  if (redFlags.includes('HRV_CRITICAL') || redFlags.includes('RHR_ELEVATED')) {
    recommendations.push('Monitor HRV and RHR daily for improvement')
    recommendations.push('Prioritize sleep (8+ hours) and nutrition')
  }

  if (redFlags.includes('ILLNESS_SUSPECTED')) {
    recommendations.push('Monitor for illness symptoms')
    recommendations.push('Consider medical consultation if symptoms persist')
  }

  if (redFlags.includes('POOR_SLEEP')) {
    recommendations.push('Prioritize sleep tonight (aim for 8-9 hours)')
    recommendations.push('Review sleep hygiene practices')
  }

  if (redFlags.includes('EXTREME_FATIGUE')) {
    recommendations.push('Increase calorie intake if training volume is high')
    recommendations.push('Consider nap or earlier bedtime')
  }

  // Readiness-based recommendations
  if (readinessLevel === 'POOR' || readinessLevel === 'VERY_POOR') {
    recommendations.push('Focus on recovery: sleep, nutrition, hydration, stress management')
    recommendations.push('Light movement (walking, yoga) may aid recovery')
    recommendations.push('Return to training when readiness improves')
  }

  if (readinessLevel === 'FAIR') {
    recommendations.push('Keep training easy and short')
    recommendations.push('Avoid adding new stressors')
  }

  if (readinessLevel === 'MODERATE') {
    recommendations.push('Monitor how you feel during workout - stop if unusually hard')
    recommendations.push('Extra recovery time before next hard session')
  }

  // Decision-specific recommendations
  if (decision === 'CROSS_TRAIN') {
    recommendations.push('Deep water running or cycling maintain fitness with less impact')
    recommendations.push('Match HR zones to planned running workout')
  }

  if (decision === 'EASY_DAY') {
    recommendations.push('Keep HR in Zone 1 (truly conversational pace)')
    recommendations.push('Focus on form and enjoy the easier effort')
  }

  // Generic good practices
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring daily readiness')
    recommendations.push('Maintain consistent sleep and nutrition habits')
  }

  return recommendations
}
