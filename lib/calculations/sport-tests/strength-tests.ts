/**
 * Strength Test Calculations
 *
 * Formulas for 1RM estimation, relative strength, and strength ratios.
 */

export type OneRepMaxFormula = 'EPLEY' | 'BRZYCKI' | 'LANDER' | 'LOMBARDI' | 'OCONNER'

export type StrengthExercise =
  | 'BENCH_PRESS'
  | 'SQUAT'
  | 'DEADLIFT'
  | 'LEG_PRESS'
  | 'OVERHEAD_PRESS'

export interface StrengthResult {
  exercise: StrengthExercise
  oneRepMax: number
  relativeStrength: number // ratio to body weight
  tier: 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
}

/**
 * Estimate 1RM from submaximal lift using various formulas
 *
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions completed
 * @param formula - Formula to use (default: EPLEY)
 * @returns Estimated 1RM in kg
 */
export function estimateOneRepMax(
  weight: number,
  reps: number,
  formula: OneRepMaxFormula = 'EPLEY'
): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight

  let oneRM: number

  switch (formula) {
    case 'EPLEY':
      // Epley: 1RM = weight × (1 + reps/30)
      oneRM = weight * (1 + reps / 30)
      break

    case 'BRZYCKI':
      // Brzycki: 1RM = weight × (36 / (37 - reps))
      if (reps >= 37) return weight * 2 // Avoid division by zero/negative
      oneRM = weight * (36 / (37 - reps))
      break

    case 'LANDER':
      // Lander: 1RM = 100 × weight / (101.3 - 2.67123 × reps)
      const landerDenom = 101.3 - 2.67123 * reps
      if (landerDenom <= 0) return weight * 2
      oneRM = (100 * weight) / landerDenom
      break

    case 'LOMBARDI':
      // Lombardi: 1RM = weight × reps^0.1
      oneRM = weight * Math.pow(reps, 0.1)
      break

    case 'OCONNER':
      // O'Conner: 1RM = weight × (1 + 0.025 × reps)
      oneRM = weight * (1 + 0.025 * reps)
      break

    default:
      oneRM = weight * (1 + reps / 30) // Default to Epley
  }

  return Math.round(oneRM * 10) / 10
}

/**
 * Calculate weight for target reps based on 1RM
 *
 * @param oneRepMax - 1RM in kg
 * @param targetReps - Target number of repetitions
 * @param formula - Formula to use (default: EPLEY)
 * @returns Weight for target reps in kg
 */
export function calculateWeightForReps(
  oneRepMax: number,
  targetReps: number,
  formula: OneRepMaxFormula = 'EPLEY'
): number {
  if (targetReps <= 0 || oneRepMax <= 0) return 0
  if (targetReps === 1) return oneRepMax

  let weight: number

  switch (formula) {
    case 'EPLEY':
      // weight = 1RM / (1 + reps/30)
      weight = oneRepMax / (1 + targetReps / 30)
      break

    case 'BRZYCKI':
      // weight = 1RM × (37 - reps) / 36
      weight = oneRepMax * (37 - targetReps) / 36
      break

    default:
      weight = oneRepMax / (1 + targetReps / 30)
  }

  return Math.round(weight * 10) / 10
}

/**
 * Calculate relative strength (weight lifted / body weight)
 *
 * @param weightLifted - Weight lifted in kg
 * @param bodyWeight - Body weight in kg
 * @returns Relative strength ratio
 */
export function calculateRelativeStrength(
  weightLifted: number,
  bodyWeight: number
): number {
  if (bodyWeight <= 0) return 0
  return Math.round((weightLifted / bodyWeight) * 100) / 100
}

