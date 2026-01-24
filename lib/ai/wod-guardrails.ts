/**
 * WOD Guardrails
 *
 * Safety checks for Workout of the Day generation.
 * Prevents overtraining, respects injuries, and enforces usage limits.
 */

import type {
  WODAthleteContext,
  WODGuardrailResult,
  AdjustedIntensity,
  WODGuardrailApplied,
} from '@/types/wod'
import { canGenerateWOD } from './wod-context-builder'

// ============================================
// MAIN GUARDRAILS CHECK
// ============================================

/**
 * Run all guardrail checks and return combined result
 */
export async function checkWODGuardrails(
  context: WODAthleteContext,
  subscriptionTier: string
): Promise<WODGuardrailResult> {
  // Run all checks
  const acwrCheck = checkACWR(context)
  const injuryCheck = checkInjuries(context)
  const fatigueCheck = checkFatigue(context)
  const usageLimitCheck = await checkUsageLimit(context.clientId, subscriptionTier)
  const restrictionsCheck = checkRestrictions(context)

  // Collect all applied guardrails
  const guardrailsApplied: WODGuardrailApplied[] = []

  // Determine if we can generate
  let canGenerate = true
  let blockedReason: string | undefined

  // Check for blocking conditions
  if (!usageLimitCheck.passed) {
    canGenerate = false
    blockedReason = usageLimitCheck.reason
  }

  if (acwrCheck.zone === 'CRITICAL') {
    // Critical ACWR blocks generation entirely
    canGenerate = false
    blockedReason = 'Din träningsbelastning är kritiskt hög. Vila rekommenderas starkt.'
    guardrailsApplied.push({
      type: 'ACWR_CRITICAL',
      description: 'ACWR i kritisk zon (>2.0)',
      modification: 'Generering blockerad - vila rekommenderas',
    })
  }

  // Add non-blocking guardrails
  if (acwrCheck.zone === 'DANGER') {
    guardrailsApplied.push({
      type: 'ACWR_WARNING',
      description: 'ACWR i farlig zon (1.5-2.0)',
      modification: 'Intensitet sänkt till recovery',
    })
  } else if (acwrCheck.zone === 'CAUTION') {
    guardrailsApplied.push({
      type: 'ACWR_WARNING',
      description: 'ACWR i varningszon (1.3-1.5)',
      modification: 'Intensitet sänkt till easy',
    })
  }

  if (!injuryCheck.passed && injuryCheck.excludedAreas.length > 0) {
    guardrailsApplied.push({
      type: 'INJURY_EXCLUDED',
      description: `Undviker ${injuryCheck.excludedAreas.join(', ')}`,
      modification: injuryCheck.reason,
    })
  }

  if (!fatigueCheck.passed) {
    guardrailsApplied.push({
      type: 'FATIGUE_REDUCED',
      description: 'Hög trötthet upptäckt',
      modification: fatigueCheck.reason,
    })
  }

  // Add restriction guardrails
  if (!restrictionsCheck.passed && restrictionsCheck.restrictedAreas.length > 0) {
    guardrailsApplied.push({
      type: 'INJURY_EXCLUDED',
      description: `Träningsrestriktioner aktiva: ${restrictionsCheck.restrictedAreas.join(', ')}`,
      modification: restrictionsCheck.reason,
    })
  }

  // Calculate adjusted intensity based on all factors
  const adjustedIntensity = calculateAdjustedIntensity(
    context.readinessScore,
    acwrCheck.zone,
    fatigueCheck.passed,
    injuryCheck.passed
  )

  // If intensity forced to recovery, add guardrail
  if (adjustedIntensity === 'recovery' && canGenerate) {
    guardrailsApplied.push({
      type: 'RECOVERY_FORCED',
      description: 'Återhämtningspass rekommenderas',
      modification: 'Intensitet satt till recovery baserat på samlade faktorer',
    })
  }

  // Combine excluded areas from injuries and restrictions
  const allExcludedAreas = [
    ...new Set([
      ...injuryCheck.excludedAreas,
      ...restrictionsCheck.restrictedAreas,
    ]),
  ]

  return {
    canGenerate,
    checks: {
      acwr: {
        passed: acwrCheck.zone !== 'CRITICAL' && acwrCheck.zone !== 'DANGER',
        reason: acwrCheck.reason,
        modification: acwrCheck.modification,
      },
      injury: {
        passed: injuryCheck.passed,
        reason: injuryCheck.reason,
        modification: injuryCheck.modification,
      },
      fatigue: {
        passed: fatigueCheck.passed,
        reason: fatigueCheck.reason,
        modification: fatigueCheck.modification,
      },
      usageLimit: {
        passed: usageLimitCheck.passed,
        reason: usageLimitCheck.reason,
      },
      restrictions: {
        passed: restrictionsCheck.passed,
        reason: restrictionsCheck.reason,
        modification: restrictionsCheck.modification,
      },
    },
    guardrailsApplied,
    adjustedIntensity,
    excludedAreas: allExcludedAreas,
    restrictionConstraints: restrictionsCheck.promptConstraints,
    blockedReason,
  }
}

