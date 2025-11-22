// lib/training-engine/calculations/vdot.ts
// Jack Daniels VDOT Calculator - Gold Standard for Race-Based Training Zones
// Based on "Daniels' Running Formula" 3rd Edition

/**
 * VDOT represents the maximum volume of oxygen uptake (VO2max) adjusted for running economy.
 * Unlike raw VO2max, VDOT accounts for how efficiently an athlete uses oxygen.
 * Range: 30-85 (recreational to world-class)
 */

export interface VDOTResult {
  vdot: number
  trainingPaces: DanielsTrainingPaces
  equivalentTimes: EquivalentRaceTimes
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  ageInDays: number
  adjustments: {
    genderAdjusted: boolean
    ageAdjusted: boolean
    originalVDOT?: number
  }
}

export interface DanielsTrainingPaces {
  easy: { minKmh: number; maxKmh: number; minPace: string; maxPace: string }
  marathon: { kmh: number; pace: string }
  threshold: { kmh: number; pace: string }
  interval: { kmh: number; pace: string }
  repetition: { kmh: number; pace: string }
}

export interface EquivalentRaceTimes {
  marathon: number // minutes
  halfMarathon: number
  tenK: number
  fiveK: number
}

/**
 * Calculate VDOT from race performance using Jack Daniels oxygen cost model
 * @param distanceMeters - Race distance in meters
 * @param timeMinutes - Race time in minutes
 * @returns VDOT value (30-85 range)
 */
export function calculateVDOT(distanceMeters: number, timeMinutes: number): number {
  const velocityMperMin = distanceMeters / timeMinutes
  const vo2 = calculateVO2(velocityMperMin)
  const percentMax = calculatePercentMax(timeMinutes)
  const vdot = vo2 / percentMax

  return Math.round(vdot * 10) / 10 // Round to 1 decimal
}

/**
 * Calculate oxygen cost at given velocity (Daniels' model)
 * @param velocityMperMin - Velocity in meters per minute
 * @returns VO2 in ml/kg/min
 */
function calculateVO2(velocityMperMin: number): number {
  // Daniels' oxygen cost formula
  // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
  // where v = velocity in meters/minute

  const v = velocityMperMin
  const vo2 = -4.60 + (0.182258 * v) + (0.000104 * v * v)

  return vo2
}

/**
 * Calculate percent of VO2max based on race duration
 * @param timeMinutes - Race duration in minutes
 * @returns Percent of VO2max (0.0 - 1.0)
 */
function calculatePercentMax(timeMinutes: number): number {
  // Daniels' percent max formula based on race duration
  // Shorter races = higher % VO2max, longer races = lower %

  if (timeMinutes <= 2.5) {
    return 1.0 // Very short sprint
  } else if (timeMinutes <= 6) {
    return 0.998 // ~1 mile / 1500m
  } else if (timeMinutes <= 12) {
    return 0.99 // ~5K
  } else if (timeMinutes <= 30) {
    return 0.96 // ~10K
  } else if (timeMinutes <= 60) {
    return 0.93 // ~15K
  } else if (timeMinutes <= 120) {
    return 0.89 // ~Half Marathon
  } else if (timeMinutes <= 180) {
    return 0.86 // ~30K
  } else {
    return 0.85 // Marathon and beyond
  }
}

/**
 * Calculate training paces from VDOT
 * @param vdot - VDOT value
 * @returns All 5 Daniels training paces
 */
