/**
 * Agility Test Calculations
 *
 * Formulas for change of direction speed (CODS), T-test, and shuttle tests.
 * Includes youth benchmarks, position-specific benchmarks, and fatigue analysis.
 */

export type AgilityTestType =
  | 'T_TEST'
  | 'ILLINOIS'
  | 'PRO_AGILITY_5_10_5'
  | 'LANE_AGILITY'
  | 'ARROWHEAD'

export type AgeGroup = 'U12' | 'U14' | 'U16' | 'U18' | 'SENIOR'

export type FootballPosition = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface AgilityResult {
  testType: AgilityTestType
  time: number // seconds
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
  percentile?: number
  ageAdjustedTier?: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
  positionRank?: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE'
}

export interface FatigueAnalysis {
  fatigueIndex: number // percentage decline
  bestTime: number
  worstTime: number
  averageTime: number
  standardDeviation: number
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  recommendation: string
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
 * Youth T-Test benchmarks by age group and gender
 * Based on research from youth sport performance studies
 * Times are adjusted for developmental stages
 */
const T_TEST_YOUTH_BENCHMARKS: Record<AgeGroup, { MALE: { ELITE: number; ADVANCED: number; INTERMEDIATE: number }; FEMALE: { ELITE: number; ADVANCED: number; INTERMEDIATE: number } }> = {
  U12: {
    MALE: { ELITE: 12.0, ADVANCED: 13.0, INTERMEDIATE: 14.5 },
    FEMALE: { ELITE: 12.5, ADVANCED: 13.5, INTERMEDIATE: 15.0 },
  },
  U14: {
    MALE: { ELITE: 11.0, ADVANCED: 12.0, INTERMEDIATE: 13.5 },
    FEMALE: { ELITE: 11.5, ADVANCED: 12.5, INTERMEDIATE: 14.0 },
  },
  U16: {
    MALE: { ELITE: 10.2, ADVANCED: 11.2, INTERMEDIATE: 12.5 },
    FEMALE: { ELITE: 11.0, ADVANCED: 12.0, INTERMEDIATE: 13.0 },
  },
  U18: {
    MALE: { ELITE: 9.8, ADVANCED: 10.8, INTERMEDIATE: 12.0 },
    FEMALE: { ELITE: 10.8, ADVANCED: 11.8, INTERMEDIATE: 12.8 },
  },
  SENIOR: {
    MALE: { ELITE: 9.5, ADVANCED: 10.5, INTERMEDIATE: 11.5 },
    FEMALE: { ELITE: 10.5, ADVANCED: 11.5, INTERMEDIATE: 12.5 },
  },
}

/**
 * Youth Illinois Test benchmarks by age group
 */
const ILLINOIS_YOUTH_BENCHMARKS: Record<AgeGroup, { MALE: { ELITE: number; ADVANCED: number; INTERMEDIATE: number }; FEMALE: { ELITE: number; ADVANCED: number; INTERMEDIATE: number } }> = {
  U12: {
    MALE: { ELITE: 18.5, ADVANCED: 19.5, INTERMEDIATE: 21.0 },
    FEMALE: { ELITE: 19.5, ADVANCED: 20.5, INTERMEDIATE: 22.0 },
  },
  U14: {
    MALE: { ELITE: 17.0, ADVANCED: 18.0, INTERMEDIATE: 19.5 },
    FEMALE: { ELITE: 18.5, ADVANCED: 19.5, INTERMEDIATE: 21.0 },
  },
  U16: {
    MALE: { ELITE: 15.8, ADVANCED: 16.8, INTERMEDIATE: 18.0 },
    FEMALE: { ELITE: 17.5, ADVANCED: 18.5, INTERMEDIATE: 19.5 },
  },
  U18: {
    MALE: { ELITE: 15.5, ADVANCED: 16.5, INTERMEDIATE: 17.5 },
    FEMALE: { ELITE: 17.2, ADVANCED: 18.2, INTERMEDIATE: 19.2 },
  },
  SENIOR: {
    MALE: { ELITE: 15.2, ADVANCED: 16.2, INTERMEDIATE: 17.2 },
    FEMALE: { ELITE: 17.0, ADVANCED: 18.0, INTERMEDIATE: 19.0 },
  },
}

/**
 * Position-specific T-Test benchmarks for football (soccer)
 * Based on positional demands analysis
 * GK: Less agility demands but important for 1v1 situations
 * DEF: High demands for marking and recovery runs
 * MID: Highest overall agility demands
 * FWD: High demands for getting behind defenders
 */
const POSITION_T_TEST_BENCHMARKS: Record<FootballPosition, { EXCELLENT: number; GOOD: number; AVERAGE: number }> = {
  GK: {
    EXCELLENT: 10.5,
    GOOD: 11.2,
    AVERAGE: 12.0,
  },
  DEF: {
    EXCELLENT: 9.8,
    GOOD: 10.5,
    AVERAGE: 11.2,
  },
  MID: {
    EXCELLENT: 9.5,
    GOOD: 10.2,
    AVERAGE: 10.8,
  },
  FWD: {
    EXCELLENT: 9.6,
    GOOD: 10.3,
    AVERAGE: 11.0,
  },
}

/**
 * Position-specific Pro Agility benchmarks for football
 */
const POSITION_PRO_AGILITY_BENCHMARKS: Record<FootballPosition, { EXCELLENT: number; GOOD: number; AVERAGE: number }> = {
  GK: {
    EXCELLENT: 4.8,
    GOOD: 5.1,
    AVERAGE: 5.5,
  },
  DEF: {
    EXCELLENT: 4.3,
    GOOD: 4.6,
    AVERAGE: 5.0,
  },
  MID: {
    EXCELLENT: 4.2,
    GOOD: 4.5,
    AVERAGE: 4.8,
  },
  FWD: {
    EXCELLENT: 4.2,
    GOOD: 4.5,
    AVERAGE: 4.9,
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

// ============================================
// Youth Benchmark Functions
// ============================================

/**
 * Get age group from birth date
 */
export function getAgeGroupFromBirthDate(birthDate: Date): AgeGroup {
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()

  if (age < 12) return 'U12'
  if (age < 14) return 'U14'
  if (age < 16) return 'U16'
  if (age < 18) return 'U18'
  return 'SENIOR'
}

/**
 * Classify T-Test with youth-adjusted benchmarks
 */
export function classifyTTestYouth(
  time: number,
  gender: 'MALE' | 'FEMALE',
  ageGroup: AgeGroup
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks = T_TEST_YOUTH_BENCHMARKS[ageGroup][gender]

  if (time <= benchmarks.ELITE) return 'ELITE'
  if (time <= benchmarks.ADVANCED) return 'ADVANCED'
  if (time <= benchmarks.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Classify Illinois Test with youth-adjusted benchmarks
 */
export function classifyIllinoisYouth(
  time: number,
  gender: 'MALE' | 'FEMALE',
  ageGroup: AgeGroup
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks = ILLINOIS_YOUTH_BENCHMARKS[ageGroup][gender]

  if (time <= benchmarks.ELITE) return 'ELITE'
  if (time <= benchmarks.ADVANCED) return 'ADVANCED'
  if (time <= benchmarks.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Get youth benchmarks for a specific test and age group
 */
export function getYouthBenchmarks(
  testType: AgilityTestType,
  gender: 'MALE' | 'FEMALE',
  ageGroup: AgeGroup
): { ELITE: number; ADVANCED: number; INTERMEDIATE: number } | null {
  switch (testType) {
    case 'T_TEST':
      return T_TEST_YOUTH_BENCHMARKS[ageGroup][gender]
    case 'ILLINOIS':
      return ILLINOIS_YOUTH_BENCHMARKS[ageGroup][gender]
    default:
      return null
  }
}

// ============================================
// Position-Specific Benchmark Functions
// ============================================

/**
 * Classify T-Test performance by football position
 */
export function classifyTTestByPosition(
  time: number,
  position: FootballPosition
): 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE' {
  const benchmarks = POSITION_T_TEST_BENCHMARKS[position]

  if (time <= benchmarks.EXCELLENT) return 'EXCELLENT'
  if (time <= benchmarks.GOOD) return 'GOOD'
  if (time <= benchmarks.AVERAGE) return 'AVERAGE'
  return 'BELOW_AVERAGE'
}

/**
 * Classify Pro Agility performance by football position
 */
export function classifyProAgilityByPosition(
  time: number,
  position: FootballPosition
): 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE' {
  const benchmarks = POSITION_PRO_AGILITY_BENCHMARKS[position]

  if (time <= benchmarks.EXCELLENT) return 'EXCELLENT'
  if (time <= benchmarks.GOOD) return 'GOOD'
  if (time <= benchmarks.AVERAGE) return 'AVERAGE'
  return 'BELOW_AVERAGE'
}

/**
 * Get position-specific benchmark for comparison
 */
export function getPositionBenchmarks(
  testType: AgilityTestType,
  position: FootballPosition
): { EXCELLENT: number; GOOD: number; AVERAGE: number } | null {
  switch (testType) {
    case 'T_TEST':
      return POSITION_T_TEST_BENCHMARKS[position]
    case 'PRO_AGILITY_5_10_5':
      return POSITION_PRO_AGILITY_BENCHMARKS[position]
    default:
      return null
  }
}

// ============================================
// Enhanced COD Deficit Calculation
// ============================================

/**
 * Calculate detailed Change of Direction Deficit analysis
 *
 * CODD helps identify if an athlete's agility limitations are due to:
 * - Pure speed (high linear, high COD = speed issue)
 * - Technique (fast linear, slow COD = technique/strength issue)
 *
 * @param codTime - Change of direction test time in seconds
 * @param linearTime - Linear sprint time for similar distance in seconds
 * @param gender - Athlete gender for benchmark comparison
 * @returns Detailed COD deficit analysis
 */
export function calculateDetailedCODDeficit(
  codTime: number,
  linearTime: number,
  gender: 'MALE' | 'FEMALE'
): {
  deficit: number
  deficitPercent: number
  rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_WORK'
  interpretation: string
  trainingFocus: string[]
} {
  const deficit = codTime - linearTime
  const deficitPercent = (deficit / linearTime) * 100

  // Typical COD deficit benchmarks (as percentage of linear time)
  // Based on research: lower deficit = better direction change ability
  const benchmarks = gender === 'MALE'
    ? { excellent: 20, good: 30, average: 40 }
    : { excellent: 22, good: 32, average: 42 }

  let rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_WORK'
  let interpretation: string
  let trainingFocus: string[]

  if (deficitPercent <= benchmarks.excellent) {
    rating = 'EXCELLENT'
    interpretation = 'Exceptional direction change ability relative to linear speed'
    trainingFocus = ['Maintain current training', 'Focus on speed development']
  } else if (deficitPercent <= benchmarks.good) {
    rating = 'GOOD'
    interpretation = 'Good direction change efficiency'
    trainingFocus = ['Continue COD training', 'Add reactive agility work']
  } else if (deficitPercent <= benchmarks.average) {
    rating = 'AVERAGE'
    interpretation = 'Direction change technique needs improvement'
    trainingFocus = ['Deceleration training', 'Cutting technique work', 'Eccentric strength']
  } else {
    rating = 'NEEDS_WORK'
    interpretation = 'Significant technique deficit in direction changes'
    trainingFocus = [
      'Prioritize deceleration mechanics',
      'Eccentric leg strength',
      'Cutting angles practice',
      'Body position awareness'
    ]
  }

  return {
    deficit: Math.round(deficit * 1000) / 1000,
    deficitPercent: Math.round(deficitPercent * 10) / 10,
    rating,
    interpretation,
    trainingFocus
  }
}

// ============================================
// Fatigue Analysis for Repeated Tests
// ============================================

/**
 * Analyze fatigue from repeated agility tests
 *
 * Useful for:
 * - Assessing work capacity
 * - Identifying fatigue resistance
 * - Determining readiness
 *
 * @param times - Array of test times in chronological order
 * @returns Fatigue analysis with index and recommendations
 */
export function analyzeFatigue(times: number[]): FatigueAnalysis {
  if (times.length < 2) {
    return {
      fatigueIndex: 0,
      bestTime: times[0] || 0,
      worstTime: times[0] || 0,
      averageTime: times[0] || 0,
      standardDeviation: 0,
      trend: 'STABLE',
      recommendation: 'Need at least 2 trials for fatigue analysis'
    }
  }

  const bestTime = Math.min(...times)
  const worstTime = Math.max(...times)
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length

  // Calculate standard deviation
  const squaredDiffs = times.map(t => Math.pow(t - averageTime, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / times.length
  const standardDeviation = Math.sqrt(avgSquaredDiff)

  // Fatigue index: percentage decline from best to worst
  const fatigueIndex = ((worstTime - bestTime) / bestTime) * 100

  // Determine trend (compare first half vs second half)
  const midpoint = Math.floor(times.length / 2)
  const firstHalfAvg = times.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint
  const secondHalfAvg = times.slice(midpoint).reduce((a, b) => a + b, 0) / (times.length - midpoint)

  let trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  const trendDiff = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100

  if (trendDiff < -2) {
    trend = 'IMPROVING' // Getting faster
  } else if (trendDiff > 2) {
    trend = 'DECLINING' // Getting slower (fatiguing)
  } else {
    trend = 'STABLE'
  }

  // Generate recommendation based on fatigue index
  let recommendation: string
  if (fatigueIndex < 5) {
    recommendation = 'Excellent fatigue resistance. Athlete maintains performance well across repetitions.'
  } else if (fatigueIndex < 10) {
    recommendation = 'Good fatigue resistance. Minor performance decline acceptable for high-intensity tests.'
  } else if (fatigueIndex < 15) {
    recommendation = 'Moderate fatigue. Consider work capacity training and recovery protocols.'
  } else {
    recommendation = 'Significant fatigue. Focus on aerobic base, recovery, and pacing strategies. Check for adequate warm-up and rest between trials.'
  }

  return {
    fatigueIndex: Math.round(fatigueIndex * 10) / 10,
    bestTime: Math.round(bestTime * 1000) / 1000,
    worstTime: Math.round(worstTime * 1000) / 1000,
    averageTime: Math.round(averageTime * 1000) / 1000,
    standardDeviation: Math.round(standardDeviation * 1000) / 1000,
    trend,
    recommendation
  }
}

/**
 * Calculate fatigue index specifically for repeated sprint ability (RSA)
 *
 * @param times - Array of sprint times
 * @returns RSA-specific fatigue metrics
 */
export function calculateRSAFatigueIndex(times: number[]): {
  fatigueIndex: number
  performanceDecrement: number
  idealTime: number
  totalTime: number
  sprintDecrement: number[]
} {
  if (times.length < 2) {
    return {
      fatigueIndex: 0,
      performanceDecrement: 0,
      idealTime: times[0] || 0,
      totalTime: times[0] || 0,
      sprintDecrement: []
    }
  }

  const bestTime = Math.min(...times)
  const totalTime = times.reduce((a, b) => a + b, 0)
  const idealTime = bestTime * times.length

  // Fatigue index (Fitzsimons method): (Total time / Ideal time) * 100 - 100
  const fatigueIndex = ((totalTime / idealTime) * 100) - 100

  // Performance decrement: ((Mean time - Best time) / Best time) * 100
  const meanTime = totalTime / times.length
  const performanceDecrement = ((meanTime - bestTime) / bestTime) * 100

  // Individual sprint decrements
  const sprintDecrement = times.map(t => ((t - bestTime) / bestTime) * 100)

  return {
    fatigueIndex: Math.round(fatigueIndex * 10) / 10,
    performanceDecrement: Math.round(performanceDecrement * 10) / 10,
    idealTime: Math.round(idealTime * 1000) / 1000,
    totalTime: Math.round(totalTime * 1000) / 1000,
    sprintDecrement: sprintDecrement.map(d => Math.round(d * 10) / 10)
  }
}