// ============================================
// INDIVIDUAL CHECKS
// ============================================

interface ACWRCheckResult {
  zone: WODAthleteContext['acwrZone']
  reason?: string
  modification?: string
}

/**
 * Check ACWR (Acute:Chronic Workload Ratio)
 */
function checkACWR(context: WODAthleteContext): ACWRCheckResult {
  const { acwrZone } = context

  switch (acwrZone) {
    case 'CRITICAL':
      return {
        zone: 'CRITICAL',
        reason: 'Träningsbelastningen är kritiskt hög (ACWR > 2.0)',
        modification: 'Vila rekommenderas',
      }

    case 'DANGER':
      return {
        zone: 'DANGER',
        reason: 'Träningsbelastningen är för hög (ACWR 1.5-2.0)',
        modification: 'Endast recovery-pass tillåtna',
      }

    case 'CAUTION':
      return {
        zone: 'CAUTION',
        reason: 'Träningsbelastningen är hög (ACWR 1.3-1.5)',
        modification: 'Intensitet begränsad till easy',
      }

    case 'OPTIMAL':
      return { zone: 'OPTIMAL' }

    case 'DETRAINING':
      return {
        zone: 'DETRAINING',
        reason: 'Låg träningsbelastning - bra tid att öka',
      }

    default:
      return { zone: 'OPTIMAL' }
  }
}

interface InjuryCheckResult {
  passed: boolean
  reason?: string
  modification?: string
  excludedAreas: string[]
}

/**
 * Check for active injuries and determine excluded body areas
 * Uses Delaware pain rules
 */
function checkInjuries(context: WODAthleteContext): InjuryCheckResult {
  const { activeInjuries } = context

  if (activeInjuries.length === 0) {
    return { passed: true, excludedAreas: [] }
  }

  const excludedAreas: string[] = []
  const modifications: string[] = []
  let hasHighPain = false

  for (const injury of activeInjuries) {
    // Map pain location to body area for exclusion
    const bodyArea = mapInjuryToBodyArea(injury.affectedArea)

    if (injury.painLevel >= 6) {
      // High pain (6-10): Exclude area entirely
      hasHighPain = true
      if (!excludedAreas.includes(bodyArea)) {
        excludedAreas.push(bodyArea)
      }
      modifications.push(`Exkluderar ${bodyArea} (smärta ${injury.painLevel}/10)`)
    } else if (injury.painLevel >= 3) {
      // Moderate pain (3-5): Reduce volume, avoid impact
      if (!excludedAreas.includes(bodyArea)) {
        excludedAreas.push(bodyArea)
      }
      modifications.push(`Reducerar ${bodyArea}-övningar (smärta ${injury.painLevel}/10)`)
    }
    // Low pain (1-2): Can proceed with caution
  }

  return {
    passed: !hasHighPain,
    reason: hasHighPain
      ? 'Aktiv skada med hög smärta - vissa områden exkluderas'
      : excludedAreas.length > 0
        ? 'Aktiv skada - volym reducerad för drabbade områden'
        : undefined,
    modification: modifications.join(', '),
    excludedAreas,
  }
}

/**
 * Map injury location to body area for exercise exclusion
 */