export function getTrainingPaces(vdot: number): DanielsTrainingPaces {
  // Calculate velocity at VO2max (VDOT pace)
  const vdotVelocity = getVelocityAtVO2(vdot)

  // Training pace percentages (as % of VDOT velocity)
  const easyMin = vdotVelocity * 0.59  // 59% - very slow recovery
  const easyMax = vdotVelocity * 0.74  // 74% - moderate recovery
  const marathonV = vdotVelocity * 0.84  // 84% - marathon race pace
  const thresholdV = vdotVelocity * 0.88  // 88% - comfortably hard (LT2)
  const intervalV = vdotVelocity * 1.0   // 100% - VO2max intervals
  const repetitionV = vdotVelocity * 1.10 // 110% - speed/economy

  // Convert m/min to km/h
  const toKmh = (mPerMin: number) => (mPerMin * 60) / 1000

  return {
    easy: {
      minKmh: toKmh(easyMin),
      maxKmh: toKmh(easyMax),
      minPace: kmhToPace(toKmh(easyMin)),
      maxPace: kmhToPace(toKmh(easyMax))
    },
    marathon: {
      kmh: toKmh(marathonV),
      pace: kmhToPace(toKmh(marathonV))
    },
    threshold: {
      kmh: toKmh(thresholdV),
      pace: kmhToPace(toKmh(thresholdV))
    },
    interval: {
      kmh: toKmh(intervalV),
      pace: kmhToPace(toKmh(intervalV))
    },
    repetition: {
      kmh: toKmh(repetitionV),
      pace: kmhToPace(toKmh(repetitionV))
    }
  }
}

/**
 * Get velocity (m/min) at a given VO2
 * Inverse of calculateVO2 function
 */
function getVelocityAtVO2(vo2: number): number {
  // Solve: VO2 = -4.60 + 0.182258*v + 0.000104*v^2
  // Using quadratic formula: v = (-b + sqrt(b^2 - 4ac)) / 2a

  const a = 0.000104
  const b = 0.182258
  const c = -4.60 - vo2

  const discriminant = b * b - 4 * a * c
  const velocity = (-b + Math.sqrt(discriminant)) / (2 * a)

  return velocity
}

/**
 * Calculate equivalent race times from VDOT
 * @param vdot - VDOT value
 * @returns Predicted times for standard race distances
 */
export function getEquivalentTimes(vdot: number): EquivalentRaceTimes {
  return {
    fiveK: getRaceTime(vdot, 5000),
    tenK: getRaceTime(vdot, 10000),
    halfMarathon: getRaceTime(vdot, 21097.5),
    marathon: getRaceTime(vdot, 42195)
  }
}

/**
 * Get predicted race time for a given distance and VDOT
 * @param vdot - VDOT value
 * @param distanceMeters - Race distance
 * @returns Time in minutes
 */
function getRaceTime(vdot: number, distanceMeters: number): number {
  // Estimate percent max for this distance
  const estimatedTime = distanceMeters / (getVelocityAtVO2(vdot))
  const percentMax = calculatePercentMax(estimatedTime)

  // Refine calculation
  const actualVO2 = vdot * percentMax
  const velocity = getVelocityAtVO2(actualVO2)
  const time = distanceMeters / velocity

  return time
}

/**
 * Apply age adjustment to VDOT (masters athletes)
 * Research shows ~0.5% decline per year after age 35
 */
export function applyAgeAdjustment(vdot: number, age: number): number {
  if (age <= 35) {
    return vdot // No adjustment for younger athletes
  }

  const yearsOver35 = age - 35
  const declinePercent = yearsOver35 * 0.5 // 0.5% per year
  const adjustedVDOT = vdot * (1 + declinePercent / 100)

  return Math.round(adjustedVDOT * 10) / 10
}

/**
 * Apply gender adjustment to VDOT
 * Research shows females have ~5-8% higher running economy at same VO2max
 * This means female VDOT should be slightly higher for same performance
 */
export function applyGenderAdjustment(
  vdot: number,
  gender: 'MALE' | 'FEMALE',
  distanceMeters: number
): number {
  if (gender === 'MALE') {
    return vdot // No adjustment for males
  }

  // Females have better economy, especially at longer distances
  let adjustmentPercent = 0

  if (distanceMeters >= 42195) {
    // Marathon: +3% economy advantage
    adjustmentPercent = 3
  } else if (distanceMeters >= 21097) {
    // Half marathon: +2.5% advantage
    adjustmentPercent = 2.5
  } else if (distanceMeters >= 10000) {
    // 10K: +2% advantage
    adjustmentPercent = 2
  } else {
    // 5K and shorter: +1.5% advantage
    adjustmentPercent = 1.5
  }

  const adjustedVDOT = vdot * (1 + adjustmentPercent / 100)
  return Math.round(adjustedVDOT * 10) / 10
}

