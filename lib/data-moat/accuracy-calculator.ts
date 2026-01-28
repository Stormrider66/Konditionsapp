/**
 * Accuracy Calculator
 *
 * Data Moat Phase 4: AI Learning Loop
 * Calculates prediction accuracy metrics for the dashboard.
 */

import { prisma } from '@/lib/prisma'
import { PredictionType, Prisma } from '@prisma/client'

export interface AccuracyMetrics {
  racePredictions: RacePredictionAccuracy | null
  thresholdPredictions: ThresholdAccuracy | null
  injuryPredictions: InjuryAccuracy | null
  readinessPredictions: ReadinessAccuracy | null
  programOutcomes: ProgramOutcomeAccuracy | null
  overallSampleSize: number
  overallAccuracy: number | null
  confidenceLevel: number
}

interface RacePredictionAccuracy {
  total: number
  meanAbsoluteError: number
  meanAbsoluteErrorPercent: number
  within5Percent: number
  within10Percent: number
  byDistance: Record<string, {
    total: number
    mae: number
    within5Pct: number
  }>
}

interface ThresholdAccuracy {
  total: number
  meanError: number
  meanErrorPercent: number
  correlation: number
  byTestType: Record<string, {
    total: number
    meanError: number
  }>
}

interface InjuryAccuracy {
  total: number
  truePositives: number
  trueNegatives: number
  falsePositives: number
  falseNegatives: number
  sensitivity: number
  specificity: number
  precision: number
  f1Score: number
  auc: number | null
}

interface ReadinessAccuracy {
  total: number
  correlation: number
  meanAbsoluteError: number
}

interface ProgramOutcomeAccuracy {
  total: number
  goalAchievementRate: number
  averageImprovement: number
  byProgramType: Record<string, {
    total: number
    successRate: number
    avgImprovement: number
  }>
}

interface CalculationOptions {
  startDate?: Date
  endDate?: Date
  modelVersion?: string
}

/**
 * Calculate comprehensive accuracy metrics.
 */
export async function calculateAccuracyMetrics(
  options: CalculationOptions = {}
): Promise<AccuracyMetrics> {
  const { startDate, endDate, modelVersion } = options

  const dateFilter: Record<string, unknown> = {}
  if (startDate || endDate) {
    dateFilter.createdAt = {}
    if (startDate) (dateFilter.createdAt as Record<string, Date>).gte = startDate
    if (endDate) (dateFilter.createdAt as Record<string, Date>).lte = endDate
  }

  const versionFilter = modelVersion ? { modelVersion } : {}

  // Calculate each type of accuracy
  const [
    racePredictions,
    thresholdPredictions,
    injuryPredictions,
    readinessPredictions,
    programOutcomes,
  ] = await Promise.all([
    calculateRacePredictionAccuracy({ ...dateFilter, ...versionFilter }),
    calculateThresholdAccuracy({ ...dateFilter, ...versionFilter }),
    calculateInjuryAccuracy({ ...dateFilter, ...versionFilter }),
    calculateReadinessAccuracy({ ...dateFilter, ...versionFilter }),
    calculateProgramOutcomeAccuracy(dateFilter),
  ])

  // Calculate overall metrics
  const totalSamples =
    (racePredictions?.total || 0) +
    (thresholdPredictions?.total || 0) +
    (injuryPredictions?.total || 0) +
    (readinessPredictions?.total || 0) +
    (programOutcomes?.total || 0)

  // Weighted average accuracy
  let weightedAccuracy = 0
  let totalWeight = 0

  if (racePredictions && racePredictions.total >= 10) {
    weightedAccuracy += racePredictions.within10Percent * racePredictions.total
    totalWeight += racePredictions.total
  }

  if (injuryPredictions && injuryPredictions.total >= 10) {
    weightedAccuracy += injuryPredictions.f1Score * injuryPredictions.total
    totalWeight += injuryPredictions.total
  }

  if (programOutcomes && programOutcomes.total >= 10) {
    weightedAccuracy += programOutcomes.goalAchievementRate * programOutcomes.total
    totalWeight += programOutcomes.total
  }

  const overallAccuracy = totalWeight > 0 ? weightedAccuracy / totalWeight : null

  // Confidence level based on sample size
  const confidenceLevel = Math.min(1, totalSamples / 500)

  return {
    racePredictions,
    thresholdPredictions,
    injuryPredictions,
    readinessPredictions,
    programOutcomes,
    overallSampleSize: totalSamples,
    overallAccuracy,
    confidenceLevel,
  }
}