function mapInjuryToBodyArea(painLocation: string): string {
  const location = painLocation.toUpperCase()

  // Lower body
  if (['KNEE', 'ANKLE', 'FOOT', 'CALF', 'SHIN', 'ACHILLES'].includes(location)) {
    return 'lower_legs'
  }
  if (['HAMSTRING', 'QUAD', 'HIP', 'GLUTE', 'GROIN', 'THIGH'].includes(location)) {
    return 'upper_legs'
  }

  // Upper body
  if (['SHOULDER', 'ARM', 'ELBOW', 'WRIST', 'HAND'].includes(location)) {
    return 'upper_body'
  }

  // Core
  if (['BACK', 'LOWER_BACK', 'SPINE', 'CORE', 'ABDOMINAL'].includes(location)) {
    return 'core'
  }

  // Cardio restriction
  if (['CHEST', 'HEART', 'BREATHING'].includes(location)) {
    return 'cardio'
  }

  return 'general'
}

interface FatigueCheckResult {
  passed: boolean
  reason?: string
  modification?: string
}

/**
 * Check fatigue and soreness levels
 */
function checkFatigue(context: WODAthleteContext): FatigueCheckResult {
  const { fatigueLevel, sorenessLevel, sleepQuality, recentWorkouts } = context

  // Check for high fatigue (1=bad, 10=good in some systems, but often inverted)
  // Assuming fatigueLevel: 1=fresh, 10=exhausted
  if (fatigueLevel !== null && fatigueLevel >= 7) {
    return {
      passed: false,
      reason: 'Hög trötthetsnivå rapporterad',
      modification: 'Intensitet sänkt, fokus på rörelse',
    }
  }

  // Check for high soreness
  if (sorenessLevel !== null && sorenessLevel >= 7) {
    return {
      passed: false,
      reason: 'Hög muskeltrötthet rapporterad',
      modification: 'Undviker tunga styrkeövningar',
    }
  }

  // Check for poor sleep
  if (sleepQuality !== null && sleepQuality <= 3) {
    return {
      passed: false,
      reason: 'Dålig sömnkvalitet rapporterad',
      modification: 'Lättare pass rekommenderas',
    }
  }

  // Check for consecutive hard sessions
  const hardSessionsLast4Days = recentWorkouts.filter(w =>
    ['THRESHOLD', 'INTERVAL', 'MAX'].includes(w.intensity)
  ).length

  if (hardSessionsLast4Days >= 3) {
    return {
      passed: false,
      reason: '3+ tunga pass de senaste 4 dagarna',
      modification: 'Easy day rekommenderas',
    }
  }

  return { passed: true }
}

interface UsageLimitCheckResult {
  passed: boolean
  reason?: string
  remaining: number
}

/**
 * Check usage limit for subscription tier
 */
async function checkUsageLimit(
  clientId: string,
  subscriptionTier: string
): Promise<UsageLimitCheckResult> {
  const result = await canGenerateWOD(clientId, subscriptionTier)

  return {
    passed: result.allowed,
    reason: result.reason,
    remaining: result.remaining,
  }
}

interface RestrictionsCheckResult {
  passed: boolean
  reason?: string
  modification?: string
  restrictedAreas: string[]
  promptConstraints?: string
}

/**
 * Check training restrictions from physio system
 */
function checkRestrictions(context: WODAthleteContext): RestrictionsCheckResult {
  const restrictions = context.trainingRestrictions

  if (!restrictions || !restrictions.hasRestrictions) {
    return {
      passed: true,
      restrictedAreas: [],
    }
  }

  const restrictedAreas = restrictions.restrictedAreas
  const modifications: string[] = []

  // Add restriction type specific modifications
  for (const type of restrictions.restrictionTypes) {
    switch (type) {
      case 'NO_RUNNING':
        modifications.push('Ingen löpning - ersätt med cykling/simning')
        break
      case 'NO_JUMPING':
        modifications.push('Inga hopp eller plyometriska övningar')
        break
      case 'NO_IMPACT':
        modifications.push('Ingen stötbelastning')
        break
      case 'NO_UPPER_BODY':
        modifications.push('Inga överkroppsövningar')
        break
      case 'NO_LOWER_BODY':
        modifications.push('Inga underkroppsövningar')
        break
      case 'REDUCED_VOLUME':
        modifications.push(`Volymreduktion: ${restrictions.volumeReduction}%`)
        break
      case 'REDUCED_INTENSITY':
        modifications.push(`Max intensitetszon: ${restrictions.maxIntensityZone}/5`)
        break
    }
  }

  return {
    passed: restrictedAreas.length === 0,
    reason: restrictedAreas.length > 0
      ? `Aktiva restriktioner för: ${restrictedAreas.join(', ')}`
      : undefined,
    modification: modifications.join(', '),
    restrictedAreas,
    promptConstraints: restrictions.promptConstraints,
  }
}

