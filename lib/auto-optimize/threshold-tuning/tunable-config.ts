/**
 * Tunable Config & Parameterized Wrappers
 *
 * Extracts hardcoded constants from the existing threshold detection code
 * into a configuration object. Provides wrapper functions that run the
 * same algorithms with tunable parameters.
 *
 * IMPORTANT: Does NOT modify the existing algorithm files. Instead,
 * re-implements only the parameterized decision logic while delegating
 * heavy computation to existing exports.
 */

import { fitPolynomial3 } from '@/lib/training-engine/utils/polynomial-fit'
import { interpolateHeartRate } from '@/lib/training-engine/utils/interpolation'
import {
  calculateLogLogThreshold,
  preprocessData,
  type LactateDataPoint,
  type AthleteProfile,
} from '@/lib/calculations/elite-threshold-detection'
import type { ThresholdTuningConfig, DetectionResult } from './types'

// ── Default Configuration (matches current hardcoded values) ────────

export const DEFAULT_CONFIG: ThresholdTuningConfig = {
  dmax: {
    r2MinFallback: 0.90,
  },
  bishopModDmax: {
    riseThreshold: 0.4,
    r2MinFallback: 0.90,
  },
  baselinePlus: {
    eliteDelta: 0.3,
    standardDelta: 0.5,
    recreationalDelta: 1.0,
  },
  eliteClassification: {
    traditionalBaselineMax: 1.5,
    traditionalSlopeMax: 0.05,
    highRangeLactateMin: 3.5,
    veryLowBaselineMax: 1.2,
    veryLowSlopeMax: 0.10,
  },
  ensemble: {
    logLogWeight: 0.70,
    baselinePlusWeight: 0.30,
    divergenceThreshold: 1.5,
  },
}

// ── Parameter Grid Generation ───────────────────────────────────────

/**
 * Generate a parameter grid for sweep.
 * Uses coordinate-descent style: vary one dimension at a time from defaults,
 * plus a Latin-hypercube-inspired set of combined variations.
 */
export function generateParameterGrid(): ThresholdTuningConfig[] {
  const configs: ThresholdTuningConfig[] = []

  // Always include default
  configs.push(structuredClone(DEFAULT_CONFIG))

  // Sweep Bishop rise threshold
  for (const rise of [0.2, 0.3, 0.5, 0.6]) {
    const c = structuredClone(DEFAULT_CONFIG)
    c.bishopModDmax.riseThreshold = rise
    configs.push(c)
  }

  // Sweep R² minimums
  for (const r2 of [0.85, 0.88, 0.92, 0.95]) {
    const c = structuredClone(DEFAULT_CONFIG)
    c.dmax.r2MinFallback = r2
    c.bishopModDmax.r2MinFallback = r2
    configs.push(c)
  }

  // Sweep baseline plus deltas
  for (const eliteDelta of [0.2, 0.4, 0.5]) {
    for (const standardDelta of [0.4, 0.6, 0.7]) {
      const c = structuredClone(DEFAULT_CONFIG)
      c.baselinePlus.eliteDelta = eliteDelta
      c.baselinePlus.standardDelta = standardDelta
      configs.push(c)
    }
  }

  // Sweep recreational delta
  for (const recDelta of [0.8, 1.2, 1.5]) {
    const c = structuredClone(DEFAULT_CONFIG)
    c.baselinePlus.recreationalDelta = recDelta
    configs.push(c)
  }

  // Sweep elite classification thresholds
  for (const baselineMax of [1.3, 1.7]) {
    for (const rangeMin of [3.0, 4.0]) {
      const c = structuredClone(DEFAULT_CONFIG)
      c.eliteClassification.traditionalBaselineMax = baselineMax
      c.eliteClassification.highRangeLactateMin = rangeMin
      configs.push(c)
    }
  }

  // Sweep ensemble weights
  for (const logLogW of [0.5, 0.6, 0.8, 0.9]) {
    const c = structuredClone(DEFAULT_CONFIG)
    c.ensemble.logLogWeight = logLogW
    c.ensemble.baselinePlusWeight = 1.0 - logLogW
    configs.push(c)
  }

  // Sweep divergence threshold
  for (const div of [1.0, 2.0, 2.5]) {
    const c = structuredClone(DEFAULT_CONFIG)
    c.ensemble.divergenceThreshold = div
    configs.push(c)
  }

  // Combined variations (Latin-hypercube-inspired)
  const combos = [
    { rise: 0.3, r2: 0.88, eliteDelta: 0.2, logLogW: 0.8 },
    { rise: 0.5, r2: 0.92, eliteDelta: 0.4, logLogW: 0.6 },
    { rise: 0.3, r2: 0.85, eliteDelta: 0.3, logLogW: 0.7 },
    { rise: 0.4, r2: 0.90, eliteDelta: 0.2, logLogW: 0.9 },
    { rise: 0.6, r2: 0.88, eliteDelta: 0.5, logLogW: 0.5 },
    { rise: 0.2, r2: 0.92, eliteDelta: 0.3, logLogW: 0.8 },
    { rise: 0.3, r2: 0.90, eliteDelta: 0.4, logLogW: 0.6 },
    { rise: 0.5, r2: 0.85, eliteDelta: 0.2, logLogW: 0.7 },
  ]
  for (const combo of combos) {
    const c = structuredClone(DEFAULT_CONFIG)
    c.bishopModDmax.riseThreshold = combo.rise
    c.dmax.r2MinFallback = combo.r2
    c.bishopModDmax.r2MinFallback = combo.r2
    c.baselinePlus.eliteDelta = combo.eliteDelta
    c.ensemble.logLogWeight = combo.logLogW
    c.ensemble.baselinePlusWeight = 1.0 - combo.logLogW
    configs.push(c)
  }

  return configs
}