async function calculateRacePredictionAccuracy(
  filters: Record<string, unknown>
): Promise<RacePredictionAccuracy | null> {
  const predictions = await prisma.aIPrediction.findMany({
    where: {
      predictionType: 'RACE_TIME',
      validated: true,
      validation: { isNot: null },
      ...filters,
    },
    include: {
      validation: true,
    },
  })

  if (predictions.length < 5) return null

  const errors = predictions.map((p) => ({
    absolute: Math.abs(p.validation!.absoluteError),
    percent: Math.abs(p.validation!.percentageError),
    withinCI: p.validation!.withinConfidenceInterval,
    input: p.inputDataSnapshot as { distance?: string; targetDistance?: string },
  }))

  const mae = errors.reduce((sum, e) => sum + e.absolute, 0) / errors.length
  const maePercent = errors.reduce((sum, e) => sum + e.percent, 0) / errors.length
  const within5 = errors.filter((e) => e.percent <= 5).length / errors.length
  const within10 = errors.filter((e) => e.percent <= 10).length / errors.length

  // Group by distance
  const byDistance: Record<string, { total: number; errors: number[] }> = {}
  for (const e of errors) {
    const distance = e.input?.distance || e.input?.targetDistance || 'unknown'
    if (!byDistance[distance]) {
      byDistance[distance] = { total: 0, errors: [] }
    }
    byDistance[distance].total++
    byDistance[distance].errors.push(e.percent)
  }

  const byDistanceStats: Record<string, { total: number; mae: number; within5Pct: number }> = {}
  for (const [distance, data] of Object.entries(byDistance)) {
    if (data.total >= 3) {
      byDistanceStats[distance] = {
        total: data.total,
        mae: data.errors.reduce((a, b) => a + b, 0) / data.errors.length,
        within5Pct: data.errors.filter((e) => e <= 5).length / data.total,
      }
    }
  }

  return {
    total: predictions.length,
    meanAbsoluteError: mae,
    meanAbsoluteErrorPercent: maePercent,
    within5Percent: within5,
    within10Percent: within10,
    byDistance: byDistanceStats,
  }
}

async function calculateThresholdAccuracy(
  filters: Record<string, unknown>
): Promise<ThresholdAccuracy | null> {
  const predictions = await prisma.aIPrediction.findMany({
    where: {
      predictionType: { in: [PredictionType.THRESHOLD_POWER, PredictionType.THRESHOLD_PACE, PredictionType.THRESHOLD_HEART_RATE] },
      validated: true,
      validation: { isNot: null },
      ...filters,
    },
    include: {
      validation: true,
    },
  })

  if (predictions.length < 5) return null

  const errors = predictions.map((p) => ({
    absolute: p.validation!.absoluteError,
    percent: p.validation!.percentageError,
    predicted: (p.predictedValue as { value?: number })?.value || 0,
    actual: (p.validation!.actualValue as { value?: number })?.value || 0,
    input: p.inputDataSnapshot as { testType?: string },
  }))

  const meanError = errors.reduce((sum, e) => sum + e.absolute, 0) / errors.length
  const meanErrorPercent = errors.reduce((sum, e) => sum + Math.abs(e.percent), 0) / errors.length

  // Calculate correlation
  const correlation = calculatePearsonCorrelation(
    errors.map((e) => e.predicted),
    errors.map((e) => e.actual)
  )

  // Group by test type
  const byTestType: Record<string, { total: number; errors: number[] }> = {}
  for (const e of errors) {
    const testType = e.input?.testType || 'unknown'
    if (!byTestType[testType]) {
      byTestType[testType] = { total: 0, errors: [] }
    }
    byTestType[testType].total++
    byTestType[testType].errors.push(Math.abs(e.absolute))
  }

  const byTestTypeStats: Record<string, { total: number; meanError: number }> = {}
  for (const [testType, data] of Object.entries(byTestType)) {
    if (data.total >= 3) {
      byTestTypeStats[testType] = {
        total: data.total,
        meanError: data.errors.reduce((a, b) => a + b, 0) / data.errors.length,
      }
    }
  }

  return {
    total: predictions.length,
    meanError,
    meanErrorPercent,
    correlation,
    byTestType: byTestTypeStats,
  }
}

