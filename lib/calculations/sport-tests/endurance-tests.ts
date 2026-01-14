/**
 * Endurance Field Test Calculations
 *
 * Formulas for Yo-Yo Intermittent Recovery, Beep Test, and Cooper Test.
 */

export interface YoYoResult {
  level: number
  shuttle: number
  totalDistance: number // meters
  estimatedVO2max: number // ml/kg/min
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
}

export interface BeepTestResult {
  level: number
  shuttle: number
  totalDistance: number // meters
  estimatedVO2max: number // ml/kg/min
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
}

export interface CooperTestResult {
  distance: number // meters
  estimatedVO2max: number // ml/kg/min
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
}

/**
 * Yo-Yo IR1 distance table (cumulative distance at each level)
 * Each shuttle is 40m (2 x 20m)
 */
const YOYO_IR1_DISTANCES: Record<number, number[]> = {
  5: [40, 80, 120, 160, 200, 240, 280, 320], // 8 shuttles at level 5
  9: [40, 80, 120, 160, 200, 240, 280, 320], // 8 shuttles
  11: [40, 80, 120, 160, 200, 240, 280, 320],
  12: [40, 80, 120, 160, 200, 240, 280, 320],
  13: [40, 80, 120, 160, 200, 240, 280, 320],
  14: [40, 80, 120, 160, 200, 240, 280, 320],
  15: [40, 80, 120, 160, 200, 240, 280, 320],
  16: [40, 80, 120, 160, 200, 240, 280, 320],
  17: [40, 80, 120, 160, 200, 240, 280, 320],
  18: [40, 80, 120, 160, 200, 240, 280, 320],
  19: [40, 80, 120, 160, 200, 240, 280, 320],
  20: [40, 80, 120, 160, 200, 240, 280, 320],
  21: [40, 80, 120, 160, 200, 240, 280, 320],
  22: [40, 80, 120, 160, 200, 240, 280, 320],
  23: [40, 80, 120, 160, 200, 240, 280, 320],
}

/**
 * Calculate total distance for Yo-Yo IR1 test
 *
 * @param level - Final level achieved
 * @param shuttle - Final shuttle within level
 * @returns Total distance in meters
 */
export function calculateYoYoDistance(level: number, shuttle: number): number {
  // Simplified calculation based on level and shuttle
  // Each level has 8 shuttles of 40m each
  // Levels start at 5 and go up

  // Base distance from completed levels
  const completedLevels = level - 5 // Levels before current
  const distanceFromCompletedLevels = completedLevels * 8 * 40 // 8 shuttles × 40m per level

  // Distance from current level shuttles
  const distanceFromCurrentLevel = shuttle * 40

  // Add starting distance (levels 5-8 are warmup, ~160m total)
  const warmupDistance = 160

  return warmupDistance + distanceFromCompletedLevels + distanceFromCurrentLevel
}

/**
 * Estimate VO2max from Yo-Yo IR1 result
 *
 * Formula: VO2max = IR1 distance (m) × 0.0084 + 36.4
 * (Bangsbo et al., 2008)
 *
 * @param distance - Total distance in meters
 * @returns Estimated VO2max in ml/kg/min
 */
export function estimateVO2maxFromYoYoIR1(distance: number): number {
  const vo2max = distance * 0.0084 + 36.4
  return Math.round(vo2max * 10) / 10
}

/**
 * Estimate VO2max from Yo-Yo IR2 result
 *
 * Formula: VO2max = IR2 distance (m) × 0.0136 + 45.3
 *
 * @param distance - Total distance in meters
 * @returns Estimated VO2max in ml/kg/min
 */
export function estimateVO2maxFromYoYoIR2(distance: number): number {
  const vo2max = distance * 0.0136 + 45.3
  return Math.round(vo2max * 10) / 10
}

/**
 * Analyze Yo-Yo IR1 test result
 *
 * @param level - Final level achieved
 * @param shuttle - Final shuttle within level
 * @param gender - 'MALE' or 'FEMALE'
 * @param sport - Optional sport for sport-specific benchmarks
 * @returns YoYoResult with distance, VO2max, and tier
 */
export function analyzeYoYoIR1(
  level: number,
  shuttle: number,
  gender: 'MALE' | 'FEMALE',
  sport?: string
): YoYoResult {
  const totalDistance = calculateYoYoDistance(level, shuttle)
  const estimatedVO2max = estimateVO2maxFromYoYoIR1(totalDistance)
  const tier = classifyYoYoIR1(level, gender, sport)

  return {
    level,
    shuttle,
    totalDistance,
    estimatedVO2max,
    tier,
  }
}

/**
 * Classify Yo-Yo IR1 performance
 *
 * @param level - Yo-Yo IR1 level achieved
 * @param gender - 'MALE' or 'FEMALE'
 * @param sport - Optional sport for sport-specific benchmarks
 * @returns Performance tier
 */
