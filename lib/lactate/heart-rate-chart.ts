import { fitPolynomial3, type PolynomialCoefficients } from '@/lib/training-engine/utils/polynomial-fit'

export interface LactateHeartRateInput {
  heartRate?: number | null
  lactate?: number | null
}

export interface LactateHeartRatePoint {
  heartRate: number
  lactate: number
}

export type LactateHeartRateFitStatus =
  | 'reliable'
  | 'not_enough_unique_heart_rates'
  | 'fit_failed'
  | 'low_r2'
  | 'implausible_curve'

export interface LactateHeartRateFit {
  coefficients: PolynomialCoefficients | null
  r2: number | null
  curve: LactateHeartRatePoint[]
  status: LactateHeartRateFitStatus
}

const MIN_UNIQUE_POINTS_FOR_POLYNOMIAL = 4
const MIN_RELIABLE_R2 = 0.85
const CURVE_SAMPLE_COUNT = 100

export function getLactateHeartRatePoints(stages: LactateHeartRateInput[]): LactateHeartRatePoint[] {
  return stages
    .filter((stage) => (
      stage.heartRate !== null &&
      stage.heartRate !== undefined &&
      stage.lactate !== null &&
      stage.lactate !== undefined
    ))
    .map((stage) => ({
      heartRate: Number(stage.heartRate),
      lactate: Number(stage.lactate),
    }))
    .filter((point) => (
      Number.isFinite(point.heartRate) &&
      Number.isFinite(point.lactate) &&
      point.heartRate > 0 &&
      point.lactate >= 0
    ))
    .sort((a, b) => a.heartRate - b.heartRate)
}

export function aggregateLactateByHeartRate(points: LactateHeartRatePoint[]): LactateHeartRatePoint[] {
  const byHeartRate = new Map<number, { lactateSum: number; count: number }>()

  points.forEach((point) => {
    const existing = byHeartRate.get(point.heartRate)
    if (existing) {
      existing.lactateSum += point.lactate
      existing.count += 1
    } else {
      byHeartRate.set(point.heartRate, { lactateSum: point.lactate, count: 1 })
    }
  })

  return Array.from(byHeartRate.entries())
    .map(([heartRate, value]) => ({
      heartRate,
      lactate: value.lactateSum / value.count,
    }))
    .sort((a, b) => a.heartRate - b.heartRate)
}

export function buildReliableLactateHeartRateFit(points: LactateHeartRatePoint[]): LactateHeartRateFit {
  const fitPoints = aggregateLactateByHeartRate(points)

  if (fitPoints.length < MIN_UNIQUE_POINTS_FOR_POLYNOMIAL) {
    return {
      coefficients: null,
      r2: null,
      curve: [],
      status: 'not_enough_unique_heart_rates',
    }
  }

  try {
    const heartRates = fitPoints.map((point) => point.heartRate)
    const lactates = fitPoints.map((point) => point.lactate)
    const regression = fitPolynomial3(heartRates, lactates)
    const curve = buildPolynomialCurve(heartRates, regression.coefficients)

    if (regression.r2 < MIN_RELIABLE_R2) {
      return {
        coefficients: regression.coefficients,
        r2: regression.r2,
        curve,
        status: 'low_r2',
      }
    }

    if (!isCurvePhysiologicallyPlausible(curve, lactates)) {
      return {
        coefficients: regression.coefficients,
        r2: regression.r2,
        curve,
        status: 'implausible_curve',
      }
    }

    return {
      coefficients: regression.coefficients,
      r2: regression.r2,
      curve,
      status: 'reliable',
    }
  } catch {
    return {
      coefficients: null,
      r2: null,
      curve: [],
      status: 'fit_failed',
    }
  }
}

function buildPolynomialCurve(heartRates: number[], coefficients: PolynomialCoefficients): LactateHeartRatePoint[] {
  const minHeartRate = Math.min(...heartRates)
  const maxHeartRate = Math.max(...heartRates)
  const heartRateRange = maxHeartRate - minHeartRate

  if (heartRateRange <= 0) {
    return []
  }

  return Array.from({ length: CURVE_SAMPLE_COUNT + 1 }, (_, index) => {
    const heartRate = minHeartRate + (heartRateRange * index) / CURVE_SAMPLE_COUNT
    const lactate =
      coefficients.a * Math.pow(heartRate, 3) +
      coefficients.b * Math.pow(heartRate, 2) +
      coefficients.c * heartRate +
      coefficients.d

    return {
      heartRate: Number(heartRate.toFixed(1)),
      lactate: Number(lactate.toFixed(2)),
    }
  })
}

function isCurvePhysiologicallyPlausible(curve: LactateHeartRatePoint[], observedLactates: number[]): boolean {
  if (curve.length === 0 || observedLactates.length === 0) {
    return false
  }

  const curveLactates = curve.map((point) => point.lactate)
  if (curveLactates.some((lactate) => !Number.isFinite(lactate))) {
    return false
  }

  const minObserved = Math.min(...observedLactates)
  const maxObserved = Math.max(...observedLactates)
  const observedRange = maxObserved - minObserved
  const belowObservedTolerance = Math.max(0.3, observedRange * 0.05)
  const maxAllowedBacktrack = Math.max(0.3, observedRange * 0.1)

  if (Math.min(...curveLactates) < Math.max(0, minObserved - belowObservedTolerance)) {
    return false
  }

  let largestBacktrack = 0
  for (let index = 1; index < curveLactates.length; index++) {
    largestBacktrack = Math.max(largestBacktrack, curveLactates[index - 1] - curveLactates[index])
  }

  return largestBacktrack <= maxAllowedBacktrack
}
