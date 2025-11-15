/**
 * Composite Readiness Score
 *
 * Combines multiple monitoring inputs into a single 0-10 readiness score:
 * - HRV (35% weight) - Most objective, sensitive to fatigue
 * - Wellness (30% weight) - Subjective but comprehensive
 * - RHR (20% weight) - Simple, reliable recovery marker
 * - ACWR (15% weight) - Injury risk and load management
 *
 * Decision Logic:
 * - Red flags from ANY metric trigger conservative recommendations
 * - Critical overrides bypass composite score
 * - Methodology-specific adjustments (Norwegian model requires higher readiness)
 *
 * References:
 * - Saw, A. E., et al. (2016). Monitoring the athlete training response.
 * - Gabbett, T. J. (2016). The training-injury prevention paradox.
 *
 * @module readiness-composite
 */

import { HRVAssessment } from './hrv-assessment'
import { RHRAssessment } from './rhr-assessment'
import { WellnessScore } from './wellness-scoring'

export interface ACWRAssessment {
  value: number // Acute:Chronic ratio
  status: 'OPTIMAL' | 'MODERATE_RISK' | 'HIGH_RISK' | 'VERY_HIGH_RISK'
  score: number // 0-10 for composite
  warning?: string
}

export interface ReadinessInputs {
  hrv?: HRVAssessment
  rhr?: RHRAssessment
  wellness: WellnessScore // Mandatory (can always be collected)
  acwr?: ACWRAssessment
  methodology?: 'POLARIZED' | 'NORWEGIAN' | 'CANOVA' | 'PYRAMIDAL'
}

export interface ReadinessScore {
  score: number // 0-10 composite readiness
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' // Based on available metrics
  componentScores: {
    hrv?: number
    rhr?: number
    wellness: number
    acwr?: number
  }
  criticalFlags: string[]
  warnings: string[]
  recommendation: string
  workoutModification: {
    action: 'PROCEED' | 'REDUCE_INTENSITY' | 'REDUCE_VOLUME' | 'EASY_DAY' | 'REST'
    intensityAdjustment?: number // Percentage (-50 to +10)
    volumeAdjustment?: number // Percentage (-50 to 0)
    reasoning: string
  }
}

/**
 * Calculate ACWR score from ratio
 *
 * Optimal zone: 0.8-1.3
 * Moderate risk: 0.5-0.8 or 1.3-1.5
 * High risk: <0.5 or >1.5
 * Very high risk: >1.8
 *
 * @param acwr - Acute:Chronic Workload Ratio
 * @returns ACWR assessment with score
 */
export function assessACWR(acwr: number): ACWRAssessment {
  let status: ACWRAssessment['status']
  let score: number
  let warning: string | undefined

  if (acwr >= 0.8 && acwr <= 1.3) {
    status = 'OPTIMAL'
    score = 10
  } else if ((acwr >= 0.5 && acwr < 0.8) || (acwr > 1.3 && acwr <= 1.5)) {
    status = 'MODERATE_RISK'
    score = acwr < 0.8 ? 7 : 6 // Detraining is better than overload
    warning = acwr < 0.8
      ? 'ACWR low - risk of detraining or insufficient stimulus'
      : 'ACWR moderately elevated - monitor for fatigue accumulation'
  } else if ((acwr < 0.5 && acwr >= 0.3) || (acwr > 1.5 && acwr <= 1.8)) {
    status = 'HIGH_RISK'
    score = acwr < 0.5 ? 5 : 3
    warning = acwr < 0.5
      ? 'ACWR very low - significant detraining risk'
      : 'ACWR high - elevated injury risk, reduce load'
  } else {
    status = 'VERY_HIGH_RISK'
    score = 1
    warning = acwr > 1.8
      ? 'CRITICAL: ACWR >1.8 - very high injury risk, immediate load reduction required'
      : 'ACWR extremely low - major detraining'
  }

  return {
    value: Math.round(acwr * 100) / 100,
    status,
    score,
    warning,
  }
}

/**
 * Calculate composite readiness score
 *
 * Weights:
 * - HRV: 35% (if available)
 * - Wellness: 30%
 * - RHR: 20% (if available)
 * - ACWR: 15% (if available)
 *
 * If metrics unavailable, remaining weight redistributed proportionally.
 *
 * @param inputs - All available monitoring inputs
 * @returns Comprehensive readiness assessment with modification recommendations
 */