export function classifyYoYoIR1(
  level: number,
  gender: 'MALE' | 'FEMALE',
  sport?: string
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // General benchmarks (level achieved)
  const generalBenchmarks =
    gender === 'MALE'
      ? { elite: 21, advanced: 19, intermediate: 17 }
      : { elite: 18, advanced: 16, intermediate: 14 }

  // Sport-specific benchmarks (football/handball/floorball)
  const sportBenchmarks: Record<
    string,
    Record<'MALE' | 'FEMALE', { elite: number; advanced: number; intermediate: number }>
  > = {
    TEAM_FOOTBALL: {
      MALE: { elite: 20.5, advanced: 19.0, intermediate: 17.0 },
      FEMALE: { elite: 17.5, advanced: 16.0, intermediate: 14.5 },
    },
    TEAM_HANDBALL: {
      MALE: { elite: 20.0, advanced: 18.5, intermediate: 17.0 },
      FEMALE: { elite: 17.0, advanced: 15.5, intermediate: 14.0 },
    },
    TEAM_FLOORBALL: {
      MALE: { elite: 21.0, advanced: 19.5, intermediate: 17.0 },
      FEMALE: { elite: 18.0, advanced: 16.5, intermediate: 15.0 },
    },
    TEAM_ICE_HOCKEY: {
      MALE: { elite: 19.0, advanced: 17.5, intermediate: 16.0 },
      FEMALE: { elite: 16.5, advanced: 15.0, intermediate: 13.5 },
    },
    TEAM_BASKETBALL: {
      MALE: { elite: 19.5, advanced: 18.0, intermediate: 16.5 },
      FEMALE: { elite: 17.0, advanced: 15.5, intermediate: 14.0 },
    },
  }

  const benchmarks =
    sport && sportBenchmarks[sport]
      ? sportBenchmarks[sport][gender]
      : generalBenchmarks

  if (level >= benchmarks.elite) return 'ELITE'
  if (level >= benchmarks.advanced) return 'ADVANCED'
  if (level >= benchmarks.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Calculate Beep Test (Multi-Stage Fitness Test) distance
 *
 * @param level - Final level achieved
 * @param shuttle - Final shuttle within level
 * @returns Total distance in meters
 */
export function calculateBeepTestDistance(level: number, shuttle: number): number {
  // Beep test has variable shuttles per level
  // Levels 1-7 have increasing shuttles, then stabilizes
  const shuttlesPerLevel: Record<number, number> = {
    1: 7,
    2: 8,
    3: 8,
    4: 9,
    5: 9,
    6: 10,
    7: 10,
    8: 11,
    9: 11,
    10: 11,
    11: 12,
    12: 12,
    13: 13,
    14: 13,
    15: 13,
    16: 14,
    17: 14,
    18: 15,
    19: 15,
    20: 16,
    21: 16,
  }

  let distance = 0

  // Add distance from completed levels
  for (let l = 1; l < level; l++) {
    const shuttles = shuttlesPerLevel[l] || 16
    distance += shuttles * 20 // 20m per shuttle
  }

  // Add distance from current level
  distance += shuttle * 20

  return distance
}

/**
 * Estimate VO2max from Beep Test result
 *
 * Léger formula: VO2max = 20.4 + (5.4 × level) + (0.3 × shuttle)
 *
 * @param level - Final level achieved
 * @param shuttle - Final shuttle within level
 * @returns Estimated VO2max in ml/kg/min
 */
export function estimateVO2maxFromBeepTest(level: number, shuttle: number): number {
  // Léger et al. formula
  const vo2max = 20.4 + 5.4 * level + 0.3 * shuttle
  return Math.round(vo2max * 10) / 10
}

/**
 * Analyze Beep Test result
 *
 * @param level - Final level achieved
 * @param shuttle - Final shuttle within level
 * @param gender - 'MALE' or 'FEMALE'
 * @returns BeepTestResult with distance, VO2max, and tier
 */
export function analyzeBeepTest(
  level: number,
  shuttle: number,
  gender: 'MALE' | 'FEMALE'
): BeepTestResult {
  const totalDistance = calculateBeepTestDistance(level, shuttle)
  const estimatedVO2max = estimateVO2maxFromBeepTest(level, shuttle)
  const tier = classifyBeepTest(level, gender)

  return {
    level,
    shuttle,
    totalDistance,
    estimatedVO2max,
    tier,
  }
}

/**
 * Classify Beep Test performance
 *
 * @param level - Final level achieved
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyBeepTest(
  level: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks =
    gender === 'MALE'
      ? { elite: 14, advanced: 12, intermediate: 10 }
      : { elite: 12, advanced: 10, intermediate: 8 }

  if (level >= benchmarks.elite) return 'ELITE'
  if (level >= benchmarks.advanced) return 'ADVANCED'
  if (level >= benchmarks.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Estimate VO2max from Cooper Test (12-minute run)
 *
 * Cooper formula: VO2max = (distance - 504.9) / 44.73
 *
 * @param distance - Distance covered in 12 minutes in meters
 * @returns Estimated VO2max in ml/kg/min
 */
export function estimateVO2maxFromCooperTest(distance: number): number {
  const vo2max = (distance - 504.9) / 44.73
  return Math.round(vo2max * 10) / 10
}

/**
 * Analyze Cooper Test result
 *
 * @param distance - Distance covered in 12 minutes in meters
 * @param gender - 'MALE' or 'FEMALE'
 * @param age - Age in years (for age-adjusted classification)
 * @returns CooperTestResult with distance, VO2max, and tier
 */
export function analyzeCooperTest(
  distance: number,
  gender: 'MALE' | 'FEMALE',
  age?: number
): CooperTestResult {
  const estimatedVO2max = estimateVO2maxFromCooperTest(distance)
  const tier = classifyCooperTest(distance, gender, age)

  return {
    distance,
    estimatedVO2max,
    tier,
  }
}

/**
 * Classify Cooper Test performance
 *
 * @param distance - Distance in meters
 * @param gender - 'MALE' or 'FEMALE'
 * @param age - Optional age for age-adjusted benchmarks
 * @returns Performance tier
 */
export function classifyCooperTest(
  distance: number,
  gender: 'MALE' | 'FEMALE',
  age?: number
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // General adult benchmarks (meters in 12 minutes)
  const benchmarks =
    gender === 'MALE'
      ? { elite: 3000, advanced: 2700, intermediate: 2400 }
      : { elite: 2700, advanced: 2400, intermediate: 2100 }

  if (distance >= benchmarks.elite) return 'ELITE'
  if (distance >= benchmarks.advanced) return 'ADVANCED'
  if (distance >= benchmarks.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}