/**
 * Classify strength performance based on exercise and relative strength
 *
 * @param exercise - Type of exercise
 * @param relativeStrength - Relative strength (1RM / bodyweight)
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyStrength(
  exercise: StrengthExercise,
  relativeStrength: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // Relative strength standards (ratio to body weight)
  const standards: Record<
    StrengthExercise,
    { male: number[]; female: number[] }
  > = {
    BENCH_PRESS: {
      male: [1.5, 1.25, 1.0], // Elite > 1.5x BW, Advanced > 1.25x, Intermediate > 1.0x
      female: [1.0, 0.75, 0.5],
    },
    SQUAT: {
      male: [2.0, 1.5, 1.25],
      female: [1.5, 1.0, 0.75],
    },
    DEADLIFT: {
      male: [2.5, 2.0, 1.5],
      female: [2.0, 1.5, 1.0],
    },
    LEG_PRESS: {
      male: [3.5, 2.75, 2.0],
      female: [2.5, 2.0, 1.5],
    },
    OVERHEAD_PRESS: {
      male: [1.0, 0.75, 0.5],
      female: [0.6, 0.45, 0.3],
    },
  }

  const exerciseStandards =
    gender === 'MALE' ? standards[exercise].male : standards[exercise].female

  if (relativeStrength >= exerciseStandards[0]) return 'ELITE'
  if (relativeStrength >= exerciseStandards[1]) return 'ADVANCED'
  if (relativeStrength >= exerciseStandards[2]) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Calculate strength ratios for injury prevention assessment
 *
 * @param squat1RM - Squat 1RM in kg
 * @param bench1RM - Bench press 1RM in kg
 * @param deadlift1RM - Deadlift 1RM in kg
 * @returns Object with strength ratios
 */
export function calculateStrengthRatios(
  squat1RM: number,
  bench1RM: number,
  deadlift1RM: number
): {
  squatToBench: number
  deadliftToSquat: number
  total: number
  ratioAssessment: string
} {
  const squatToBench = bench1RM > 0 ? squat1RM / bench1RM : 0
  const deadliftToSquat = squat1RM > 0 ? deadlift1RM / squat1RM : 0
  const total = squat1RM + bench1RM + deadlift1RM

  // Ideal ratios:
  // Squat should be ~1.25-1.5x Bench
  // Deadlift should be ~1.1-1.25x Squat
  let ratioAssessment = 'Balanserad'

  if (squatToBench < 1.1) {
    ratioAssessment = 'Svag underkropp relativt överkropp'
  } else if (squatToBench > 1.8) {
    ratioAssessment = 'Svag överkropp relativt underkropp'
  }

  if (deadliftToSquat < 0.95) {
    ratioAssessment = 'Svag bakre kedja (posterior chain)'
  } else if (deadliftToSquat > 1.4) {
    ratioAssessment = 'Stark bakre kedja, fokusera på quad-styrka'
  }

  return {
    squatToBench: Math.round(squatToBench * 100) / 100,
    deadliftToSquat: Math.round(deadliftToSquat * 100) / 100,
    total: Math.round(total),
    ratioAssessment,
  }
}

/**
 * Calculate Wilks score for powerlifting comparison
 *
 * @param total - Powerlifting total (squat + bench + deadlift) in kg
 * @param bodyWeight - Body weight in kg
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Wilks score
 */
export function calculateWilksScore(
  total: number,
  bodyWeight: number,
  gender: 'MALE' | 'FEMALE'
): number {
  // Wilks coefficients
  const coefficients = {
    MALE: {
      a: -216.0475144,
      b: 16.2606339,
      c: -0.002388645,
      d: -0.00113732,
      e: 7.01863e-6,
      f: -1.291e-8,
    },
    FEMALE: {
      a: 594.31747775582,
      b: -27.23842536447,
      c: 0.82112226871,
      d: -0.00930733913,
      e: 4.731582e-5,
      f: -9.054e-8,
    },
  }

  const c = coefficients[gender]
  const x = bodyWeight

  const coeff =
    500 /
    (c.a +
      c.b * x +
      c.c * Math.pow(x, 2) +
      c.d * Math.pow(x, 3) +
      c.e * Math.pow(x, 4) +
      c.f * Math.pow(x, 5))

  return Math.round(total * coeff * 100) / 100
}

/**
 * Get training weight recommendations based on 1RM
 *
 * @param oneRepMax - 1RM in kg
 * @returns Object with recommended weights for different rep ranges
 */
export function getTrainingWeights(oneRepMax: number): {
  strength: { reps: string; weight: number; percentage: number }
  hypertrophy: { reps: string; weight: number; percentage: number }
  endurance: { reps: string; weight: number; percentage: number }
} {
  return {
    strength: {
      reps: '3-5',
      weight: Math.round(oneRepMax * 0.85),
      percentage: 85,
    },
    hypertrophy: {
      reps: '8-12',
      weight: Math.round(oneRepMax * 0.7),
      percentage: 70,
    },
    endurance: {
      reps: '15-20',
      weight: Math.round(oneRepMax * 0.55),
      percentage: 55,
    },
  }
}