export function calculateReadinessScore(
  inputs: ReadinessInputs
): ReadinessScore {
  const criticalFlags: string[] = []
  const warnings: string[] = []
  const componentScores: ReadinessScore['componentScores'] = {
    wellness: inputs.wellness.totalScore,
  }

  // Collect component scores
  if (inputs.hrv) {
    componentScores.hrv = inputs.hrv.score
    criticalFlags.push(...inputs.hrv.warnings)
  }

  if (inputs.rhr) {
    componentScores.rhr = inputs.rhr.score
    criticalFlags.push(...inputs.rhr.warnings)
  }

  if (inputs.acwr) {
    componentScores.acwr = inputs.acwr.score
    if (inputs.acwr.warning) {
      warnings.push(inputs.acwr.warning)
    }
  }

  // Add wellness flags
  criticalFlags.push(...inputs.wellness.redFlags)
  warnings.push(...inputs.wellness.warnings)

  // Calculate weights (redistribute if metrics missing)
  const baseWeights = {
    hrv: 0.35,
    rhr: 0.2,
    wellness: 0.3,
    acwr: 0.15,
  }

  let totalWeight = 0
  const activeWeights: Record<string, number> = {}

  if (componentScores.hrv !== undefined) {
    activeWeights.hrv = baseWeights.hrv
    totalWeight += baseWeights.hrv
  }

  if (componentScores.rhr !== undefined) {
    activeWeights.rhr = baseWeights.rhr
    totalWeight += baseWeights.rhr
  }

  activeWeights.wellness = baseWeights.wellness
  totalWeight += baseWeights.wellness

  if (componentScores.acwr !== undefined) {
    activeWeights.acwr = baseWeights.acwr
    totalWeight += baseWeights.acwr
  }

  // Normalize weights to sum to 1.0
  Object.keys(activeWeights).forEach((key) => {
    activeWeights[key] = activeWeights[key] / totalWeight
  })

  // Calculate weighted composite score
  let score = 0
  if (componentScores.hrv !== undefined) {
    score += componentScores.hrv * activeWeights.hrv
  }
  if (componentScores.rhr !== undefined) {
    score += componentScores.rhr * activeWeights.rhr
  }
  score += componentScores.wellness * activeWeights.wellness
  if (componentScores.acwr !== undefined) {
    score += componentScores.acwr * activeWeights.acwr
  }

  // Determine confidence based on available metrics
  const metricCount = Object.keys(componentScores).length
  let confidence: ReadinessScore['confidence']
  if (metricCount >= 4) {
    confidence = 'HIGH'
  } else if (metricCount >= 2) {
    confidence = 'MEDIUM'
  } else {
    confidence = 'LOW'
  }

  // Determine status
  let status: ReadinessScore['status']
  if (score >= 8.5) {
    status = 'EXCELLENT'
  } else if (score >= 7) {
    status = 'GOOD'
  } else if (score >= 5.5) {
    status = 'FAIR'
  } else if (score >= 4) {
    status = 'POOR'
  } else {
    status = 'VERY_POOR'
  }

  // Generate recommendation and workout modification
  const { recommendation, workoutModification } = generateRecommendations(
    score,
    status,
    criticalFlags,
    inputs.methodology,
    inputs
  )

  return {
    score: Math.round(score * 10) / 10,
    status,
    confidence,
    componentScores,
    criticalFlags,
    warnings,
    recommendation,
    workoutModification,
  }
}

/**
 * Generate training recommendations based on readiness
 *
 * @param score - Composite readiness score
 * @param status - Readiness status
 * @param criticalFlags - Any critical warnings
 * @param methodology - Training methodology (affects thresholds)
 * @param inputs - Original inputs for context
 * @returns Recommendation and workout modification
 */
