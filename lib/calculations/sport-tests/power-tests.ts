/**
 * Power Test Calculations
 *
 * Formulas for vertical jump power, reactive strength, and peak power tests.
 */

export type JumpPowerFormula = 'SAYERS' | 'LEWIS' | 'HARMAN'

/**
 * Calculate peak power from vertical jump using various formulas
 *
 * @param jumpHeight - Jump height in centimeters
 * @param bodyWeight - Body weight in kilograms
 * @param formula - Formula to use (default: SAYERS)
 * @returns Object with peakPower (W) and relativePower (W/kg)
 */
export function calculateJumpPower(
  jumpHeight: number,
  bodyWeight: number,
  formula: JumpPowerFormula = 'SAYERS'
): { peakPower: number; relativePower: number } {
  let peakPower: number

  switch (formula) {
    case 'SAYERS':
      // Sayers et al. (1999) - Most commonly used
      // Power (W) = 60.7 × jump height (cm) + 45.3 × body mass (kg) − 2055
      peakPower = 60.7 * jumpHeight + 45.3 * bodyWeight - 2055
      break

    case 'LEWIS':
      // Lewis (1974) - Classic formula
      // Power (W) = √(4.9 × body mass × √jump height × 9.81)
      peakPower = Math.sqrt(4.9 * bodyWeight) * Math.sqrt(jumpHeight / 100) * 9.81 * bodyWeight
      break

    case 'HARMAN':
      // Harman et al. (1991)
      // Power (W) = 61.9 × jump height (cm) + 36.0 × body mass (kg) + 1822
      peakPower = 61.9 * jumpHeight + 36.0 * bodyWeight + 1822
      break

    default:
      peakPower = 60.7 * jumpHeight + 45.3 * bodyWeight - 2055
  }

  // Ensure non-negative power
  peakPower = Math.max(0, peakPower)

  return {
    peakPower: Math.round(peakPower),
    relativePower: Math.round((peakPower / bodyWeight) * 10) / 10,
  }
}

/**
 * Calculate Reactive Strength Index (RSI) from drop jump
 *
 * RSI = Jump Height / Contact Time
 *
 * @param jumpHeight - Jump height in centimeters (or millimeters if useMillimeters is true)
 * @param contactTime - Ground contact time in milliseconds
 * @param useMillimeters - If true, jumpHeight is in mm (default: false, cm)
 * @returns RSI value (higher is better, typically 1.0-3.0 for trained athletes)
 */
export function calculateRSI(
  jumpHeight: number,
  contactTime: number,
  useMillimeters: boolean = false
): number {
  // Convert to consistent units (mm for height, ms for time)
  const heightMm = useMillimeters ? jumpHeight : jumpHeight * 10

  if (contactTime <= 0) return 0

  // RSI = height (mm) / contact time (ms)
  const rsi = heightMm / contactTime

  return Math.round(rsi * 100) / 100
}

/**
 * Calculate flight time from jump height
 *
 * h = (g × t²) / 8
 * t = √(8h / g)
 *
 * @param jumpHeight - Jump height in centimeters
 * @returns Flight time in milliseconds
 */
export function calculateFlightTime(jumpHeight: number): number {
  const heightMeters = jumpHeight / 100
  const g = 9.81
  const flightTimeSeconds = Math.sqrt((8 * heightMeters) / g)
  return Math.round(flightTimeSeconds * 1000)
}

/**
 * Calculate jump height from flight time
 *
 * h = (g × t²) / 8
 *
 * @param flightTime - Flight time in milliseconds
 * @returns Jump height in centimeters
 */
export function calculateJumpHeightFromFlightTime(flightTime: number): number {
  const flightTimeSeconds = flightTime / 1000
  const g = 9.81
  const heightMeters = (g * flightTimeSeconds * flightTimeSeconds) / 8
  return Math.round(heightMeters * 100 * 10) / 10
}

/**
 * Calculate standing long jump power index
 *
 * Uses body weight and jump distance to estimate lower body power
 *
 * @param jumpDistance - Jump distance in centimeters
 * @param bodyWeight - Body weight in kilograms
 * @returns Power index (arbitrary units, useful for comparison)
 */
export function calculateLongJumpPowerIndex(
  jumpDistance: number,
  bodyWeight: number
): number {
  // Simplified power index based on distance and weight
  // Higher values indicate better explosive power
  const powerIndex = (jumpDistance * bodyWeight) / 100
  return Math.round(powerIndex * 10) / 10
}

/**
 * Classify vertical jump performance by gender
 *
 * @param jumpHeight - Jump height in centimeters
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyVerticalJump(
  jumpHeight: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const thresholds = gender === 'MALE'
    ? { elite: 60, advanced: 50, intermediate: 40 }
    : { elite: 50, advanced: 40, intermediate: 30 }

  if (jumpHeight >= thresholds.elite) return 'ELITE'
  if (jumpHeight >= thresholds.advanced) return 'ADVANCED'
  if (jumpHeight >= thresholds.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Calculate spike jump height (volleyball)
 * Approach jump typically 10-20% higher than standing CMJ
 *
 * @param standingJump - Standing CMJ height in cm
 * @param approachFactor - Approach benefit factor (default: 1.15 = 15% increase)
 * @returns Estimated spike jump height in cm
 */
export function estimateSpikeJumpFromCMJ(
  standingJump: number,
  approachFactor: number = 1.15
): number {
  return Math.round(standingJump * approachFactor)
}

/**
 * Calculate medicine ball throw power (for handball)
 *
 * @param throwDistance - Throw distance in meters
 * @param ballWeight - Ball weight in kg (typically 2 or 3 kg)
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier based on sport-specific benchmarks
 */
export function classifyMedicineBallThrow(
  throwDistance: number,
  ballWeight: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // Benchmarks for 3kg ball (male) and 2kg ball (female)
  const thresholds = gender === 'MALE'
    ? { elite: 14.0, advanced: 12.0, intermediate: 10.0 } // 3kg ball
    : { elite: 11.0, advanced: 9.0, intermediate: 7.0 }   // 2kg ball

  // Adjust for different ball weights
  const adjustedDistance = ballWeight === 3
    ? throwDistance
    : throwDistance * (3 / ballWeight)

  if (gender === 'FEMALE') {
    const femaleAdjusted = ballWeight === 2
      ? throwDistance
      : throwDistance * (2 / ballWeight)

    if (femaleAdjusted >= thresholds.elite) return 'ELITE'
    if (femaleAdjusted >= thresholds.advanced) return 'ADVANCED'
    if (femaleAdjusted >= thresholds.intermediate) return 'INTERMEDIATE'
    return 'BEGINNER'
  }

  if (adjustedDistance >= thresholds.elite) return 'ELITE'
  if (adjustedDistance >= thresholds.advanced) return 'ADVANCED'
  if (adjustedDistance >= thresholds.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}
