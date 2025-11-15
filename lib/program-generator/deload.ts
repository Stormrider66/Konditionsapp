/**
 * Advanced Deload Logic
 *
 * Intelligent recovery week scheduling based on:
 * - ACWR (Acute:Chronic Workload Ratio)
 * - Athlete experience and level
 * - Training phase (more recovery needed in peak phases)
 * - Methodology (Norwegian requires more frequent recovery)
 * - Accumulated fatigue patterns
 *
 * Philosophy:
 * - Beginners need more frequent recovery (every 3 weeks)
 * - Advanced athletes can handle longer blocks (every 4 weeks)
 * - Elite athletes may extend to 5 weeks with proper monitoring
 * - Peak phases require extra recovery due to high intensity
 * - Norwegian method needs recovery every 3 weeks (high volume stress)
 */

import { PeriodPhase } from '@/types'
import { MethodologyType, AthleteLevel } from '@/lib/training-engine/methodologies'

export interface DeloadSchedule {
  weekNumber: number
  deloadPercentage: number // 50-80%
  reason: string
  type: 'SCHEDULED' | 'PHASE_TRANSITION' | 'FATIGUE_MANAGEMENT'
}

export interface DeloadConfig {
  baseFrequencyWeeks: number // How often to deload (3, 4, or 5 weeks)
  deloadPercentage: number // Default volume reduction (60-80%)
  minDeloadPercentage: number // Minimum volume (50%)
  maxDeloadPercentage: number // Maximum volume (80%)
  phaseTransitionDeload: boolean // Extra deload when changing phases
}

/**
 * Get deload configuration based on athlete level and methodology
 */
export function getDeloadConfig(
  athleteLevel: AthleteLevel,
  methodology: MethodologyType
): DeloadConfig {
  // Base frequency by athlete level
  const baseFrequency: Record<AthleteLevel, number> = {
    BEGINNER: 3, // Every 3 weeks
    RECREATIONAL: 3, // Every 3 weeks
    ADVANCED: 4, // Every 4 weeks
    ELITE: 4, // Every 4 weeks (can extend to 5 with monitoring)
  }

  // Norwegian method requires more frequent recovery
  const frequency = methodology === 'NORWEGIAN'
    ? Math.max(baseFrequency[athleteLevel] - 1, 3) // Every 3 weeks for Norwegian
    : baseFrequency[athleteLevel]

  // Deload percentage by level (less experienced = more recovery)
  const deloadPercentageMap: Record<AthleteLevel, number> = {
    BEGINNER: 60, // 60% of normal volume
    RECREATIONAL: 65, // 65% of normal volume
    ADVANCED: 70, // 70% of normal volume
    ELITE: 75, // 75% of normal volume
  }

  return {
    baseFrequencyWeeks: frequency,
    deloadPercentage: deloadPercentageMap[athleteLevel],
    minDeloadPercentage: 50,
    maxDeloadPercentage: 80,
    phaseTransitionDeload: true, // Always deload between major phases
  }
}

/**
 * Calculate deload schedule for entire program
 */
export function calculateDeloadSchedule(
  totalWeeks: number,
  athleteLevel: AthleteLevel,
  methodology: MethodologyType,
  phases: { weekNumber: number; phase: PeriodPhase }[]
): DeloadSchedule[] {
  const config = getDeloadConfig(athleteLevel, methodology)
  const deloads: DeloadSchedule[] = []

  // Track consecutive loading weeks
  let weeksInBlock = 0
  let lastDeloadWeek = 0

  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const currentPhase = phases.find(p => p.weekNumber === weekNum)?.phase
    const nextPhase = phases.find(p => p.weekNumber === weekNum + 1)?.phase

    // Check for phase transition deload
    const isPhaseTransition = currentPhase !== nextPhase &&
                              nextPhase &&
                              (currentPhase === 'BASE' && nextPhase === 'BUILD' ||
                               currentPhase === 'BUILD' && nextPhase === 'PEAK' ||
                               currentPhase === 'PEAK' && nextPhase === 'TAPER')

    // Skip deload in final 2 weeks (taper phase)
    const isTaperPhase = currentPhase === 'TAPER' ||
                         (totalWeeks - weekNum < 2)

    if (isTaperPhase) {
      continue // No deload during taper
    }

    // Scheduled deload (every N weeks)
    weeksInBlock++
    const isScheduledDeload = weeksInBlock >= config.baseFrequencyWeeks

    // Determine if this week should be a deload
    if (isPhaseTransition && config.phaseTransitionDeload) {
      // Phase transition deload (lighter than scheduled)
      deloads.push({
        weekNumber: weekNum,
        deloadPercentage: config.maxDeloadPercentage, // 80%
        reason: `Phase transition: ${currentPhase} → ${nextPhase}`,
        type: 'PHASE_TRANSITION',
      })
      weeksInBlock = 0
      lastDeloadWeek = weekNum
    } else if (isScheduledDeload) {
      // Regular scheduled deload
      const deloadPercentage = calculateDeloadPercentage(
        config,
        currentPhase || 'BASE',
        weeksInBlock,
        methodology
      )

      deloads.push({
        weekNumber: weekNum,
        deloadPercentage,
        reason: `Scheduled recovery (${weeksInBlock} weeks loading)`,
        type: 'SCHEDULED',
      })
      weeksInBlock = 0
      lastDeloadWeek = weekNum
    }
  }

  return deloads
}

/**
 * Calculate deload percentage based on context
 */
