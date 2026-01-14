/**
 * Agility Test Calculations
 *
 * Formulas for change of direction speed (CODS), T-test, and shuttle tests.
 */

export type AgilityTestType =
  | 'T_TEST'
  | 'ILLINOIS'
  | 'PRO_AGILITY_5_10_5'
  | 'LANE_AGILITY'
  | 'ARROWHEAD'

export interface AgilityResult {
  testType: AgilityTestType
  time: number // seconds
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
  percentile?: number
}

/**
 * T-Test benchmarks by gender
 *
 * Standard T-Test: 40 yards total (10m forward, 5m left, 10m right, 5m left, 10m back)
 */
const T_TEST_BENCHMARKS = {
  MALE: {
    ELITE: 9.5,
    ADVANCED: 10.5,
    INTERMEDIATE: 11.5,
  },
  FEMALE: {
    ELITE: 10.5,
    ADVANCED: 11.5,
    INTERMEDIATE: 12.5,
  },
}

/**
 * Illinois Agility Test benchmarks
 *
 * Standard course: 10m × 5m with 4 cones to weave through
 */
const ILLINOIS_BENCHMARKS = {
  MALE: {
    ELITE: 15.2,
    ADVANCED: 16.2,
    INTERMEDIATE: 17.2,
  },
  FEMALE: {
    ELITE: 17.0,
    ADVANCED: 18.0,
    INTERMEDIATE: 19.0,
  },
}

/**
 * Pro Agility (5-10-5) benchmarks
 *
 * Standard: 5 yards one direction, 10 yards back, 5 yards to finish
 */
const PRO_AGILITY_BENCHMARKS = {
  MALE: {
    ELITE: 4.2,
    ADVANCED: 4.5,
    INTERMEDIATE: 4.8,
  },
  FEMALE: {
    ELITE: 4.8,
    ADVANCED: 5.1,
    INTERMEDIATE: 5.5,
  },
}

/**
 * Lane Agility (Basketball) benchmarks
 *
 * Standard NBA combine test around the key
 */
const LANE_AGILITY_BENCHMARKS = {
  MALE: {
    ELITE: 10.5,
    ADVANCED: 11.5,
    INTERMEDIATE: 12.5,
  },
  FEMALE: {
    ELITE: 12.0,
    ADVANCED: 13.0,
    INTERMEDIATE: 14.0,
  },
}

/**
 * Classify T-Test performance
 *
 * @param time - T-Test time in seconds
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyTTest(
  time: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks = T_TEST_BENCHMARKS[gender]

  if (time <= benchmarks.ELITE) return 'ELITE'
  if (time <= benchmarks.ADVANCED) return 'ADVANCED'
  if (time <= benchmarks.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Classify Illinois Agility Test performance
 *
 * @param time - Test time in seconds
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyIllinoisAgility(
  time: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks = ILLINOIS_BENCHMARKS[gender]

  if (time <= benchmarks.ELITE) return 'ELITE'
  if (time <= benchmarks.ADVANCED) return 'ADVANCED'
  if (time <= benchmarks.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Classify Pro Agility (5-10-5) performance
 *
 * @param time - Test time in seconds
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyProAgility(
  time: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks = PRO_AGILITY_BENCHMARKS[gender]

  if (time <= benchmarks.ELITE) return 'ELITE'
  if (time <= benchmarks.ADVANCED) return 'ADVANCED'
  if (time <= benchmarks.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Classify Lane Agility (Basketball) performance
 *
 * @param time - Test time in seconds
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyLaneAgility(
  time: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks = LANE_AGILITY_BENCHMARKS[gender]

  if (time <= benchmarks.ELITE) return 'ELITE'
  if (time <= benchmarks.ADVANCED) return 'ADVANCED'
  if (time <= benchmarks.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Classify any agility test by type
 *
 * @param testType - Type of agility test
 * @param time - Test time in seconds
 * @param gender - 'MALE' or 'FEMALE'
 * @returns AgilityResult with tier classification
 */
export function classifyAgilityTest(
  testType: AgilityTestType,
  time: number,
  gender: 'MALE' | 'FEMALE'
): AgilityResult {
  let tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'

  switch (testType) {
    case 'T_TEST':
      tier = classifyTTest(time, gender)
      break
    case 'ILLINOIS':
      tier = classifyIllinoisAgility(time, gender)
      break
    case 'PRO_AGILITY_5_10_5':
      tier = classifyProAgility(time, gender)
      break
    case 'LANE_AGILITY':
      tier = classifyLaneAgility(time, gender)
      break
    case 'ARROWHEAD':
      // Use T-Test benchmarks as approximation
      tier = classifyTTest(time, gender)
      break
    default:
      tier = 'INTERMEDIATE'
  }

  return {
    testType,
    time,
    tier,
  }
}

/**
 * Calculate Change of Direction Deficit (CODD)
 *
 * CODD = COD time - Linear sprint time
 * Lower is better (less time lost in turning)
 *
 * @param codTime - Change of direction test time in seconds
 * @param linearTime - Linear sprint time for similar distance in seconds
 * @returns CODD in seconds
 */
export function calculateCODDeficit(codTime: number, linearTime: number): number {
  const deficit = codTime - linearTime
  return Math.round(deficit * 1000) / 1000
}

/**
 * Calculate Reactive Agility Index
 *
 * Compares planned vs. reactive agility performance
 *
 * @param plannedTime - Pre-planned agility test time
 * @param reactiveTime - Reactive (decision-making) agility test time
 * @returns Reactive agility index (lower is better)
 */
export function calculateReactiveAgilityIndex(
  plannedTime: number,
  reactiveTime: number
): number {
  if (plannedTime <= 0) return 0
  const index = (reactiveTime - plannedTime) / plannedTime * 100
  return Math.round(index * 10) / 10
}

/**
 * Get test description in Swedish
 *
 * @param testType - Type of agility test
 * @returns Swedish description
 */
export function getAgilityTestDescription(testType: AgilityTestType): {
  name: string
  description: string
} {
  const descriptions: Record<AgilityTestType, { name: string; description: string }> = {
    T_TEST: {
      name: 'T-test',
      description: 'Snabbhetstest med riktningsförändringar i T-form (40 yards)',
    },
    ILLINOIS: {
      name: 'Illinois Agility Test',
      description: 'Löpbana med slalom runt koner (10m × 5m)',
    },
    PRO_AGILITY_5_10_5: {
      name: '5-10-5 Pro Agility',
      description: 'Kort shuttle med snabba riktningsförändringar',
    },
    LANE_AGILITY: {
      name: 'Lane Agility (Basket)',
      description: 'Basketspecifikt test runt straffområdet',
    },
    ARROWHEAD: {
      name: 'Arrowhead Agility',
      description: 'Pilformad bana med diagonala riktningsförändringar',
    },
  }

  return descriptions[testType] || { name: testType, description: '' }
}
