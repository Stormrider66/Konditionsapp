/**
 * Red Flag Detection System
 *
 * Automatically detects critical recovery issues that override
 * normal readiness scoring and force workout modifications.
 *
 * Red flags include:
 * - HRV critically low (< 75% baseline)
 * - RHR significantly elevated (> +10 bpm)
 * - Illness symptoms
 * - Injury/pain
 * - Extreme fatigue
 * - Poor sleep
 * - Consecutive decline (5+ days)
 *
 * Philosophy: Red flags ALWAYS override other factors
 */

import type { RedFlagType, RedFlagDetection, ModificationDecision } from './types'

/**
 * Readiness component inputs for red flag detection
 */
export interface ReadinessComponents {
  hrv?: {
    percentOfBaseline: number
    consecutiveDecliningDays: number
  }
  rhr?: {
    deviationBpm: number
    consecutiveElevatedDays: number
  }
  wellness?: {
    fatigue: number // 1-10 (1 = extreme fatigue)
    muscleSoreness: number // 1-10
    stress: number // 1-10
    mood: number // 1-10
  }
  sleep?: {
    duration: number // hours
    quality: number // 1-10
  }
  pain?: {
    hasPain: boolean
    severity: number // 1-10 if hasPain
    location?: string
  }
}

/**
 * Detect all red flags from readiness components
 */
export function detectRedFlags(components: ReadinessComponents): RedFlagDetection {
  const flags: RedFlagType[] = []
  const criticalFlags: RedFlagType[] = []

  // HRV Red Flags
  if (components.hrv) {
    if (components.hrv.percentOfBaseline < 75) {
      flags.push('HRV_CRITICAL')
      criticalFlags.push('HRV_CRITICAL')
    }

    if (components.hrv.consecutiveDecliningDays >= 5) {
      flags.push('CONSECUTIVE_DECLINE')
      criticalFlags.push('CONSECUTIVE_DECLINE')
    }
  }

  // RHR Red Flags
  if (components.rhr) {
    if (components.rhr.deviationBpm > 10) {
      flags.push('RHR_ELEVATED')
      criticalFlags.push('RHR_ELEVATED')
    }
  }

  // Wellness Red Flags
  if (components.wellness) {
    // Extreme fatigue (1-2 on scale)
    if (components.wellness.fatigue <= 2) {
      flags.push('EXTREME_FATIGUE')
      criticalFlags.push('EXTREME_FATIGUE')
    }

    // Combined stress indicators suggest illness
    const illnessIndicators = [
      components.wellness.fatigue <= 3,
      components.wellness.muscleSoreness >= 8,
      components.wellness.mood <= 3,
      components.wellness.stress >= 8,
    ].filter(Boolean).length

    if (illnessIndicators >= 3) {
      flags.push('ILLNESS_SUSPECTED')
      criticalFlags.push('ILLNESS_SUSPECTED')
    }
  }

  // Sleep Red Flags
  if (components.sleep) {
    if (components.sleep.duration < 4) {
      flags.push('POOR_SLEEP')
      criticalFlags.push('POOR_SLEEP')
    }
  }

  // Pain/Injury Red Flags
  if (components.pain?.hasPain) {
    flags.push('INJURY_PAIN')
    criticalFlags.push('INJURY_PAIN')
  }

  // Determine forced decision if critical flags present
  let forcedDecision: ModificationDecision | undefined
  if (criticalFlags.length > 0) {
    forcedDecision = determineForcedDecision(criticalFlags)
  }

  return {
    hasRedFlags: flags.length > 0,
    flags,
    criticalFlags,
    forcedDecision,
    explanation: generateRedFlagExplanation(flags),
    recommendations: generateRedFlagRecommendations(flags),
  }
}

/**
 * Determine what decision is forced by critical flags
 */
function determineForcedDecision(criticalFlags: RedFlagType[]): ModificationDecision {
  // Most severe flags force complete rest
  const forceRestFlags: RedFlagType[] = [
    'HRV_CRITICAL',
    'RHR_ELEVATED',
    'ILLNESS_SUSPECTED',
    'INJURY_PAIN',
    'POOR_SLEEP',
  ]

  const hasForceRestFlag = criticalFlags.some(flag => forceRestFlags.includes(flag))
  if (hasForceRestFlag) {
    return 'REST'
  }

  // Other critical flags allow easy training
  return 'EASY_DAY'
}