async function calculateInjuryAccuracy(
  filters: Record<string, unknown>
): Promise<InjuryAccuracy | null> {
  const predictions = await prisma.aIPrediction.findMany({
    where: {
      predictionType: 'INJURY_RISK',
      validated: true,
      validation: { isNot: null },
      ...filters,
    },
    include: {
      validation: true,
    },
  })

  if (predictions.length < 10) return null

  // For injury predictions, we treat high risk (>0.5) as positive prediction
  const results = predictions.map((p) => {
    const predictedRisk = (p.predictedValue as { riskScore?: number })?.riskScore || 0
    const predicted = predictedRisk > 0.5
    const actual = (p.validation!.actualValue as { injured?: boolean })?.injured || false
    return { predicted, actual }
  })

  const tp = results.filter((r) => r.predicted && r.actual).length
  const tn = results.filter((r) => !r.predicted && !r.actual).length
  const fp = results.filter((r) => r.predicted && !r.actual).length
  const fn = results.filter((r) => !r.predicted && r.actual).length

  const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 0
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0
  const f1Score = precision + sensitivity > 0 ? 2 * (precision * sensitivity) / (precision + sensitivity) : 0

  return {
    total: predictions.length,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    sensitivity,
    specificity,
    precision,
    f1Score,
    auc: null, // Would need ROC curve calculation
  }
}

async function calculateReadinessAccuracy(
  filters: Record<string, unknown>
): Promise<ReadinessAccuracy | null> {
  const predictions = await prisma.aIPrediction.findMany({
    where: {
      predictionType: PredictionType.READINESS_SCORE,
      validated: true,
      validation: { isNot: null },
      ...filters,
    },
    include: {
      validation: true,
    },
  })

  if (predictions.length < 10) return null

  const data = predictions.map((p) => ({
    predicted: (p.predictedValue as { score?: number })?.score || 0,
    actual: (p.validation!.actualValue as { actualReadiness?: number })?.actualReadiness || 0,
    error: Math.abs(p.validation!.absoluteError),
  }))

  const correlation = calculatePearsonCorrelation(
    data.map((d) => d.predicted),
    data.map((d) => d.actual)
  )

  const mae = data.reduce((sum, d) => sum + d.error, 0) / data.length

  return {
    total: predictions.length,
    correlation,
    meanAbsoluteError: mae,
  }
}