function generateRecommendations(
  score: number,
  status: ReadinessScore['status'],
  criticalFlags: string[],
  methodology: ReadinessInputs['methodology'],
  inputs: ReadinessInputs
): {
  recommendation: string
  workoutModification: ReadinessScore['workoutModification']
} {
  // Critical override: Any critical flag = rest or very easy
  if (criticalFlags.some((flag) => flag.includes('CRITICAL'))) {
    return {
      recommendation:
        'CRITICAL readiness issues detected - mandatory rest day or very easy active recovery only',
      workoutModification: {
        action: 'REST',
        intensityAdjustment: -100,
        volumeAdjustment: -100,
        reasoning: 'Critical recovery markers detected - prioritize rest',
      },
    }
  }

  // Methodology-specific adjustments
  const norwegianStrictness = methodology === 'NORWEGIAN' ? 1.0 : 0.8
  const adjustedThresholds = {
    excellent: 8.5 * norwegianStrictness,
    good: 7.0 * norwegianStrictness,
    fair: 5.5 * norwegianStrictness,
  }

  // Norwegian model requires higher readiness for high-intensity work
  if (methodology === 'NORWEGIAN' && score < adjustedThresholds.good) {
    return {
      recommendation:
        'Norwegian methodology requires high readiness for quality sessions - switch to low-intensity aerobic work',
      workoutModification: {
        action: 'REDUCE_INTENSITY',
        intensityAdjustment: -30,
        volumeAdjustment: 0,
        reasoning:
          'Norwegian model: Preserve high-intensity quality by substituting with LIT when readiness suboptimal',
      },
    }
  }

  // Check ACWR for high injury risk
  if (inputs.acwr && inputs.acwr.status === 'VERY_HIGH_RISK') {
    return {
      recommendation:
        'ACWR >1.8 - very high injury risk. Reduce training load immediately.',
      workoutModification: {
        action: 'REDUCE_VOLUME',
        intensityAdjustment: -15,
        volumeAdjustment: -30,
        reasoning: 'Acute load spike - prevent injury by reducing volume',
      },
    }
  }

  // Status-based recommendations
  if (status === 'EXCELLENT') {
    return {
      recommendation: 'Excellent readiness - proceed with planned training',
      workoutModification: {
        action: 'PROCEED',
        intensityAdjustment: 0,
        volumeAdjustment: 0,
        reasoning: 'All recovery markers optimal',
      },
    }
  }

  if (status === 'GOOD') {
    if (criticalFlags.length > 0 || inputs.wellness.warnings.length >= 2) {
      return {
        recommendation:
          'Good overall readiness but some concerns - proceed cautiously or modify workout',
        workoutModification: {
          action: 'REDUCE_INTENSITY',
          intensityAdjustment: -10,
          volumeAdjustment: 0,
          reasoning: 'Multiple minor recovery concerns - reduce intensity slightly',
        },
      }
    }

    return {
      recommendation: 'Good readiness - proceed with planned training, monitor closely',
      workoutModification: {
        action: 'PROCEED',
        intensityAdjustment: 0,
        volumeAdjustment: 0,
        reasoning: 'Good recovery markers',
      },
    }
  }

  if (status === 'FAIR') {
    return {
      recommendation:
        'Suboptimal readiness - reduce workout intensity or switch to easy aerobic',
      workoutModification: {
        action: 'REDUCE_INTENSITY',
        intensityAdjustment: -20,
        volumeAdjustment: -10,
        reasoning: 'Suboptimal recovery - preserve training adaptations while managing fatigue',
      },
    }
  }

  if (status === 'POOR') {
    return {
      recommendation: 'Poor readiness - easy day strongly recommended, skip high-intensity work',
      workoutModification: {
        action: 'EASY_DAY',
        intensityAdjustment: -40,
        volumeAdjustment: -25,
        reasoning: 'Poor recovery markers - prioritize recovery over training stimulus',
      },
    }
  }

  // VERY_POOR
  return {
    recommendation: 'Very poor readiness - rest day or very easy active recovery only',
    workoutModification: {
      action: 'REST',
      intensityAdjustment: -50,
      volumeAdjustment: -50,
      reasoning: 'Very poor recovery - mandatory rest or active recovery',
    },
  }
}

/**
 * Analyze readiness trend over time
 *
 * @param recentReadiness - Last 7-14 days of readiness scores
 * @returns Trend analysis and recommendations
 */
export function analyzeReadinessTrend(recentReadiness: ReadinessScore[]): {
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  rollingAverage: number
  consecutiveDeclines: number
  trendWarning?: string
} {
  if (recentReadiness.length < 3) {
    return {
      trend: 'STABLE',
      rollingAverage: recentReadiness[0]?.score || 7,
      consecutiveDeclines: 0,
    }
  }

  // Calculate 7-day rolling average
  const last7Days = recentReadiness.slice(-7)
  const rollingAverage =
    last7Days.reduce((sum, r) => sum + r.score, 0) / last7Days.length

  // Detect consecutive declines
  let consecutiveDeclines = 0
  for (let i = recentReadiness.length - 1; i > 0; i--) {
    if (recentReadiness[i].score < recentReadiness[i - 1].score) {
      consecutiveDeclines++
    } else {
      break
    }
  }

  // Determine trend
  let trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  let trendWarning: string | undefined

  if (rollingAverage > 7.5) {
    trend = 'IMPROVING'
  } else if (rollingAverage < 6.0 || consecutiveDeclines >= 5) {
    trend = 'DECLINING'

    if (consecutiveDeclines >= 7) {
      trendWarning =
        'Readiness declining for 7+ days - consider scheduled recovery week or deload'
    } else if (consecutiveDeclines >= 5) {
      trendWarning =
        'Readiness declining for 5+ days - review training load and recovery practices'
    }
  } else {
    trend = 'STABLE'
  }

  return {
    trend,
    rollingAverage: Math.round(rollingAverage * 10) / 10,
    consecutiveDeclines,
    trendWarning,
  }
}