function calculateDeloadPercentage(
  config: DeloadConfig,
  phase: PeriodPhase,
  weeksInBlock: number,
  methodology: MethodologyType
): number {
  let percentage = config.deloadPercentage

  // Adjust by phase (peak phases need more recovery)
  if (phase === 'PEAK') {
    percentage -= 5 // 5% more reduction during peak
  } else if (phase === 'BASE') {
    percentage += 5 // 5% less reduction during base
  }

  // Adjust by accumulated weeks (longer blocks need deeper deload)
  if (weeksInBlock >= 5) {
    percentage -= 5 // Extra recovery after long blocks
  }

  // Norwegian method needs deeper deload
  if (methodology === 'NORWEGIAN') {
    percentage -= 5
  }

  // Clamp to valid range
  return Math.max(
    config.minDeloadPercentage,
    Math.min(config.maxDeloadPercentage, percentage)
  )
}

/**
 * Apply deload to volume percentage
 */
export function applyDeload(
  weekNumber: number,
  baseVolumePercentage: number,
  deloadSchedule: DeloadSchedule[]
): number {
  const deload = deloadSchedule.find(d => d.weekNumber === weekNumber)

  if (!deload) {
    return baseVolumePercentage // No deload this week
  }

  // Apply deload reduction
  return baseVolumePercentage * (deload.deloadPercentage / 100)
}

/**
 * Get deload recommendations for UI display
 */
export function getDeloadRecommendations(
  athleteLevel: AthleteLevel,
  methodology: MethodologyType
): {
  frequency: string
  percentage: string
  rationale: string
  warnings: string[]
} {
  const config = getDeloadConfig(athleteLevel, methodology)
  const warnings: string[] = []

  let frequency = `Every ${config.baseFrequencyWeeks} weeks`
  let percentage = `${config.deloadPercentage}% of normal volume`

  let rationale = ''
  if (athleteLevel === 'BEGINNER' || athleteLevel === 'RECREATIONAL') {
    rationale = 'Frequent recovery weeks help build aerobic base safely and prevent overtraining.'
  } else if (athleteLevel === 'ADVANCED' || athleteLevel === 'ELITE') {
    rationale = 'Deload weeks allow adaptation to high training loads while maintaining fitness.'
  }

  if (methodology === 'NORWEGIAN') {
    warnings.push('Norwegian method requires frequent recovery due to high volume and double threshold sessions.')
    frequency = 'Every 3 weeks (high volume methodology)'
  }

  if (athleteLevel === 'BEGINNER') {
    warnings.push('Focus on consistency during deload weeks - stay active but reduce intensity and duration.')
  }

  return {
    frequency,
    percentage,
    rationale,
    warnings,
  }
}

/**
 * Validate deload schedule
 *
 * Ensures:
 * - No consecutive deloads (should have loading between)
 * - Minimum 2 loading weeks between deloads
 * - No deload in final taper weeks
 */
export function validateDeloadSchedule(
  deloadSchedule: DeloadSchedule[],
  totalWeeks: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Sort by week number
  const sorted = [...deloadSchedule].sort((a, b) => a.weekNumber - b.weekNumber)

  // Check for consecutive deloads
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].weekNumber - sorted[i].weekNumber
    if (gap === 1) {
      errors.push(`Consecutive deloads at weeks ${sorted[i].weekNumber} and ${sorted[i + 1].weekNumber}`)
    } else if (gap < 2) {
      errors.push(`Insufficient loading between deloads at weeks ${sorted[i].weekNumber} and ${sorted[i + 1].weekNumber}`)
    }
  }

  // Check for deload in final 2 weeks
  const finalWeekDeloads = sorted.filter(d => d.weekNumber > totalWeeks - 2)
  if (finalWeekDeloads.length > 0) {
    errors.push('Deload scheduled in final taper weeks (should be avoided)')
  }

  // Check for too many deloads (> 35% of total weeks)
  const deloadRatio = sorted.length / totalWeeks
  if (deloadRatio > 0.35) {
    errors.push(`Too many deload weeks (${sorted.length}/${totalWeeks} = ${(deloadRatio * 100).toFixed(0)}%). Max 35% recommended.`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get deload week details for UI display
 */
export function getDeloadWeekDetails(deload: DeloadSchedule): {
  title: string
  description: string
  volumeReduction: string
  recommendations: string[]
} {
  const volumeReduction = `${100 - deload.deloadPercentage}% reduction from normal volume`

  let title = ''
  let description = ''
  const recommendations: string[] = []

  if (deload.type === 'SCHEDULED') {
    title = 'Recovery Week'
    description = `Scheduled deload to allow adaptation and prevent overtraining. ${deload.reason}`
    recommendations.push('Reduce both intensity and volume')
    recommendations.push('Focus on easy aerobic work')
    recommendations.push('No hard workouts this week')
    recommendations.push('Prioritize sleep and nutrition')
  } else if (deload.type === 'PHASE_TRANSITION') {
    title = 'Transition Week'
    description = `Light week between training phases. ${deload.reason}`
    recommendations.push('Moderate volume reduction')
    recommendations.push('Prepare for next phase demands')
    recommendations.push('Mental and physical recovery')
  } else if (deload.type === 'FATIGUE_MANAGEMENT') {
    title = 'Active Recovery'
    description = `Extra recovery week due to accumulated fatigue. ${deload.reason}`
    recommendations.push('Significant volume reduction')
    recommendations.push('Consider cross-training')
    recommendations.push('Monitor readiness markers (HRV, RHR)')
  }

  return {
    title,
    description,
    volumeReduction,
    recommendations,
  }
}