/**
 * Generate explanation for red flags
 */
function generateRedFlagExplanation(flags: RedFlagType[]): string {
  if (flags.length === 0) {
    return 'No red flags detected. All recovery markers within normal range.'
  }

  const explanations: Record<RedFlagType, string> = {
    HRV_CRITICAL: 'Heart rate variability is critically low (<75% of baseline), indicating significant stress or incomplete recovery.',
    RHR_ELEVATED: 'Resting heart rate is elevated (+10 bpm), a strong indicator of insufficient recovery or possible illness.',
    ILLNESS_SUSPECTED: 'Multiple wellness indicators suggest possible illness: extreme fatigue, poor mood, high stress, or severe soreness.',
    INJURY_PAIN: 'Pain or injury has been reported. Training through pain risks further injury.',
    EXTREME_FATIGUE: 'Extreme fatigue reported, indicating the body needs recovery time.',
    POOR_SLEEP: 'Insufficient sleep (<4 hours) severely impairs recovery and performance.',
    CONSECUTIVE_DECLINE: '5+ consecutive days of declining readiness - accumulated fatigue requires immediate attention.',
  }

  const flagExplanations = flags.map(flag => `• ${explanations[flag]}`).join('\n')

  return `⚠️ Critical Recovery Issues Detected:\n\n${flagExplanations}`
}

/**
 * Generate recommendations for addressing red flags
 */
function generateRedFlagRecommendations(flags: RedFlagType[]): string[] {
  const recommendations: string[] = []

  // HRV-specific
  if (flags.includes('HRV_CRITICAL')) {
    recommendations.push('Complete rest until HRV recovers to >80% of baseline')
    recommendations.push('Prioritize sleep (8-9 hours minimum)')
    recommendations.push('Reduce all life stressors where possible')
    recommendations.push('Light movement only: walking, gentle stretching')
  }

  // RHR-specific
  if (flags.includes('RHR_ELEVATED')) {
    recommendations.push('Monitor RHR daily - looking for return to baseline')
    recommendations.push('Check for illness symptoms (fever, sore throat, etc.)')
    recommendations.push('Ensure adequate hydration')
    recommendations.push('No training until RHR normalizes')
  }

  // Illness-specific
  if (flags.includes('ILLNESS_SUSPECTED')) {
    recommendations.push('Monitor for illness symptoms over next 24-48 hours')
    recommendations.push('Consider medical consultation if symptoms persist')
    recommendations.push('Complete rest - do not train through illness')
    recommendations.push('Return to training only when fully recovered')
  }

  // Injury-specific
  if (flags.includes('INJURY_PAIN')) {
    recommendations.push('Stop all activities causing pain')
    recommendations.push('Consider professional assessment (physiotherapist, doctor)')
    recommendations.push('Cross-training may be possible if pain-free')
    recommendations.push('Do not return to running until pain-free')
  }

  // Fatigue-specific
  if (flags.includes('EXTREME_FATIGUE')) {
    recommendations.push('Review nutrition - ensure adequate calorie intake')
    recommendations.push('Check iron levels if fatigue persists')
    recommendations.push('Reduce training volume by 50% this week')
    recommendations.push('Consider extra recovery day')
  }

  // Sleep-specific
  if (flags.includes('POOR_SLEEP')) {
    recommendations.push('Make sleep the #1 priority tonight')
    recommendations.push('Aim for 8-9 hours in dark, cool, quiet room')
    recommendations.push('Avoid screens 1 hour before bed')
    recommendations.push('No training until sleep normalizes')
  }

  // Consecutive decline
  if (flags.includes('CONSECUTIVE_DECLINE')) {
    recommendations.push('Take 2-3 complete rest days')
    recommendations.push('Review weekly training load - may be too high')
    recommendations.push('Return with reduced volume (50-75% of normal)')
    recommendations.push('Monitor readiness closely for next 7 days')
  }

  // General recommendations if no specific flags addressed above
  if (recommendations.length === 0) {
    recommendations.push('Follow modification guidance')
    recommendations.push('Monitor readiness daily')
    recommendations.push('Return to normal training when flags clear')
  }

  return recommendations
}

/**
 * Check if red flags allow ANY training
 */
