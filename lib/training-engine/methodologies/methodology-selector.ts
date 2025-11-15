/**
 * Methodology Selector
 *
 * Automatic selection of optimal training methodology based on:
 * - Athlete level (Beginner → Elite)
 * - Training goals (race distance, general fitness)
 * - Available testing (lactate test, HR monitor)
 * - Training availability (sessions per week, time commitment)
 * - Personal preferences
 *
 * Decision tree logic:
 * 1. Check Norwegian prerequisites (if not met, exclude Norwegian)
 * 2. Check Canova prerequisites (if no race goal, exclude Canova)
 * 3. Default to Polarized (safest, most proven)
 * 4. Offer alternatives based on athlete profile
 *
 * @module methodologies/methodology-selector
 */

import type { MethodologyType, MethodologySelection, AthleteLevel, GoalDistance } from './types'
import { categorizeAthlete, type AthleteCategorization } from './athlete-categorization'
import { validateNorwegianPrerequisites } from './norwegian'

export interface MethodologySelectionInputs {
  // Athlete profile
  athleteLevel: AthleteLevel
  vo2max: number
  lt2PercentOfVO2max: number

  // Testing availability
  hasLactateTesting: boolean
  hasHeartRateMonitor: boolean

  // Training constraints
  weeklySessionCount: number
  weeklyTrainingMinutes: number
  canDoDoubleDays: boolean

  // Goals
  primaryGoal: 'RACE_PERFORMANCE' | 'GENERAL_FITNESS' | 'WEIGHT_LOSS' | 'HEALTH'
  raceDistance?: GoalDistance
  hasSpecificRaceGoal: boolean
  raceTimeGoal?: string // e.g., "sub-3:00 marathon"

  // Experience
  trainingExperienceYears: number
  previousMethodology?: MethodologyType

  // Preferences
  prefersStructure?: boolean // Some athletes prefer clear 80/20, others like balance
  enjoysTempoRuns?: boolean
  timeConstrained?: boolean // Busy schedule
}

/**
 * Select optimal training methodology
 *
 * @param inputs - All athlete data and preferences
 * @returns Methodology selection with rationale
 */
export function selectMethodology(inputs: MethodologySelectionInputs): MethodologySelection {
  const prerequisites = {
    met: [] as string[],
    missing: [] as string[],
  }
  const warnings: string[] = []
  const alternatives: MethodologyType[] = []

  // ===== CHECK 1: Norwegian Prerequisites =====
  const norwegianEligible = checkNorwegianEligibility(inputs, prerequisites, warnings)

  // ===== CHECK 2: Canova Prerequisites =====
  const canovaEligible = checkCanovaEligibility(inputs, prerequisites, warnings)

  // ===== CHECK 3: Athlete Level Constraints =====
  if (inputs.athleteLevel === 'BEGINNER') {
    // Beginners should use Polarized or Pyramidal only
    prerequisites.missing.push('BEGINNER level - Norwegian and Canova not recommended')
    warnings.push('Focus on building aerobic base with Polarized or Pyramidal training first')
  }

  // ===== DECISION TREE =====
  let recommended: MethodologyType
  let rationale: string

  // ELITE athletes with Norwegian prerequisites
  if (norwegianEligible && inputs.athleteLevel === 'ELITE') {
    recommended = 'NORWEGIAN'
    rationale = 'Elite athlete with excellent aerobic development and lactate testing access. Norwegian method maximizes potential with high LIT volume and precise threshold work.'
    alternatives.push('POLARIZED', 'CANOVA')
  }
  // ADVANCED athletes with race goal and Norwegian prerequisites
  else if (norwegianEligible && inputs.athleteLevel === 'ADVANCED' && inputs.hasSpecificRaceGoal) {
    recommended = 'NORWEGIAN'
    rationale = 'Advanced athlete with race goal, lactate testing, and strong aerobic base. Norwegian method provides systematic progression with threshold focus.'
    alternatives.push('CANOVA', 'POLARIZED')
  }
  // Race-specific goal with Canova eligibility
  else if (canovaEligible && inputs.hasSpecificRaceGoal && inputs.raceTimeGoal) {
    recommended = 'CANOVA'
    rationale = `Specific race goal (${inputs.raceTimeGoal}${inputs.raceDistance ? ' ' + inputs.raceDistance : ''}) makes Canova race-pace system ideal. Progressive volume at goal pace builds confidence and specificity.`
    alternatives.push('POLARIZED', 'PYRAMIDAL')
  }
  // Time-constrained athletes prefer tempo runs (efficient)
  else if (inputs.timeConstrained && inputs.enjoysTempoRuns && inputs.athleteLevel !== 'BEGINNER') {
    recommended = 'PYRAMIDAL'
    rationale = 'Time-constrained schedule benefits from tempo runs (time-efficient quality sessions). Pyramidal distribution provides balanced training with manageable time commitment.'
    alternatives.push('POLARIZED')
  }
  // Athletes who enjoy/prefer tempo work
  else if (inputs.enjoysTempoRuns && inputs.athleteLevel === 'RECREATIONAL') {
    recommended = 'PYRAMIDAL'
    rationale = 'Recreational athlete who enjoys tempo running. Pyramidal distribution feels natural and includes regular moderate-intensity work.'
    alternatives.push('POLARIZED')
  }
  // DEFAULT: Polarized (safest, most proven, works for all levels)
  else {
    recommended = 'POLARIZED'
    rationale = 'Polarized training (80/20) is the safest, most proven methodology. Works for all athlete levels, minimizes injury risk, and optimizes training adaptation.'

    // Add alternatives based on level
    if (inputs.athleteLevel === 'BEGINNER') {
      alternatives.push('PYRAMIDAL')
    } else if (inputs.athleteLevel === 'RECREATIONAL') {
      alternatives.push('PYRAMIDAL')
    } else {
      alternatives.push('PYRAMIDAL', 'CANOVA')
    }
  }

  // Add Norwegian as alternative if prerequisites met but not selected
  if (norwegianEligible && recommended !== 'NORWEGIAN') {
    alternatives.push('NORWEGIAN')
  }

  // Remove duplicates from alternatives
  const uniqueAlternatives = Array.from(new Set(alternatives)).filter(m => m !== recommended)

  return {
    recommended,
    alternatives: uniqueAlternatives,
    rationale,
    prerequisites,
    warnings,
  }
}