// ── Parameterized Wrappers ──────────────────────────────────────────

/**
 * Classify athlete profile with configurable thresholds.
 * Re-implements classifyAthleteProfile logic with tunable params.
 */
export function classifyAthleteProfileWithConfig(
  data: LactateDataPoint[],
  config: ThresholdTuningConfig
): AthleteProfile {
  if (data.length < 4) {
    return {
      type: 'STANDARD',
      baselineAvg: data[0]?.lactate || 1.5,
      baselineSlope: 0,
      maxLactate: Math.max(...data.map(d => d.lactate)),
      lactateRange: 0,
    }
  }

  const baselineCount = Math.max(2, Math.floor(data.length * 0.4))
  const baselineData = data.slice(0, baselineCount)
  const sortedBaseline = [...baselineData].sort((a, b) => a.lactate - b.lactate)
  const trimmedBaseline = sortedBaseline.slice(0, -1)
  const baselineAvg = trimmedBaseline.reduce((s, d) => s + d.lactate, 0) / trimmedBaseline.length

  const firstPoint = baselineData[0]
  const lastBaselinePoint = baselineData[baselineData.length - 1]
  const baselineSlope = (lastBaselinePoint.lactate - firstPoint.lactate) /
    (lastBaselinePoint.intensity - firstPoint.intensity)

  const maxLactate = Math.max(...data.map(d => d.lactate))
  const lactateRange = maxLactate - baselineAvg

  const ec = config.eliteClassification
  const traditionalElite = baselineAvg < ec.traditionalBaselineMax && Math.abs(baselineSlope) < ec.traditionalSlopeMax
  const highRangeElite = baselineAvg < ec.traditionalBaselineMax && lactateRange > ec.highRangeLactateMin && data.length >= 6
  const veryLowBaseline = baselineAvg < ec.veryLowBaselineMax && Math.abs(baselineSlope) < ec.veryLowSlopeMax

  let type: AthleteProfile['type']
  if (traditionalElite || highRangeElite || veryLowBaseline) {
    type = 'ELITE_FLAT'
  } else if (baselineAvg < 2.5 && Math.abs(baselineSlope) < 0.15) {
    type = 'STANDARD'
  } else {
    type = 'RECREATIONAL'
  }

  return { type, baselineAvg, baselineSlope, maxLactate, lactateRange }
}

/**
 * Baseline Plus threshold with configurable delta values.
 */
