/**
 * Data Moat Phase 2: Correlation Analysis Engine
 *
 * Analyzes training fingerprints and outcomes to identify patterns
 * that correlate with success or failure.
 */

import { prisma } from '@/lib/prisma'
import type { TrainingOutcome } from '@prisma/client'

// Types for correlation analysis
export interface CorrelationResult {
  factor: string
  correlation: number // -1 to 1
  sampleSize: number
  significance: 'high' | 'medium' | 'low' | 'insufficient'
  insight: string
}

export interface TrainingCorrelation {
  // Input features
  zoneDistribution: Record<string, number>
  weeklyVolume: number
  intensityVariability: number
  longSessionRatio: number
  strengthSessionsPerWeek: number
  restDaysPerWeek: number

  // Athlete features
  trainingAge?: number
  baselineFitness?: number
  ageGroup?: string

  // Outcome
  outcomeClass: TrainingOutcome
  improvementPercent?: number
  goalAchieved: boolean
  injuryOccurred: boolean
}

export interface WhatWorkedReport {
  athleteId: string
  athleteName: string
  periodName: string
  outcome: TrainingOutcome
  keyFactors: Array<{
    factor: string
    value: string | number
    impact: 'positive' | 'negative' | 'neutral'
    explanation: string
  }>
  comparison: {
    vsPersonalHistory: string
    vsSimilarAthletes: string
  }
  recommendations: string[]
  confidenceScore: number
}

/**
 * Analyze correlations between training characteristics and outcomes.
 */
export async function analyzeCorrelations(
  coachId: string,
  options: {
    minSampleSize?: number
    athleteId?: string
    outcomeTypes?: TrainingOutcome[]
  } = {}
): Promise<CorrelationResult[]> {
  const { minSampleSize = 10, athleteId, outcomeTypes } = options

  // Fetch training outcomes with fingerprints
  const where: Record<string, unknown> = { coachId }
  if (athleteId) where.athleteId = athleteId
  if (outcomeTypes?.length) where.outcomeClass = { in: outcomeTypes }

  const outcomes = await prisma.trainingPeriodOutcome.findMany({
    where,
    include: {
      fingerprint: true,
      athlete: {
        select: {
          id: true,
          birthDate: true,
        },
      },
    },
  })

  // Filter to only those with fingerprints
  const withFingerprints = outcomes.filter((o) => o.fingerprint)

  if (withFingerprints.length < minSampleSize) {
    return [{
      factor: 'sample_size',
      correlation: 0,
      sampleSize: withFingerprints.length,
      significance: 'insufficient',
      insight: `Need at least ${minSampleSize} training periods with fingerprints for analysis. Currently have ${withFingerprints.length}.`,
    }]
  }

  const results: CorrelationResult[] = []

  // Convert outcomes to numeric scores (1 = best, 0 = worst)
  const outcomeScores = withFingerprints.map((o) => ({
    ...o,
    score: outcomeToScore(o.outcomeClass),
  }))

  // Analyze zone distribution correlations
  results.push(
    ...analyzeZoneCorrelations(outcomeScores)
  )

  // Analyze volume correlations
  results.push(
    ...analyzeVolumeCorrelations(outcomeScores)
  )

  // Analyze intensity correlations
  results.push(
    ...analyzeIntensityCorrelations(outcomeScores)
  )

  // Analyze composition correlations
  results.push(
    ...analyzeCompositionCorrelations(outcomeScores)
  )

  // Sort by absolute correlation strength
  results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

  return results
}

/**
 * Convert outcome class to numeric score.
 */
function outcomeToScore(outcome: TrainingOutcome): number {
  switch (outcome) {
    case 'EXCEEDED_GOALS':
      return 1.0
    case 'MET_GOALS':
      return 0.8
    case 'PARTIALLY_MET':
      return 0.5
    case 'MISSED_GOALS':
      return 0.2
    case 'ABANDONED':
      return 0.1
    case 'INJURED':
      return 0.0
    default:
      return 0.5
  }
}

/**
 * Calculate Pearson correlation coefficient.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Determine significance level.
 */
function getSignificance(correlation: number, sampleSize: number): 'high' | 'medium' | 'low' | 'insufficient' {
  if (sampleSize < 10) return 'insufficient'

  const absCorr = Math.abs(correlation)
  // Simple heuristic based on effect size and sample size
  if (absCorr > 0.5 && sampleSize >= 30) return 'high'
  if (absCorr > 0.3 && sampleSize >= 20) return 'medium'
  if (absCorr > 0.2 && sampleSize >= 15) return 'low'
  return 'insufficient'
}

/**
 * Analyze zone distribution correlations.
 */