/**
 * Check if athlete meets Norwegian methodology prerequisites
 */
function checkNorwegianEligibility(
  inputs: MethodologySelectionInputs,
  prerequisites: { met: string[]; missing: string[] },
  warnings: string[]
): boolean {
  const validation = validateNorwegianPrerequisites({
    level: inputs.athleteLevel,
    lt2PercentOfVO2max: inputs.lt2PercentOfVO2max,
    hasLactateTesting: inputs.hasLactateTesting,
    weeklyTrainingMinutes: inputs.weeklyTrainingMinutes,
    trainingExperienceYears: inputs.trainingExperienceYears,
  })

  prerequisites.met.push(...validation.met)
  prerequisites.missing.push(...validation.missing)
  warnings.push(...validation.warnings)

  return validation.eligible
}

/**
 * Check if athlete is suitable for Canova methodology
 */
function checkCanovaEligibility(
  inputs: MethodologySelectionInputs,
  prerequisites: { met: string[]; missing: string[] },
  warnings: string[]
): boolean {
  let eligible = true

  // Requirement 1: Specific race goal with time target
  if (!inputs.hasSpecificRaceGoal || !inputs.raceTimeGoal) {
    prerequisites.missing.push('Canova requires specific race goal with target time')
    eligible = false
  } else {
    prerequisites.met.push('Has specific race goal with target time')
  }

  // Requirement 2: ADVANCED or ELITE level
  if (inputs.athleteLevel === 'BEGINNER' || inputs.athleteLevel === 'RECREATIONAL') {
    prerequisites.missing.push('Canova requires ADVANCED or ELITE level')
    eligible = false
  } else {
    prerequisites.met.push(`Athlete level: ${inputs.athleteLevel}`)
  }

  // Requirement 3: Adequate weekly volume (6+ hours)
  if (inputs.weeklyTrainingMinutes < 360) {
    prerequisites.missing.push('Canova requires 6+ hours/week training capacity')
    warnings.push('Build training volume before attempting Canova methodology')
    eligible = false
  } else {
    prerequisites.met.push('Sufficient weekly training volume')
  }

  // Requirement 4: Experience with quality training
  if (inputs.trainingExperienceYears < 2) {
    warnings.push('Limited experience - build base with Polarized before Canova')
  }

  return eligible
}

/**
 * Get methodology comparison for athlete
 *
 * Helps athlete understand trade-offs between methodologies
 *
 * @param athleteLevel - Athlete's level
 * @returns Comparison of suitable methodologies
 */