async function calculateProgramOutcomeAccuracy(
  filters: Record<string, unknown>
): Promise<ProgramOutcomeAccuracy | null> {
  const outcomes = await prisma.trainingPeriodOutcome.findMany({
    where: {
      ...filters,
    },
    include: {
      program: {
        select: { name: true },
      },
    },
  })

  if (outcomes.length < 5) return null

  const successful = outcomes.filter(
    (o) => o.outcomeClass === 'EXCEEDED_GOALS' || o.outcomeClass === 'MET_GOALS'
  )

  const goalAchievementRate = successful.length / outcomes.length

  // Calculate average improvement (from goal metrics vs actual)
  let totalImprovement = 0
  let improvementCount = 0

  for (const outcome of outcomes) {
    const goals = outcome.goalMetrics as Record<string, number> | null
    const actuals = outcome.actualMetrics as Record<string, number> | null

    if (goals && actuals) {
      // Find matching metrics
      for (const key of Object.keys(goals)) {
        if (actuals[key] !== undefined && typeof goals[key] === 'number') {
          const improvement = ((actuals[key] - goals[key]) / Math.abs(goals[key])) * 100
          totalImprovement += improvement
          improvementCount++
        }
      }
    }
  }

  const averageImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0

  // Group by program type
  const byProgramType: Record<string, { total: number; success: number; improvements: number[] }> = {}

  for (const outcome of outcomes) {
    const programName = outcome.program?.name || outcome.periodType || 'unknown'
    if (!byProgramType[programName]) {
      byProgramType[programName] = { total: 0, success: 0, improvements: [] }
    }
    byProgramType[programName].total++
    if (outcome.outcomeClass === 'EXCEEDED_GOALS' || outcome.outcomeClass === 'MET_GOALS') {
      byProgramType[programName].success++
    }
  }

  const byProgramTypeStats: Record<string, { total: number; successRate: number; avgImprovement: number }> = {}
  for (const [type, data] of Object.entries(byProgramType)) {
    if (data.total >= 3) {
      byProgramTypeStats[type] = {
        total: data.total,
        successRate: data.success / data.total,
        avgImprovement: data.improvements.length > 0
          ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
          : 0,
      }
    }
  }

  return {
    total: outcomes.length,
    goalAchievementRate,
    averageImprovement,
    byProgramType: byProgramTypeStats,
  }
}

/**
 * Create and save an accuracy snapshot.
 */
export async function createAccuracySnapshot(
  snapshotType: 'daily' | 'weekly' | 'monthly' | 'all_time',
  isPublic: boolean = false
): Promise<string> {
  const now = new Date()
  let startDate: Date
  let endDate = now

  switch (snapshotType) {
    case 'daily':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 1)
      break
    case 'weekly':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
      break
    case 'monthly':
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 1)
      break
    case 'all_time':
      startDate = new Date(2020, 0, 1) // Far in the past
      break
  }

  const metrics = await calculateAccuracyMetrics({
    startDate: snapshotType !== 'all_time' ? startDate : undefined,
    endDate,
  })

  // Find previous snapshot for comparison
  const previousSnapshot = await prisma.accuracySnapshot.findFirst({
    where: { snapshotType },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate change from previous
  let changeFromPrevious: Record<string, unknown> | null = null
  if (previousSnapshot && metrics.overallAccuracy !== null) {
    const prevOverall = previousSnapshot.overallAccuracy
    if (prevOverall !== null) {
      changeFromPrevious = {
        overallAccuracyChange: metrics.overallAccuracy - prevOverall,
        sampleSizeChange: metrics.overallSampleSize - previousSnapshot.overallSampleSize,
      }
    }
  }

  const snapshot = await prisma.accuracySnapshot.create({
    data: {
      periodStart: startDate,
      periodEnd: endDate,
      snapshotType,
      racePredictions: (metrics.racePredictions ?? undefined) as Prisma.InputJsonValue | undefined,
      thresholdPredictions: (metrics.thresholdPredictions ?? undefined) as Prisma.InputJsonValue | undefined,
      injuryPredictions: (metrics.injuryPredictions ?? undefined) as Prisma.InputJsonValue | undefined,
      readinessPredictions: (metrics.readinessPredictions ?? undefined) as Prisma.InputJsonValue | undefined,
      programOutcomes: (metrics.programOutcomes ?? undefined) as Prisma.InputJsonValue | undefined,
      overallSampleSize: metrics.overallSampleSize,
      overallAccuracy: metrics.overallAccuracy,
      confidenceLevel: metrics.confidenceLevel,
      previousSnapshotId: previousSnapshot?.id,
      changeFromPrevious: (changeFromPrevious ?? undefined) as Prisma.InputJsonValue | undefined,
      isPublic,
    },
  })

  return snapshot.id
}

// Utility function
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n !== y.length || n < 2) return 0

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}
