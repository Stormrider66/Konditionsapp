/**
 * Threshold Tuning Types
 *
 * Interfaces for the automated parameter optimization of
 * D-max, elite detection, and ensemble threshold algorithms.
 */

import type { LactateDataPoint, AthleteProfile } from '@/lib/calculations/elite-threshold-detection'

// ── Tunable Configuration ───────────────────────────────────────────

export interface ThresholdTuningConfig {
  /** D-max parameters */
  dmax: {
    /** Minimum R² to accept polynomial fit (default: 0.90) */
    r2MinFallback: number
  }
  /** Bishop Modified D-max */
  bishopModDmax: {
    /** Rise above baseline to trigger modified start (default: 0.4 mmol/L) */
    riseThreshold: number
    /** Minimum R² to accept polynomial fit (default: 0.90) */
    r2MinFallback: number
  }
  /** Baseline Plus delta values per profile type */
  baselinePlus: {
    eliteDelta: number        // default: 0.3
    standardDelta: number     // default: 0.5
    recreationalDelta: number // default: 1.0
  }
  /** Elite athlete classification thresholds */
  eliteClassification: {
    traditionalBaselineMax: number  // default: 1.5
    traditionalSlopeMax: number    // default: 0.05
    highRangeLactateMin: number    // default: 3.5
    veryLowBaselineMax: number     // default: 1.2
    veryLowSlopeMax: number        // default: 0.10
  }
  /** Ensemble weighting for combining methods */
  ensemble: {
    logLogWeight: number           // default: 0.70
    baselinePlusWeight: number     // default: 0.30
    divergenceThreshold: number    // default: 1.5 intensity units
  }
}

// ── Gold Standard Dataset ───────────────────────────────────────────

export interface GoldStandardCase {
  id: string
  name: string
  description: string
  profileType: AthleteProfile['type']
  sport: 'RUNNING' | 'CYCLING' | 'SKIING'
  data: LactateDataPoint[]
  expectedLT1: {
    intensity: number
    lactate: number
    toleranceIntensity: number
  }
  expectedLT2: {
    intensity: number
    lactate: number
    toleranceIntensity: number
  }
  source: string
}

// ── Sweep Results ───────────────────────────────────────────────────

export interface CaseResult {
  caseId: string
  profileType: AthleteProfile['type']
  lt1Predicted: { intensity: number; lactate: number } | null
  lt2Predicted: { intensity: number; lactate: number } | null
  lt1Error: number | null
  lt2Error: number | null
  lt1Hit: boolean
  lt2Hit: boolean
  algorithmUsed: string
}

export interface SweepMetrics {
  lt1MeanAbsoluteError: number
  lt2MeanAbsoluteError: number
  lt1Within05: number  // % of cases within 0.5 intensity units
  lt2Within05: number
  lt1Within10: number  // % within 1.0 intensity units
  lt2Within10: number
  combinedScore: number // 0-100 weighted composite
  casesEvaluated: number
}

export interface SweepResult {
  config: ThresholdTuningConfig
  profileType: AthleteProfile['type'] | 'ALL'
  metrics: SweepMetrics
  caseResults: CaseResult[]
}

export interface SweepRunSummary {
  id: string
  timestamp: Date
  configsTested: number
  bestConfig: ThresholdTuningConfig
  bestScore: number
  profileResults: Record<string, {
    bestConfig: ThresholdTuningConfig
    bestScore: number
    metrics: SweepMetrics
  }>
  durationMs: number
}

// ── Detection Result (unified) ──────────────────────────────────────

export interface DetectionResult {
  lt1: { intensity: number; lactate: number; heartRate: number; method: string } | null
  lt2: { intensity: number; lactate: number; heartRate: number; method: string } | null
  profileType: AthleteProfile['type']
}