export function getMethodologyComparison(athleteLevel: AthleteLevel): {
  methodology: MethodologyType
  suitability: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NOT_RECOMMENDED'
  pros: string[]
  cons: string[]
}[] {
  const beginner: ReturnType<typeof getMethodologyComparison> = [
    {
      methodology: 'POLARIZED',
      suitability: 'EXCELLENT',
      pros: [
        'Safest for beginners',
        'Clear intensity prescription (easy or hard)',
        'Minimizes injury risk',
        'Proven effective',
      ],
      cons: ['May feel "too easy" at times'],
    },
    {
      methodology: 'PYRAMIDAL',
      suitability: 'GOOD',
      pros: ['Familiar structure', 'Balanced distribution', 'Good for busy schedules'],
      cons: ['More injury risk than Polarized', 'Harder to recover from'],
    },
    {
      methodology: 'NORWEGIAN',
      suitability: 'NOT_RECOMMENDED',
      pros: [],
      cons: ['Requires ADVANCED/ELITE level', 'High injury risk for beginners', 'Needs lactate testing'],
    },
    {
      methodology: 'CANOVA',
      suitability: 'NOT_RECOMMENDED',
      pros: [],
      cons: ['Requires ADVANCED level', 'Needs specific race goal', 'Too aggressive for beginners'],
    },
  ]

  const recreational: ReturnType<typeof getMethodologyComparison> = [
    {
      methodology: 'POLARIZED',
      suitability: 'EXCELLENT',
      pros: ['Most proven methodology', 'Works for all race distances', 'Sustainable long-term'],
      cons: ['Requires discipline to keep easy runs easy'],
    },
    {
      methodology: 'PYRAMIDAL',
      suitability: 'GOOD',
      pros: ['Time-efficient tempo runs', 'Feels balanced', 'Natural progression'],
      cons: ['Risk of accumulating fatigue in Zone 2'],
    },
    {
      methodology: 'NORWEGIAN',
      suitability: 'NOT_RECOMMENDED',
      pros: ['Proven for elites'],
      cons: ['Requires ADVANCED level', 'Needs lactate testing', 'Very high time commitment'],
    },
    {
      methodology: 'CANOVA',
      suitability: 'FAIR',
      pros: ['Race-specific if you have goal'],
      cons: ['Best for ADVANCED athletes', 'Requires accurate pace prediction'],
    },
  ]

  const advanced: ReturnType<typeof getMethodologyComparison> = [
    {
      methodology: 'POLARIZED',
      suitability: 'EXCELLENT',
      pros: ['Proven at elite level', 'Minimizes injury risk', 'Sustainable'],
      cons: ['May want more threshold work'],
    },
    {
      methodology: 'NORWEGIAN',
      suitability: 'EXCELLENT',
      pros: [
        'Proven for Norwegian elites',
        'Lactate-controlled precision',
        'Maximum aerobic development',
      ],
      cons: ['Requires lactate testing', 'Very high volume (10-12 sessions/week)'],
    },
    {
      methodology: 'CANOVA',
      suitability: 'EXCELLENT',
      pros: ['Perfect for race-specific goals', 'Progressive race-pace volume'],
      cons: ['Requires specific race target'],
    },
    {
      methodology: 'PYRAMIDAL',
      suitability: 'GOOD',
      pros: ['Balanced distribution', 'Familiar structure'],
      cons: ['May not optimize performance as well as others'],
    },
  ]

  const elite: ReturnType<typeof getMethodologyComparison> = [
    {
      methodology: 'NORWEGIAN',
      suitability: 'EXCELLENT',
      pros: [
        'Proven for world-class runners',
        'Maximum aerobic development',
        'Precise threshold control',
      ],
      cons: ['Requires commitment to lactate testing', 'Very high time commitment'],
    },
    {
      methodology: 'POLARIZED',
      suitability: 'EXCELLENT',
      pros: ['Proven across all sports', 'Sustainable long-term', 'Lower injury risk'],
      cons: ['May want more threshold work'],
    },
    {
      methodology: 'CANOVA',
      suitability: 'EXCELLENT',
      pros: ['Race-specific preparation', 'Proven for marathon'],
      cons: ['Requires clear race goal'],
    },
    {
      methodology: 'PYRAMIDAL',
      suitability: 'FAIR',
      pros: ['Balanced'],
      cons: ['Other methodologies likely more effective at elite level'],
    },
  ]

  const comparisons = {
    BEGINNER: beginner,
    RECREATIONAL: recreational,
    ADVANCED: advanced,
    ELITE: elite,
  }

  return comparisons[athleteLevel]
}