function analyzeZoneCorrelations(
  data: Array<{ fingerprint: { zone1Percent: number; zone2Percent: number; zone3Percent: number; zone4Percent: number; zone5Percent: number } | null; score: number }>
): CorrelationResult[] {
  const results: CorrelationResult[] = []
  const valid = data.filter((d) => d.fingerprint)

  // Zone 2 (aerobic base) correlation
  const zone2Values = valid.map((d) => d.fingerprint!.zone2Percent)
  const scores = valid.map((d) => d.score)
  const zone2Corr = pearsonCorrelation(zone2Values, scores)

  results.push({
    factor: 'zone2_percent',
    correlation: zone2Corr,
    sampleSize: valid.length,
    significance: getSignificance(zone2Corr, valid.length),
    insight: zone2Corr > 0.2
      ? `Higher zone 2 (aerobic) training correlates with better outcomes (r=${zone2Corr.toFixed(2)})`
      : zone2Corr < -0.2
        ? `Surprisingly, more zone 2 training correlates with worse outcomes (r=${zone2Corr.toFixed(2)})`
        : 'Zone 2 distribution shows no strong correlation with outcomes',
  })

  // Polarization index (zone 1+2 vs zone 4+5, avoiding zone 3)
  const polarizationIndex = valid.map((d) => {
    const fp = d.fingerprint!
    const lowIntensity = fp.zone1Percent + fp.zone2Percent
    const highIntensity = fp.zone4Percent + fp.zone5Percent
    return lowIntensity > 70 && highIntensity > 10 && fp.zone3Percent < 15 ? 1 : 0
  })
  const polarizationCorr = pearsonCorrelation(polarizationIndex, scores)

  results.push({
    factor: 'polarized_training',
    correlation: polarizationCorr,
    sampleSize: valid.length,
    significance: getSignificance(polarizationCorr, valid.length),
    insight: polarizationCorr > 0.2
      ? `Polarized training approach correlates with better outcomes (r=${polarizationCorr.toFixed(2)})`
      : 'Polarized training shows no strong advantage over other approaches',
  })

  // High intensity volume correlation
  const highIntensity = valid.map((d) => d.fingerprint!.zone4Percent + d.fingerprint!.zone5Percent)
  const hiCorr = pearsonCorrelation(highIntensity, scores)

  results.push({
    factor: 'high_intensity_percent',
    correlation: hiCorr,
    sampleSize: valid.length,
    significance: getSignificance(hiCorr, valid.length),
    insight: hiCorr > 0.2
      ? `More high-intensity work (zone 4-5) correlates with better outcomes (r=${hiCorr.toFixed(2)})`
      : hiCorr < -0.2
        ? `Excessive high-intensity work may be counterproductive (r=${hiCorr.toFixed(2)})`
        : 'High-intensity volume shows no clear correlation with outcomes',
  })

  return results
}

/**
 * Analyze volume correlations.
 */
function analyzeVolumeCorrelations(
  data: Array<{ fingerprint: { avgWeeklyHours: number; weeklyVolumeVariation: number; longSessionRatio: number } | null; score: number }>
): CorrelationResult[] {
  const results: CorrelationResult[] = []
  const valid = data.filter((d) => d.fingerprint)

  // Weekly volume correlation
  const weeklyHours = valid.map((d) => d.fingerprint!.avgWeeklyHours)
  const scores = valid.map((d) => d.score)
  const volumeCorr = pearsonCorrelation(weeklyHours, scores)

  results.push({
    factor: 'avg_weekly_hours',
    correlation: volumeCorr,
    sampleSize: valid.length,
    significance: getSignificance(volumeCorr, valid.length),
    insight: volumeCorr > 0.2
      ? `Higher training volume correlates with better outcomes (r=${volumeCorr.toFixed(2)})`
      : volumeCorr < -0.2
        ? `Higher volume may lead to overtraining for this group (r=${volumeCorr.toFixed(2)})`
        : 'Training volume shows no strong correlation with outcomes',
  })

  // Volume consistency correlation
  const consistency = valid.map((d) => 1 - d.fingerprint!.weeklyVolumeVariation)
  const consistencyCorr = pearsonCorrelation(consistency, scores)

  results.push({
    factor: 'volume_consistency',
    correlation: consistencyCorr,
    sampleSize: valid.length,
    significance: getSignificance(consistencyCorr, valid.length),
    insight: consistencyCorr > 0.2
      ? `Consistent weekly volume correlates with better outcomes (r=${consistencyCorr.toFixed(2)})`
      : 'Volume consistency shows no strong correlation with outcomes',
  })

  // Long session ratio correlation
  const longSessions = valid.map((d) => d.fingerprint!.longSessionRatio)
  const longCorr = pearsonCorrelation(longSessions, scores)

  results.push({
    factor: 'long_session_ratio',
    correlation: longCorr,
    sampleSize: valid.length,
    significance: getSignificance(longCorr, valid.length),
    insight: longCorr > 0.2
      ? `More long sessions (>90min) correlate with better outcomes (r=${longCorr.toFixed(2)})`
      : longCorr < -0.2
        ? `Too many long sessions may be counterproductive (r=${longCorr.toFixed(2)})`
        : 'Long session frequency shows no strong correlation with outcomes',
  })

  return results
}