export function calculateBaselinePlusWithConfig(
  data: LactateDataPoint[],
  profile: AthleteProfile,
  config: ThresholdTuningConfig
): { intensity: number; lactate: number; heartRate: number; method: string } | null {
  if (data.length < 4) return null

  const baselineCount = Math.max(2, Math.floor(data.length * 0.4))
  const baselineData = data.slice(0, baselineCount)
  const sortedBaseline = [...baselineData].sort((a, b) => a.lactate - b.lactate)
  const trimmedBaseline = sortedBaseline.slice(0, -1)
  const baseline = trimmedBaseline.reduce((s, d) => s + d.lactate, 0) / trimmedBaseline.length

  let delta: number
  switch (profile.type) {
    case 'ELITE_FLAT': delta = config.baselinePlus.eliteDelta; break
    case 'STANDARD': delta = config.baselinePlus.standardDelta; break
    default: delta = config.baselinePlus.recreationalDelta; break
  }

  const threshold = baseline + delta

  // Scan for crossing with confirmation
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].lactate > threshold && data[i + 1].lactate > threshold) {
      const belowIndex = Math.max(0, i - 1)
      const below = data[belowIndex]
      const above = data[i]

      if (below.lactate < threshold && above.lactate > threshold && above.lactate !== below.lactate) {
        const ratio = (threshold - below.lactate) / (above.lactate - below.lactate)
        return {
          intensity: below.intensity + ratio * (above.intensity - below.intensity),
          lactate: threshold,
          heartRate: below.heartRate + ratio * (above.heartRate - below.heartRate),
          method: `BASELINE_PLUS_${delta}`,
        }
      }
      return {
        intensity: below.intensity,
        lactate: below.lactate,
        heartRate: below.heartRate,
        method: `BASELINE_PLUS_${delta}`,
      }
    }
  }

  // Closest point fallback
  let closestIdx = 0
  let closestDiff = Infinity
  for (let i = 0; i < data.length; i++) {
    const diff = Math.abs(data[i].lactate - threshold)
    if (diff < closestDiff) { closestDiff = diff; closestIdx = i }
  }
  return {
    intensity: data[closestIdx].intensity,
    lactate: data[closestIdx].lactate,
    heartRate: data[closestIdx].heartRate,
    method: `BASELINE_PLUS_${delta}_ESTIMATED`,
  }
}

/**
 * Modified D-max (Bishop) with configurable rise threshold.
 * Re-implements rise detection with parameterized threshold,
 * delegates polynomial fit to existing fitPolynomial3.
 */
export function calculateModDmaxWithConfig(
  data: LactateDataPoint[],
  config: ThresholdTuningConfig
): { intensity: number; lactate: number; heartRate: number; method: string; r2: number } | null {
  if (data.length < 4) return null

  const intensities = data.map(d => d.intensity)
  const lactates = data.map(d => d.lactate)
  const heartRates = data.map(d => d.heartRate)

  // Robust baseline (trimmed mean of first 40%)
  const baselineCount = Math.max(2, Math.floor(lactates.length * 0.4))
  const baselineValues = lactates.slice(0, baselineCount)
  const sorted = [...baselineValues].sort((a, b) => a - b)
  const trimmed = sorted.slice(0, -1)
  const baselineAvg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length

  // Find first rise using configurable threshold
  const riseThreshold = config.bishopModDmax.riseThreshold
  let firstRiseIndex = -1
  for (let i = 0; i < lactates.length; i++) {
    if (lactates[i] >= baselineAvg + riseThreshold) {
      firstRiseIndex = i
      break
    }
  }

  let modifiedStartIndex: number
  if (firstRiseIndex === -1) {
    modifiedStartIndex = Math.floor(lactates.length / 2)
  } else if (firstRiseIndex === 0) {
    modifiedStartIndex = 0
  } else {
    modifiedStartIndex = firstRiseIndex - 1
  }

  // Fit polynomial
  const regression = fitPolynomial3(intensities, lactates)
  const { coefficients, r2 } = regression

  if (r2 < config.bishopModDmax.r2MinFallback) {
    return null // Poor fit
  }

  // Modified baseline: from modified start to last point
  const x1 = intensities[modifiedStartIndex]
  const y1 = lactates[modifiedStartIndex]
  const x2 = intensities[intensities.length - 1]
  const y2 = lactates[lactates.length - 1]

  const slope = (y2 - y1) / (x2 - x1)
  const intercept = y1 - slope * x1

  // Find max perpendicular distance
  let maxDist = 0
  let bestX = x1
  let bestY = 0
  const numSamples = 1000
  const step = (x2 - x1) / numSamples

  for (let i = 0; i <= numSamples; i++) {
    const x = x1 + i * step
    const yCurve = coefficients.a * x ** 3 + coefficients.b * x ** 2 + coefficients.c * x + coefficients.d
    const yBase = slope * x + intercept
    const dist = Math.abs(yCurve - yBase) / Math.sqrt(1 + slope * slope)
    if (dist > maxDist) {
      maxDist = dist
      bestX = x
      bestY = yCurve
    }
  }

  const hr = interpolateHeartRate(intensities, heartRates, bestX)

  return {
    intensity: parseFloat(bestX.toFixed(2)),
    lactate: parseFloat(bestY.toFixed(2)),
    heartRate: Math.round(hr),
    method: 'MOD_DMAX',
    r2: parseFloat(r2.toFixed(4)),
  }
}

