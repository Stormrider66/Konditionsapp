/**
 * Data Moat: Prediction Logging Utility
 *
 * Provides a simple interface for logging AI predictions throughout the application.
 * All predictions are stored for later validation against actual outcomes.
 */

import { prisma } from '@/lib/prisma'

// Prediction types supported by the system
export type PredictionType =
  | 'RACE_TIME'
  | 'THRESHOLD_POWER'
  | 'THRESHOLD_PACE'
  | 'THRESHOLD_HEART_RATE'
  | 'VO2MAX_ESTIMATE'
  | 'INJURY_RISK'
  | 'READINESS_SCORE'
  | 'RECOVERY_TIME'
  | 'IMPROVEMENT_RATE'
  | 'PEAK_TIMING'
  | 'OPTIMAL_TAPER'
  | 'FTP_ESTIMATE'
  | 'CRITICAL_POWER'
  | 'WEIGHT_PREDICTION'
  | 'BODY_COMPOSITION'

export interface LogPredictionParams {
  athleteId: string
  coachId?: string
  predictionType: PredictionType
  predictedValue: unknown
  confidenceScore: number
  confidenceLower?: number
  confidenceUpper?: number
  modelVersion: string
  modelParameters?: Record<string, unknown>
  inputDataSnapshot: Record<string, unknown>
  validUntil?: Date
  displayedToUser?: boolean
}

/**
 * Logs a prediction to the Data Moat system for later validation.
 * Non-blocking - errors are logged but don't throw.
 */
export async function logPrediction(params: LogPredictionParams): Promise<string | null> {
  try {
    const prediction = await prisma.aIPrediction.create({
      data: {
        athleteId: params.athleteId,
        coachId: params.coachId,
        predictionType: params.predictionType,
        predictedValue: params.predictedValue as import('@prisma/client').Prisma.InputJsonValue,
        confidenceScore: params.confidenceScore,
        confidenceLower: params.confidenceLower,
        confidenceUpper: params.confidenceUpper,
        modelVersion: params.modelVersion,
        modelParameters: params.modelParameters as import('@prisma/client').Prisma.InputJsonValue | undefined,
        inputDataSnapshot: params.inputDataSnapshot as import('@prisma/client').Prisma.InputJsonValue,
        validUntil: params.validUntil,
        displayedToUser: params.displayedToUser ?? false,
      },
    })

    return prediction.id
  } catch (error) {
    console.error('[DataMoat] Failed to log prediction:', error)
    return null
  }
}

/**
 * Logs multiple predictions in a batch (more efficient for bulk operations).
 */
export async function logPredictionBatch(
  predictions: LogPredictionParams[]
): Promise<number> {
  try {
    type InputJson = import('@prisma/client').Prisma.InputJsonValue
    const result = await prisma.aIPrediction.createMany({
      data: predictions.map((p) => ({
        athleteId: p.athleteId,
        coachId: p.coachId,
        predictionType: p.predictionType,
        predictedValue: p.predictedValue as InputJson,
        confidenceScore: p.confidenceScore,
        confidenceLower: p.confidenceLower,
        confidenceUpper: p.confidenceUpper,
        modelVersion: p.modelVersion,
        modelParameters: p.modelParameters as InputJson | undefined,
        inputDataSnapshot: p.inputDataSnapshot as InputJson,
        validUntil: p.validUntil,
        displayedToUser: p.displayedToUser ?? false,
      })),
    })

    return result.count
  } catch (error) {
    console.error('[DataMoat] Failed to log prediction batch:', error)
    return 0
  }
}

/**
 * Helper to calculate confidence interval based on prediction type.
 * Returns a multiplier for the predicted value to create CI bounds.
 */
export function getConfidenceInterval(
  predictionType: PredictionType,
  baseConfidence: number
): { lower: number; upper: number } {
  // Confidence affects the width of the interval
  const confidenceMultiplier = 1 + (1 - baseConfidence) * 0.5

  const intervals: Record<PredictionType, { base: number }> = {
    RACE_TIME: { base: 0.03 }, // ±3% base
    THRESHOLD_POWER: { base: 0.05 }, // ±5% base
    THRESHOLD_PACE: { base: 0.04 }, // ±4% base
    THRESHOLD_HEART_RATE: { base: 0.03 }, // ±3% base
    VO2MAX_ESTIMATE: { base: 0.05 }, // ±5% base
    INJURY_RISK: { base: 0.15 }, // ±15% base (more uncertain)
    READINESS_SCORE: { base: 0.10 }, // ±10% base
    RECOVERY_TIME: { base: 0.20 }, // ±20% base (high variance)
    IMPROVEMENT_RATE: { base: 0.25 }, // ±25% base
    PEAK_TIMING: { base: 0.10 }, // ±10% base
    OPTIMAL_TAPER: { base: 0.15 }, // ±15% base
    FTP_ESTIMATE: { base: 0.05 }, // ±5% base
    CRITICAL_POWER: { base: 0.04 }, // ±4% base
    WEIGHT_PREDICTION: { base: 0.02 }, // ±2% base
    BODY_COMPOSITION: { base: 0.08 }, // ±8% base
  }

  const interval = intervals[predictionType]?.base ?? 0.10
  const adjustedInterval = interval * confidenceMultiplier

  return {
    lower: 1 - adjustedInterval,
    upper: 1 + adjustedInterval,
  }
}

/**
 * Creates a standardized input snapshot for race time predictions.
 */
export function createRaceTimeInputSnapshot(params: {
  recentRaces?: Array<{ distance: number; time: number; date: string }>
  trainingLoad?: number
  currentFitness?: number
  targetDistance: number
  targetDate?: string
}): Record<string, unknown> {
  return {
    type: 'race_time_prediction',
    timestamp: new Date().toISOString(),
    ...params,
  }
}

/**
 * Creates a standardized input snapshot for threshold predictions.
 */
export function createThresholdInputSnapshot(params: {
  testType: 'lactate' | 'field' | 'ergometer'
  testData: unknown
  previousThreshold?: number
  athleteProfile?: {
    age?: number
    sport?: string
    experienceYears?: number
  }
}): Record<string, unknown> {
  return {
    type: 'threshold_prediction',
    timestamp: new Date().toISOString(),
    ...params,
  }
}

/**
 * Creates a standardized input snapshot for injury risk predictions.
 */
export function createInjuryRiskInputSnapshot(params: {
  acuteLoad: number
  chronicLoad: number
  acwr: number
  recentInjuries?: Array<{ type: string; date: string }>
  hrvTrend?: string
  sleepScore?: number
  fatigueLevel?: number
}): Record<string, unknown> {
  return {
    type: 'injury_risk_prediction',
    timestamp: new Date().toISOString(),
    ...params,
  }
}