/**
 * Analyze intensity correlations.
 */
function analyzeIntensityCorrelations(
  data: Array<{ fingerprint: { avgSessionIntensity: number; hardDayFrequency: number } | null; score: number }>
): CorrelationResult[] {
  const results: CorrelationResult[] = []
  const valid = data.filter((d) => d.fingerprint)

  // Average intensity correlation
  const avgIntensity = valid.map((d) => d.fingerprint!.avgSessionIntensity)
  const scores = valid.map((d) => d.score)
  const intensityCorr = pearsonCorrelation(avgIntensity, scores)

  results.push({
    factor: 'avg_session_intensity',
    correlation: intensityCorr,
    sampleSize: valid.length,
    significance: getSignificance(intensityCorr, valid.length),
    insight: intensityCorr > 0.2
      ? `Higher average intensity correlates with better outcomes (r=${intensityCorr.toFixed(2)})`
      : intensityCorr < -0.2
        ? `Lower average intensity (more easy days) correlates with better outcomes (r=${intensityCorr.toFixed(2)})`
        : 'Average session intensity shows no strong correlation with outcomes',
  })

  // Hard day frequency correlation
  const hardDays = valid.map((d) => d.fingerprint!.hardDayFrequency)
  const hardCorr = pearsonCorrelation(hardDays, scores)

  results.push({
    factor: 'hard_day_frequency',
    correlation: hardCorr,
    sampleSize: valid.length,
    significance: getSignificance(hardCorr, valid.length),
    insight: hardCorr > 0.2
      ? `More hard training days per week correlate with better outcomes (r=${hardCorr.toFixed(2)})`
      : hardCorr < -0.2
        ? `Fewer hard days (more recovery) correlates with better outcomes (r=${hardCorr.toFixed(2)})`
        : 'Hard day frequency shows no strong correlation with outcomes',
  })

  return results
}

/**
 * Analyze session composition correlations.
 */
function analyzeCompositionCorrelations(
  data: Array<{ fingerprint: { strengthSessionsPerWeek: number; crossTrainingPercent: number; restDaysPerWeek: number } | null; score: number }>
): CorrelationResult[] {
  const results: CorrelationResult[] = []
  const valid = data.filter((d) => d.fingerprint)

  // Strength sessions correlation
  const strengthSessions = valid.map((d) => d.fingerprint!.strengthSessionsPerWeek)
  const scores = valid.map((d) => d.score)
  const strengthCorr = pearsonCorrelation(strengthSessions, scores)

  results.push({
    factor: 'strength_sessions_per_week',
    correlation: strengthCorr,
    sampleSize: valid.length,
    significance: getSignificance(strengthCorr, valid.length),
    insight: strengthCorr > 0.2
      ? `More strength training correlates with better outcomes (r=${strengthCorr.toFixed(2)})`
      : 'Strength training frequency shows no strong correlation with outcomes',
  })

  // Rest days correlation
  const restDays = valid.map((d) => d.fingerprint!.restDaysPerWeek)
  const restCorr = pearsonCorrelation(restDays, scores)

  results.push({
    factor: 'rest_days_per_week',
    correlation: restCorr,
    sampleSize: valid.length,
    significance: getSignificance(restCorr, valid.length),
    insight: restCorr > 0.2
      ? `More rest days correlate with better outcomes (r=${restCorr.toFixed(2)})`
      : restCorr < -0.2
        ? `Fewer rest days (higher frequency) correlates with better outcomes (r=${restCorr.toFixed(2)})`
        : 'Rest day frequency shows no strong correlation with outcomes',
  })

  // Cross-training correlation
  const crossTraining = valid.map((d) => d.fingerprint!.crossTrainingPercent)
  const crossCorr = pearsonCorrelation(crossTraining, scores)

  results.push({
    factor: 'cross_training_percent',
    correlation: crossCorr,
    sampleSize: valid.length,
    significance: getSignificance(crossCorr, valid.length),
    insight: crossCorr > 0.2
      ? `More cross-training correlates with better outcomes (r=${crossCorr.toFixed(2)})`
      : 'Cross-training percentage shows no strong correlation with outcomes',
  })

  return results
}

