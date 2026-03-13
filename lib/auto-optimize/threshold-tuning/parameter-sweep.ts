/**
 * Parameter Sweep Engine
 *
 * Evaluates threshold detection configurations against the gold standard
 * dataset. Pure computation — no AI, no DB, no network.
 */

import type {
  ThresholdTuningConfig,
  GoldStandardCase,
  CaseResult,
  SweepResult,
  SweepMetrics,
  SweepRunSummary,
} from './types'
import type { AthleteProfile } from '@/lib/calculations/elite-threshold-detection'
import { GOLD_STANDARD_CASES } from './gold-standard'
import { DEFAULT_CONFIG, generateParameterGrid, runFullDetectionWithConfig } from './tunable-config'

// ── Main Entry Point ────────────────────────────────────────────────

/**
 * Run a full parameter sweep across all configurations and gold standard cases.
 *
 * @returns Summary with best overall config and best per-profile configs
 */
export function runParameterSweep(options?: {
  configs?: ThresholdTuningConfig[]
  cases?: GoldStandardCase[]
}): SweepRunSummary {
  const startTime = Date.now()
  const configs = options?.configs ?? generateParameterGrid()
  const cases = options?.cases ?? GOLD_STANDARD_CASES

  let bestOverall: SweepResult | null = null
  const profileBests: Record<string, SweepResult> = {}
  const profileTypes: AthleteProfile['type'][] = ['ELITE_FLAT', 'STANDARD', 'RECREATIONAL']

  for (const config of configs) {
    // Evaluate against all cases
    const result = evaluateConfig(config, cases)

    if (!bestOverall || result.metrics.combinedScore > bestOverall.metrics.combinedScore) {
      bestOverall = result
    }

    // Per-profile evaluation
    for (const profileType of profileTypes) {
      const profileCases = cases.filter(c => c.profileType === profileType)
      if (profileCases.length === 0) continue

      const profileResult = evaluateConfig(config, profileCases, profileType)
      const key = profileType

      if (!profileBests[key] || profileResult.metrics.combinedScore > profileBests[key].metrics.combinedScore) {
        profileBests[key] = profileResult
      }
    }
  }

  const durationMs = Date.now() - startTime

  return {
    id: `sweep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    configsTested: configs.length,
    bestConfig: bestOverall?.config ?? DEFAULT_CONFIG,
    bestScore: bestOverall?.metrics.combinedScore ?? 0,
    profileResults: Object.fromEntries(
      Object.entries(profileBests).map(([key, result]) => [
        key,
        {
          bestConfig: result.config,
          bestScore: result.metrics.combinedScore,
          metrics: result.metrics,
        },
      ])
    ),
    durationMs,
  }
}

// ── Config Evaluation ───────────────────────────────────────────────

/**
 * Evaluate a single config against a set of gold standard cases.
 */
export function evaluateConfig(
  config: ThresholdTuningConfig,
  cases: GoldStandardCase[],
  profileType: AthleteProfile['type'] | 'ALL' = 'ALL'
): SweepResult {
  const caseResults: CaseResult[] = []

  for (const testCase of cases) {
    const result = evaluateCase(config, testCase)
    caseResults.push(result)
  }

  const metrics = computeMetrics(caseResults)

  return { config, profileType, metrics, caseResults }
}

/**
 * Evaluate a single config against a single gold standard case.
 */
function evaluateCase(
  config: ThresholdTuningConfig,
  testCase: GoldStandardCase
): CaseResult {
  try {
    const detection = runFullDetectionWithConfig(testCase.data, config)

    const lt1Error = detection.lt1
      ? Math.abs(detection.lt1.intensity - testCase.expectedLT1.intensity)
      : null

    const lt2Error = detection.lt2
      ? Math.abs(detection.lt2.intensity - testCase.expectedLT2.intensity)
      : null

    const lt1Hit = lt1Error !== null && lt1Error <= testCase.expectedLT1.toleranceIntensity
    const lt2Hit = lt2Error !== null && lt2Error <= testCase.expectedLT2.toleranceIntensity

    return {
      caseId: testCase.id,
      profileType: testCase.profileType,
      lt1Predicted: detection.lt1
        ? { intensity: detection.lt1.intensity, lactate: detection.lt1.lactate }
        : null,
      lt2Predicted: detection.lt2
        ? { intensity: detection.lt2.intensity, lactate: detection.lt2.lactate }
        : null,
      lt1Error,
      lt2Error,
      lt1Hit,
      lt2Hit,
      algorithmUsed: [detection.lt1?.method, detection.lt2?.method].filter(Boolean).join(' + '),
    }
  } catch {
    return {
      caseId: testCase.id,
      profileType: testCase.profileType,
      lt1Predicted: null,
      lt2Predicted: null,
      lt1Error: null,
      lt2Error: null,
      lt1Hit: false,
      lt2Hit: false,
      algorithmUsed: 'ERROR',
    }
  }
}

// ── Metrics Computation ─────────────────────────────────────────────

/**
 * Compute sweep metrics from case results.
 *
 * Combined score formula (0-100):
 * - LT2 within 0.5 units: 40% weight (most important for training zones)
 * - LT1 within 0.5 units: 20% weight
 * - LT2 accuracy (inverse MAE): 25% weight
 * - LT1 accuracy (inverse MAE): 15% weight
 */
export function computeMetrics(results: CaseResult[]): SweepMetrics {
  const casesEvaluated = results.length
  if (casesEvaluated === 0) {
    return {
      lt1MeanAbsoluteError: Infinity,
      lt2MeanAbsoluteError: Infinity,
      lt1Within05: 0,
      lt2Within05: 0,
      lt1Within10: 0,
      lt2Within10: 0,
      combinedScore: 0,
      casesEvaluated: 0,
    }
  }

  // LT1 errors
  const lt1Errors = results.map(r => r.lt1Error).filter((e): e is number => e !== null)
  const lt1MAE = lt1Errors.length > 0
    ? lt1Errors.reduce((s, e) => s + e, 0) / lt1Errors.length
    : Infinity

  // LT2 errors
  const lt2Errors = results.map(r => r.lt2Error).filter((e): e is number => e !== null)
  const lt2MAE = lt2Errors.length > 0
    ? lt2Errors.reduce((s, e) => s + e, 0) / lt2Errors.length
    : Infinity

  // Hit rates (within tolerance — uses per-case tolerance already computed)
  const lt1Hits = results.filter(r => r.lt1Hit).length
  const lt2Hits = results.filter(r => r.lt2Hit).length

  // Within fixed thresholds (0.5 and 1.0 intensity units)
  const lt1Within05 = lt1Errors.length > 0
    ? (lt1Errors.filter(e => e <= 0.5).length / lt1Errors.length) * 100
    : 0
  const lt2Within05 = lt2Errors.length > 0
    ? (lt2Errors.filter(e => e <= 0.5).length / lt2Errors.length) * 100
    : 0
  const lt1Within10 = lt1Errors.length > 0
    ? (lt1Errors.filter(e => e <= 1.0).length / lt1Errors.length) * 100
    : 0
  const lt2Within10 = lt2Errors.length > 0
    ? (lt2Errors.filter(e => e <= 1.0).length / lt2Errors.length) * 100
    : 0

  // Combined score (0-100)
  // Use a reasonable max intensity range for normalization
  const maxRange = 10 // ~10 km/h or 100W range
  const lt2AccuracyScore = Math.max(0, 1 - lt2MAE / maxRange) * 100
  const lt1AccuracyScore = Math.max(0, 1 - lt1MAE / maxRange) * 100

  const combinedScore =
    (lt2Within05 / 100) * 40 +
    (lt1Within05 / 100) * 20 +
    (lt2AccuracyScore / 100) * 25 +
    (lt1AccuracyScore / 100) * 15

  return {
    lt1MeanAbsoluteError: parseFloat(lt1MAE.toFixed(3)),
    lt2MeanAbsoluteError: parseFloat(lt2MAE.toFixed(3)),
    lt1Within05: parseFloat(lt1Within05.toFixed(1)),
    lt2Within05: parseFloat(lt2Within05.toFixed(1)),
    lt1Within10: parseFloat(lt1Within10.toFixed(1)),
    lt2Within10: parseFloat(lt2Within10.toFixed(1)),
    combinedScore: parseFloat(combinedScore.toFixed(2)),
    casesEvaluated,
  }
}