/**
 * Main function: Calculate VDOT from race with all adjustments
 */
export function calculateVDOTFromRace(
  distance: '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM',
  timeMinutes: number,
  customDistanceKm?: number,
  raceDate?: Date,
  age?: number,
  gender?: 'MALE' | 'FEMALE'
): VDOTResult {
  // Get distance in meters
  const distanceMeters = getDistanceMeters(distance, customDistanceKm)

  // Calculate base VDOT
  let vdot = calculateVDOT(distanceMeters, timeMinutes)
  const originalVDOT = vdot

  // Apply adjustments
  let genderAdjusted = false
  let ageAdjusted = false

  if (gender) {
    vdot = applyGenderAdjustment(vdot, gender, distanceMeters)
    genderAdjusted = gender === 'FEMALE'
  }

  if (age && age > 35) {
    vdot = applyAgeAdjustment(vdot, age)
    ageAdjusted = true
  }

  // Calculate training paces and equivalent times
  const trainingPaces = getTrainingPaces(vdot)
  const equivalentTimes = getEquivalentTimes(vdot)

  // Determine confidence based on race age
  let confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'VERY_HIGH'
  let ageInDays = 0

  if (raceDate) {
    ageInDays = Math.floor((Date.now() - raceDate.getTime()) / (1000 * 60 * 60 * 24))

    if (ageInDays > 180) {
      confidence = 'LOW'
    } else if (ageInDays > 90) {
      confidence = 'MEDIUM'
    } else if (ageInDays > 30) {
      confidence = 'HIGH'
    } else {
      confidence = 'VERY_HIGH'
    }
  }

  return {
    vdot,
    trainingPaces,
    equivalentTimes,
    confidence,
    ageInDays,
    adjustments: {
      genderAdjusted,
      ageAdjusted,
      originalVDOT: genderAdjusted || ageAdjusted ? originalVDOT : undefined
    }
  }
}

/**
 * Helper: Get distance in meters
 */
function getDistanceMeters(
  distance: '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON' | 'CUSTOM',
  customDistanceKm?: number
): number {
  switch (distance) {
    case '5K':
      return 5000
    case '10K':
      return 10000
    case 'HALF_MARATHON':
      return 21097.5
    case 'MARATHON':
      return 42195
    case 'CUSTOM':
      return (customDistanceKm || 10) * 1000
    default:
      return 10000
  }
}

/**
 * Helper: Convert km/h to min/km pace string
 */
function kmhToPace(kmh: number): string {
  const minPerKm = 60 / kmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)

  return `${minutes}:${String(seconds).padStart(2, '0')}/km`
}

/**
 * Reverse: Get VDOT from target marathon time
 * Useful for goal-based planning
 */
export function getVDOTFromMarathonGoal(targetTimeMinutes: number): number {
  return calculateVDOT(42195, targetTimeMinutes)
}

/**
 * Validate VDOT against expected range
 */
export function validateVDOT(vdot: number, weeklyKm: number): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // Check if VDOT is in reasonable range
  if (vdot < 30) {
    warnings.push('VDOT unusually low (<30). Verify race time entry.')
  } else if (vdot > 85) {
    warnings.push('VDOT unusually high (>85). World-class level - verify data.')
  }

  // Check if training volume matches VDOT level
  if (vdot >= 65 && weeklyKm < 70) {
    warnings.push('VDOT 65+ typically requires 70+ km/week. Current volume may limit performance.')
  } else if (vdot >= 55 && weeklyKm < 50) {
    warnings.push('VDOT 55+ typically requires 50+ km/week. Consider increasing volume.')
  } else if (vdot < 45 && weeklyKm > 80) {
    warnings.push('High training volume relative to performance. Focus on quality over quantity.')
  }

  return {
    valid: vdot >= 25 && vdot <= 90,
    warnings
  }
}