/**
 * Generate a "What Worked" report for a specific training period.
 */
export async function generateWhatWorkedReport(
  periodOutcomeId: string
): Promise<WhatWorkedReport | null> {
  // Fetch the outcome with all related data
  const outcome = await prisma.trainingPeriodOutcome.findUnique({
    where: { id: periodOutcomeId },
    include: {
      fingerprint: true,
      athlete: {
        select: {
          id: true,
          name: true,
          birthDate: true,
        },
      },
      program: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!outcome || !outcome.fingerprint) {
    return null
  }

  const fp = outcome.fingerprint
  const keyFactors: WhatWorkedReport['keyFactors'] = []

  // Analyze zone distribution
  const lowIntensity = fp.zone1Percent + fp.zone2Percent
  const highIntensity = fp.zone4Percent + fp.zone5Percent

  if (lowIntensity > 75) {
    keyFactors.push({
      factor: 'Zone Distribution',
      value: `${lowIntensity.toFixed(0)}% low intensity`,
      impact: outcome.outcomeClass === 'EXCEEDED_GOALS' || outcome.outcomeClass === 'MET_GOALS' ? 'positive' : 'neutral',
      explanation: 'High proportion of easy/aerobic training follows the polarized model.',
    })
  }

  if (highIntensity > 20) {
    keyFactors.push({
      factor: 'High Intensity',
      value: `${highIntensity.toFixed(0)}% in zone 4-5`,
      impact: outcome.outcomeClass === 'INJURED' ? 'negative' : 'neutral',
      explanation: 'Significant high-intensity work. Monitor for overtraining signs.',
    })
  }

  // Analyze volume
  keyFactors.push({
    factor: 'Weekly Volume',
    value: `${fp.avgWeeklyHours.toFixed(1)} hours/week`,
    impact: 'neutral',
    explanation: `Average weekly training volume during this period.`,
  })

  if (fp.weeklyVolumeVariation > 0.3) {
    keyFactors.push({
      factor: 'Volume Consistency',
      value: `${(fp.weeklyVolumeVariation * 100).toFixed(0)}% variation`,
      impact: 'negative',
      explanation: 'High week-to-week variation may indicate inconsistent training.',
    })
  }

  // Analyze rest
  if (fp.restDaysPerWeek < 1) {
    keyFactors.push({
      factor: 'Recovery',
      value: `${fp.restDaysPerWeek.toFixed(1)} rest days/week`,
      impact: outcome.outcomeClass === 'INJURED' ? 'negative' : 'neutral',
      explanation: 'Low rest day frequency. Consider adding more recovery time.',
    })
  }

  // Compliance if available
  if (outcome.compliance !== null) {
    keyFactors.push({
      factor: 'Compliance',
      value: `${(outcome.compliance * 100).toFixed(0)}%`,
      impact: outcome.compliance > 0.8 ? 'positive' : outcome.compliance < 0.6 ? 'negative' : 'neutral',
      explanation: outcome.compliance > 0.8
        ? 'Excellent adherence to the training plan.'
        : outcome.compliance < 0.6
          ? 'Low compliance may have affected results.'
          : 'Moderate compliance to the training plan.',
    })
  }

  // Generate recommendations
  const recommendations: string[] = []

  if (outcome.outcomeClass === 'EXCEEDED_GOALS' || outcome.outcomeClass === 'MET_GOALS') {
    recommendations.push('Continue with similar training structure for future periods.')
    if (lowIntensity > 75) {
      recommendations.push('The polarized approach worked well - maintain high easy/hard ratio.')
    }
  } else if (outcome.outcomeClass === 'INJURED') {
    recommendations.push('Review training load progression and recovery protocols.')
    if (highIntensity > 25) {
      recommendations.push('Consider reducing high-intensity volume in next period.')
    }
    if (fp.restDaysPerWeek < 1.5) {
      recommendations.push('Increase rest day frequency to at least 1-2 per week.')
    }
  } else {
    recommendations.push('Analyze which specific workouts felt most effective.')
    if (outcome.compliance !== null && outcome.compliance < 0.7) {
      recommendations.push('Focus on improving consistency and compliance next period.')
    }
  }

  return {
    athleteId: outcome.athlete.id,
    athleteName: outcome.athlete.name,
    periodName: outcome.periodName,
    outcome: outcome.outcomeClass,
    keyFactors,
    comparison: {
      vsPersonalHistory: 'Comparison requires more historical data.',
      vsSimilarAthletes: 'Comparison requires more athletes with similar profiles.',
    },
    recommendations,
    confidenceScore: keyFactors.length >= 3 ? 0.7 : 0.4,
  }
}