/**
 * Standard D-max with configurable R² threshold.
 */
export function calculateDmaxWithConfig(
  data: LactateDataPoint[],
  config: ThresholdTuningConfig
): { intensity: number; lactate: number; heartRate: number; method: string; r2: number } | null {
  if (data.length < 4) return null

  const intensities = data.map(d => d.intensity)
  const lactates = data.map(d => d.lactate)
  const heartRates = data.map(d => d.heartRate)

  const regression = fitPolynomial3(intensities, lactates)
  const { coefficients, r2 } = regression

  if (r2 < config.dmax.r2MinFallback) {
    return null
  }

  const x1 = intensities[0]
  const y1 = lactates[0]
  const x2 = intensities[intensities.length - 1]
  const y2 = lactates[lactates.length - 1]

  const slope = (y2 - y1) / (x2 - x1)
  const intercept = y1 - slope * x1

  let maxDist = 0
  let bestX = x1
  let bestY = 0
  const numSamples = 1000
  const step = (x2 - x1) / numSamples

  for (let i = 0; i <= numSamples; i++) {
    const x = x1 + i * step
    const yCurve = coefficients.a * x ** 3 + coefficients.b * x ** 2 + coefficients.c * x + coefficients.d
    const yBase = slope * x + intercept
    const dist = Math.abs(yCurve - yBase) / Math.sqrt(1 + slope * slope)
    if (dist > maxDist) {
      maxDist = dist
      bestX = x
      bestY = yCurve
    }
  }

  const hr = interpolateHeartRate(intensities, heartRates, bestX)

  return {
    intensity: parseFloat(bestX.toFixed(2)),
    lactate: parseFloat(bestY.toFixed(2)),
    heartRate: Math.round(hr),
    method: 'DMAX',
    r2: parseFloat(r2.toFixed(4)),
  }
}

/**
 * Ensemble detection with configurable weights and divergence threshold.
 * Combines Log-Log + Baseline Plus for LT1, Modified D-max for LT2.
 */