export function canTrainWithRedFlags(flags: RedFlagType[]): {
  canTrain: boolean
  maxAllowedIntensity: 'REST' | 'RECOVERY' | 'EASY'
  explanation: string
} {
  if (flags.length === 0) {
    return {
      canTrain: true,
      maxAllowedIntensity: 'EASY',
      explanation: 'No red flags - normal training allowed',
    }
  }

  // Critical flags that prohibit all training
  const noTrainFlags: RedFlagType[] = [
    'HRV_CRITICAL',
    'RHR_ELEVATED',
    'ILLNESS_SUSPECTED',
    'INJURY_PAIN',
    'POOR_SLEEP',
  ]

  const hasNoTrainFlag = flags.some(flag => noTrainFlags.includes(flag))
  if (hasNoTrainFlag) {
    return {
      canTrain: false,
      maxAllowedIntensity: 'REST',
      explanation: 'Critical red flags require complete rest',
    }
  }

  // Other flags allow recovery/easy training
  return {
    canTrain: true,
    maxAllowedIntensity: 'RECOVERY',
    explanation: 'Red flags present - only recovery pace allowed',
  }
}

/**
 * Estimate when red flags might clear
 */
export function estimateRecoveryTime(flags: RedFlagType[]): {
  minDays: number
  maxDays: number
  explanation: string
} {
  if (flags.length === 0) {
    return {
      minDays: 0,
      maxDays: 0,
      explanation: "No recovery needed - you're ready to train",
    }
  }

  // Estimate based on worst flag
  const recoveryTimes: Record<RedFlagType, { min: number; max: number; explanation: string }> = {
    HRV_CRITICAL: {
      min: 2,
      max: 5,
      explanation: 'HRV typically recovers in 2-5 days with proper rest',
    },
    RHR_ELEVATED: {
      min: 1,
      max: 3,
      explanation: 'RHR usually normalizes in 1-3 days',
    },
    ILLNESS_SUSPECTED: {
      min: 3,
      max: 14,
      explanation: 'Illness recovery varies widely - return when fully recovered',
    },
    INJURY_PAIN: {
      min: 3,
      max: 21,
      explanation: 'Injury healing time varies - seek professional guidance',
    },
    EXTREME_FATIGUE: {
      min: 1,
      max: 3,
      explanation: 'Fatigue usually resolves in 1-3 days with rest',
    },
    POOR_SLEEP: {
      min: 1,
      max: 2,
      explanation: 'One night of good sleep often resolves issue',
    },
    CONSECUTIVE_DECLINE: {
      min: 2,
      max: 7,
      explanation: 'Accumulated fatigue requires 2-7 days recovery',
    },
  }

  // Find longest recovery time among flags
  let maxMin = 0
  let maxMax = 0
  let worstFlag = flags[0]

  for (const flag of flags) {
    const times = recoveryTimes[flag]
    if (times.max > maxMax) {
      maxMin = times.min
      maxMax = times.max
      worstFlag = flag
    }
  }

  return {
    minDays: maxMin,
    maxDays: maxMax,
    explanation: recoveryTimes[worstFlag].explanation,
  }
}

/**
 * Check if athlete should seek medical attention
 */
export function shouldSeekMedicalAttention(
  flags: RedFlagType[],
  components: ReadinessComponents
): {
  recommended: boolean
  urgency: 'ROUTINE' | 'SOON' | 'URGENT'
  reasons: string[]
} {
  const reasons: string[] = []
  let urgency: 'ROUTINE' | 'SOON' | 'URGENT' = 'ROUTINE'

  // Persistent illness
  if (flags.includes('ILLNESS_SUSPECTED')) {
    reasons.push('Possible illness symptoms detected')
    urgency = 'SOON'
  }

  // Injury with pain
  if (flags.includes('INJURY_PAIN') && components.pain?.severity && components.pain.severity >= 7) {
    reasons.push('Severe pain reported (7+/10)')
    urgency = 'URGENT'
  }

  // Extreme and persistent fatigue
  if (flags.includes('EXTREME_FATIGUE') && flags.includes('CONSECUTIVE_DECLINE')) {
    reasons.push('Persistent extreme fatigue - check for underlying issues')
    urgency = 'SOON'
  }

  // Very elevated RHR with other symptoms
  if (components.rhr?.deviationBpm && components.rhr.deviationBpm > 15) {
    reasons.push('Severely elevated resting heart rate (+15 bpm)')
    urgency = 'URGENT'
  }

  return {
    recommended: reasons.length > 0,
    urgency,
    reasons,
  }
}
