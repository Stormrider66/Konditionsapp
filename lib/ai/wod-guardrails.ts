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

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// ============================================
// MAIN GUARDRAILS CHECK
// ============================================

/**
 * Run all guardrail checks and return combined result
 */
export async function checkWODGuardrails(
  context: WODAthleteContext,
  subscriptionTier: string,
  locale: AppLocale = 'en'
): Promise<WODGuardrailResult> {
  // Run all checks
  const acwrCheck = checkACWR(context, locale)
  const injuryCheck = checkInjuries(context, locale)
  const fatigueCheck = checkFatigue(context, locale)
  const usageLimitCheck = await checkUsageLimit(context.clientId, subscriptionTier, locale)
  const restrictionsCheck = checkRestrictions(context, locale)

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
    blockedReason = t(locale, 'Your training load is critically high. Rest is strongly recommended.', 'Din träningsbelastning är kritiskt hög. Vila rekommenderas starkt.')
    guardrailsApplied.push({
      type: 'ACWR_CRITICAL',
      description: t(locale, 'ACWR in critical zone (>2.0)', 'ACWR i kritisk zon (>2.0)'),
      modification: t(locale, 'Generation blocked - rest is recommended', 'Generering blockerad - vila rekommenderas'),
    })
  }

  // Add non-blocking guardrails
  if (acwrCheck.zone === 'DANGER') {
    guardrailsApplied.push({
      type: 'ACWR_WARNING',
      description: t(locale, 'ACWR in danger zone (1.5-2.0)', 'ACWR i farlig zon (1.5-2.0)'),
      modification: t(locale, 'Intensity lowered to recovery', 'Intensitet sänkt till recovery'),
    })
  } else if (acwrCheck.zone === 'CAUTION') {
    guardrailsApplied.push({
      type: 'ACWR_WARNING',
      description: t(locale, 'ACWR in caution zone (1.3-1.5)', 'ACWR i varningszon (1.3-1.5)'),
      modification: t(locale, 'Intensity lowered to easy', 'Intensitet sänkt till easy'),
    })
  }

  if (!injuryCheck.passed && injuryCheck.excludedAreas.length > 0) {
    guardrailsApplied.push({
      type: 'INJURY_EXCLUDED',
      description: t(locale, `Avoiding ${injuryCheck.excludedAreas.join(', ')}`, `Undviker ${injuryCheck.excludedAreas.join(', ')}`),
      modification: injuryCheck.reason,
    })
  }

  if (!fatigueCheck.passed) {
    guardrailsApplied.push({
      type: 'FATIGUE_REDUCED',
      description: t(locale, 'High fatigue detected', 'Hög trötthet upptäckt'),
      modification: fatigueCheck.reason,
    })
  }

  // Add restriction guardrails
  if (!restrictionsCheck.passed && restrictionsCheck.restrictedAreas.length > 0) {
    guardrailsApplied.push({
      type: 'INJURY_EXCLUDED',
      description: t(locale, `Training restrictions active: ${restrictionsCheck.restrictedAreas.join(', ')}`, `Träningsrestriktioner aktiva: ${restrictionsCheck.restrictedAreas.join(', ')}`),
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
      description: t(locale, 'Recovery session recommended', 'Återhämtningspass rekommenderas'),
      modification: t(locale, 'Intensity set to recovery based on combined factors', 'Intensitet satt till recovery baserat på samlade faktorer'),
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
function checkACWR(context: WODAthleteContext, locale: AppLocale): ACWRCheckResult {
  const { acwrZone } = context

  switch (acwrZone) {
    case 'CRITICAL':
      return {
        zone: 'CRITICAL',
        reason: t(locale, 'Training load is critically high (ACWR > 2.0)', 'Träningsbelastningen är kritiskt hög (ACWR > 2.0)'),
        modification: t(locale, 'Rest is recommended', 'Vila rekommenderas'),
      }

    case 'DANGER':
      return {
        zone: 'DANGER',
        reason: t(locale, 'Training load is too high (ACWR 1.5-2.0)', 'Träningsbelastningen är för hög (ACWR 1.5-2.0)'),
        modification: t(locale, 'Only recovery sessions are allowed', 'Endast recovery-pass tillåtna'),
      }

    case 'CAUTION':
      return {
        zone: 'CAUTION',
        reason: t(locale, 'Training load is high (ACWR 1.3-1.5)', 'Träningsbelastningen är hög (ACWR 1.3-1.5)'),
        modification: t(locale, 'Intensity limited to easy', 'Intensitet begränsad till easy'),
      }

    case 'OPTIMAL':
      return { zone: 'OPTIMAL' }

    case 'DETRAINING':
      return {
        zone: 'DETRAINING',
        reason: t(locale, 'Low training load - a good time to build', 'Låg träningsbelastning - bra tid att öka'),
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
function checkInjuries(context: WODAthleteContext, locale: AppLocale): InjuryCheckResult {
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
      modifications.push(t(locale, `Excluding ${bodyArea} (pain ${injury.painLevel}/10)`, `Exkluderar ${bodyArea} (smärta ${injury.painLevel}/10)`))
    } else if (injury.painLevel >= 3) {
      // Moderate pain (3-5): Reduce volume, avoid impact
      if (!excludedAreas.includes(bodyArea)) {
        excludedAreas.push(bodyArea)
      }
      modifications.push(t(locale, `Reducing ${bodyArea} exercises (pain ${injury.painLevel}/10)`, `Reducerar ${bodyArea}-övningar (smärta ${injury.painLevel}/10)`))
    }
    // Low pain (1-2): Can proceed with caution
  }

  return {
    passed: !hasHighPain,
    reason: hasHighPain
      ? t(locale, 'Active injury with high pain - some areas are excluded', 'Aktiv skada med hög smärta - vissa områden exkluderas')
      : excludedAreas.length > 0
        ? t(locale, 'Active injury - volume reduced for affected areas', 'Aktiv skada - volym reducerad för drabbade områden')
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
function checkFatigue(context: WODAthleteContext, locale: AppLocale): FatigueCheckResult {
  const { fatigueLevel, sorenessLevel, sleepQuality, recentWorkouts } = context

  // Check for high fatigue (1=bad, 10=good in some systems, but often inverted)
  // Assuming fatigueLevel: 1=fresh, 10=exhausted
  if (fatigueLevel !== null && fatigueLevel >= 7) {
    return {
      passed: false,
      reason: t(locale, 'High fatigue level reported', 'Hög trötthetsnivå rapporterad'),
      modification: t(locale, 'Intensity lowered, focus on movement', 'Intensitet sänkt, fokus på rörelse'),
    }
  }

  // Check for high soreness
  if (sorenessLevel !== null && sorenessLevel >= 7) {
    return {
      passed: false,
      reason: t(locale, 'High muscle soreness reported', 'Hög muskeltrötthet rapporterad'),
      modification: t(locale, 'Avoiding heavy strength exercises', 'Undviker tunga styrkeövningar'),
    }
  }

  // Check for poor sleep
  if (sleepQuality !== null && sleepQuality <= 3) {
    return {
      passed: false,
      reason: t(locale, 'Poor sleep quality reported', 'Dålig sömnkvalitet rapporterad'),
      modification: t(locale, 'Lighter session recommended', 'Lättare pass rekommenderas'),
    }
  }

  // Check for consecutive hard sessions
  const hardSessionsLast4Days = recentWorkouts.filter(w =>
    ['THRESHOLD', 'INTERVAL', 'MAX'].includes(w.intensity)
  ).length

  if (hardSessionsLast4Days >= 3) {
    return {
      passed: false,
      reason: t(locale, '3+ hard sessions in the last 4 days', '3+ tunga pass de senaste 4 dagarna'),
      modification: t(locale, 'Easy day recommended', 'Easy day rekommenderas'),
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
  subscriptionTier: string,
  locale: AppLocale
): Promise<UsageLimitCheckResult> {
  const result = await canGenerateWOD(clientId, subscriptionTier, locale)

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
function checkRestrictions(context: WODAthleteContext, locale: AppLocale): RestrictionsCheckResult {
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
        modifications.push(t(locale, 'No running - replace with cycling/swimming', 'Ingen löpning - ersätt med cykling/simning'))
        break
      case 'NO_JUMPING':
        modifications.push(t(locale, 'No jumping or plyometric exercises', 'Inga hopp eller plyometriska övningar'))
        break
      case 'NO_IMPACT':
        modifications.push(t(locale, 'No impact load', 'Ingen stötbelastning'))
        break
      case 'NO_UPPER_BODY':
        modifications.push(t(locale, 'No upper-body exercises', 'Inga överkroppsövningar'))
        break
      case 'NO_LOWER_BODY':
        modifications.push(t(locale, 'No lower-body exercises', 'Inga underkroppsövningar'))
        break
      case 'REDUCED_VOLUME':
        modifications.push(t(locale, `Volume reduction: ${restrictions.volumeReduction}%`, `Volymreduktion: ${restrictions.volumeReduction}%`))
        break
      case 'REDUCED_INTENSITY':
        modifications.push(t(locale, `Max intensity zone: ${restrictions.maxIntensityZone}/5`, `Max intensitetszon: ${restrictions.maxIntensityZone}/5`))
        break
    }
  }

  return {
    passed: restrictedAreas.length === 0,
    reason: restrictedAreas.length > 0
      ? t(locale, `Active restrictions for: ${restrictedAreas.join(', ')}`, `Aktiva restriktioner för: ${restrictedAreas.join(', ')}`)
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
  guardrails: WODGuardrailResult,
  locale: AppLocale = 'en'
): string {
  const constraints: string[] = []

  // Add intensity constraint
  constraints.push(t(
    locale,
    `INTENSITY: ${getIntensityDescription(guardrails.adjustedIntensity, locale)}`,
    `INTENSITET: ${getIntensityDescription(guardrails.adjustedIntensity, locale)}`
  ))

  // Add excluded areas
  if (guardrails.excludedAreas.length > 0) {
    constraints.push(t(
      locale,
      `AVOID COMPLETELY: Exercises loading ${guardrails.excludedAreas.join(', ')}`,
      `UNDVIK HELT: Övningar som belastar ${guardrails.excludedAreas.join(', ')}`
    ))
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

function getIntensityDescription(intensity: AdjustedIntensity, locale: AppLocale): string {
  switch (intensity) {
    case 'recovery':
      return t(locale, 'Only light movement and mobility. No strain. Focus on recovery.', 'Endast lätt rörelse och mobilitet. Ingen ansträngning. Fokus på återhämtning.')
    case 'easy':
      return t(locale, 'Easy intensity. The athlete can talk comfortably. Max 60% HRmax.', 'Lätt intensitet. Kan prata obehindrat. Max 60% av max HR.')
    case 'moderate':
      return t(locale, 'Moderate intensity. The athlete can talk in short sentences. 60-75% HRmax.', 'Måttlig intensitet. Kan prata i korta meningar. 60-75% av max HR.')
    case 'threshold':
      return t(locale, 'Higher intensity allowed if appropriate. Intervals may be included. 75-90% HRmax.', 'Hög intensitet tillåten vid behov. Kan inkludera intervaller. 75-90% av max HR.')
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