export function runFullDetectionWithConfig(
  data: LactateDataPoint[],
  config: ThresholdTuningConfig
): DetectionResult {
  // Preprocess (elevated baseline correction)
  const processed = preprocessData(data)

  // Classify profile
  const profile = classifyAthleteProfileWithConfig(processed, config)

  // ── LT1 Detection ──────────────────────────────────────────────

  let lt1: DetectionResult['lt1'] = null

  if (profile.type === 'ELITE_FLAT') {
    // Use Log-Log (existing, no tunable params in that algorithm)
    const logLogResult = calculateLogLogThreshold(processed)
    const baselinePlusResult = calculateBaselinePlusWithConfig(processed, profile, config)

    if (logLogResult && baselinePlusResult) {
      const divergence = Math.abs(logLogResult.intensity - baselinePlusResult.intensity)

      if (divergence <= config.ensemble.divergenceThreshold) {
        lt1 = {
          intensity: logLogResult.intensity,
          lactate: logLogResult.lactate,
          heartRate: logLogResult.heartRate,
          method: 'LOG_LOG',
        }
      } else {
        const w1 = config.ensemble.logLogWeight
        const w2 = config.ensemble.baselinePlusWeight
        const weightedIntensity = w1 * logLogResult.intensity + w2 * baselinePlusResult.intensity
        const weightedLactate = interpolateLactate(processed, weightedIntensity)
        const weightedHR = interpolateHR(processed, weightedIntensity)

        lt1 = {
          intensity: weightedIntensity,
          lactate: weightedLactate,
          heartRate: weightedHR,
          method: 'ENSEMBLE_WEIGHTED',
        }
      }
    } else if (logLogResult) {
      lt1 = {
        intensity: logLogResult.intensity,
        lactate: logLogResult.lactate,
        heartRate: logLogResult.heartRate,
        method: 'LOG_LOG',
      }
    } else if (baselinePlusResult) {
      lt1 = {
        intensity: baselinePlusResult.intensity,
        lactate: baselinePlusResult.lactate,
        heartRate: baselinePlusResult.heartRate,
        method: baselinePlusResult.method,
      }
    }
  } else {
    // Standard/Recreational: use baseline plus
    const bpResult = calculateBaselinePlusWithConfig(processed, profile, config)
    if (bpResult) {
      lt1 = {
        intensity: bpResult.intensity,
        lactate: bpResult.lactate,
        heartRate: bpResult.heartRate,
        method: bpResult.method,
      }
    }
  }

  // ── LT2 Detection ──────────────────────────────────────────────

  let lt2: DetectionResult['lt2'] = null

  if (profile.type === 'ELITE_FLAT') {
    // Use Bishop Modified D-max for elite
    const modDmax = calculateModDmaxWithConfig(processed, config)
    if (modDmax) {
      lt2 = {
        intensity: modDmax.intensity,
        lactate: modDmax.lactate,
        heartRate: modDmax.heartRate,
        method: 'MOD_DMAX',
      }
    }
  }

  // Try standard D-max for LT2 if not found
  if (!lt2) {
    const dmax = calculateDmaxWithConfig(processed, config)
    if (dmax) {
      lt2 = {
        intensity: dmax.intensity,
        lactate: dmax.lactate,
        heartRate: dmax.heartRate,
        method: 'DMAX',
      }
    }
  }

  // Fallback: 4.0 mmol/L crossing
  if (!lt2) {
    lt2 = find4mmolCrossing(processed)
  }

  return { lt1, lt2, profileType: profile.type }
}

// ── Helpers ─────────────────────────────────────────────────────────

function interpolateLactate(data: LactateDataPoint[], targetIntensity: number): number {
  if (targetIntensity <= data[0].intensity) return data[0].lactate
  if (targetIntensity >= data[data.length - 1].intensity) return data[data.length - 1].lactate
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].intensity <= targetIntensity && data[i + 1].intensity >= targetIntensity) {
      const ratio = (targetIntensity - data[i].intensity) / (data[i + 1].intensity - data[i].intensity)
      return data[i].lactate + ratio * (data[i + 1].lactate - data[i].lactate)
    }
  }
  return data[data.length - 1].lactate
}

function interpolateHR(data: LactateDataPoint[], targetIntensity: number): number {
  if (targetIntensity <= data[0].intensity) return data[0].heartRate
  if (targetIntensity >= data[data.length - 1].intensity) return data[data.length - 1].heartRate
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].intensity <= targetIntensity && data[i + 1].intensity >= targetIntensity) {
      const ratio = (targetIntensity - data[i].intensity) / (data[i + 1].intensity - data[i].intensity)
      return data[i].heartRate + ratio * (data[i + 1].heartRate - data[i].heartRate)
    }
  }
  return data[data.length - 1].heartRate
}

function find4mmolCrossing(
  data: LactateDataPoint[]
): { intensity: number; lactate: number; heartRate: number; method: string } | null {
  for (let i = 1; i < data.length; i++) {
    if (data[i].lactate >= 4.0 && data[i - 1].lactate < 4.0) {
      const ratio = (4.0 - data[i - 1].lactate) / (data[i].lactate - data[i - 1].lactate)
      return {
        intensity: parseFloat((data[i - 1].intensity + ratio * (data[i].intensity - data[i - 1].intensity)).toFixed(2)),
        lactate: 4.0,
        heartRate: Math.round(data[i - 1].heartRate + ratio * (data[i].heartRate - data[i - 1].heartRate)),
        method: 'FIXED_4MMOL',
      }
    }
  }
  return null
}