// ============================================
// INTENSITY CALCULATION
// ============================================

/**
 * Calculate adjusted intensity based on all factors
 */
function calculateAdjustedIntensity(
  readinessScore: number | null,
  acwrZone: WODAthleteContext['acwrZone'],
  fatiguePassed: boolean,
  injuryPassed: boolean
): AdjustedIntensity {
  // ACWR overrides all
  if (acwrZone === 'CRITICAL' || acwrZone === 'DANGER') {
    return 'recovery'
  }

  if (acwrZone === 'CAUTION') {
    return 'easy'
  }

  // If injury or fatigue issues, cap at moderate
  if (!fatiguePassed || !injuryPassed) {
    // With readiness
    if (readinessScore !== null) {
      if (readinessScore >= 6) return 'easy'
      return 'recovery'
    }
    return 'easy'
  }

  // Readiness-based intensity
  if (readinessScore === null) {
    return 'moderate' // Default when no data
  }

  if (readinessScore >= 8) return 'threshold'
  if (readinessScore >= 6) return 'moderate'
  if (readinessScore >= 4) return 'easy'
  return 'recovery'
}

// ============================================
// PROMPT MODIFIERS (for AI generation)
// ============================================

/**
 * Generate prompt constraints based on guardrails
 */
export function generateGuardrailConstraints(
  guardrails: WODGuardrailResult
): string {
  const constraints: string[] = []

  // Add intensity constraint
  constraints.push(`INTENSITET: ${getIntensityDescription(guardrails.adjustedIntensity)}`)

  // Add excluded areas
  if (guardrails.excludedAreas.length > 0) {
    constraints.push(`UNDVIK HELT: Övningar som belastar ${guardrails.excludedAreas.join(', ')}`)
  }

  // Add restriction constraints from physio system
  if (guardrails.restrictionConstraints) {
    constraints.push(guardrails.restrictionConstraints)
  }

  // Add specific warnings
  for (const check of Object.values(guardrails.checks)) {
    if (!check.passed && 'modification' in check && check.modification) {
      constraints.push(check.modification)
    }
  }

  return constraints.join('\n')
}

function getIntensityDescription(intensity: AdjustedIntensity): string {
  switch (intensity) {
    case 'recovery':
      return 'Endast lätt rörelse och mobilitet. Ingen ansträngning. Fokus på återhämtning.'
    case 'easy':
      return 'Lätt intensitet. Kan prata obehindrat. Max 60% av max HR.'
    case 'moderate':
      return 'Måttlig intensitet. Kan prata i korta meningar. 60-75% av max HR.'
    case 'threshold':
      return 'Hög intensitet tillåten vid behov. Kan inkludera intervaller. 75-90% av max HR.'
  }
}

// ============================================
// BODY AREA MAPPING FOR EXERCISE FILTERING
// ============================================

/**
 * Get exercise categories to exclude based on body areas
 */
export function getExcludedExerciseCategories(excludedAreas: string[]): string[] {
  const excluded: string[] = []

  for (const area of excludedAreas) {
    switch (area) {
      case 'lower_legs':
        excluded.push('FOOT_ANKLE', 'PLYOMETRIC', 'RUNNING', 'JUMPING')
        break
      case 'upper_legs':
        excluded.push('KNEE_DOMINANCE', 'POSTERIOR_CHAIN', 'UNILATERAL', 'SQUATTING', 'LUNGING')
        break
      case 'upper_body':
        excluded.push('UPPER_BODY', 'PUSHING', 'PULLING', 'PRESSING')
        break
      case 'core':
        excluded.push('CORE', 'ANTI_ROTATION_CORE', 'SPINAL_FLEXION')
        break
      case 'cardio':
        excluded.push('HIGH_INTENSITY_CARDIO', 'INTERVAL', 'THRESHOLD')
        break
    }
  }

  return [...new Set(excluded)] // Deduplicate
}
