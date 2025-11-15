/**
 * Acute:Chronic Workload Ratio (ACWR) Monitoring
 *
 * Implements EWMA (Exponentially Weighted Moving Average) method
 * Provides real-time injury risk assessment with automatic interventions
 *
 * ACWR Zones:
 * - <0.8: Detraining (increase load 5-10% weekly)
 * - 0.8-1.3: Optimal (sweet spot, low injury risk)
 * - 1.3-1.5: Caution (maintain, don't increase)
 * - 1.5-2.0: Danger (reduce 20-30%)
 * - >2.0: Critical (reduce 40-50% or rest)
 */

import type { TrainingLoad } from '@prisma/client';
import { ACWRAssessment, InjuryDecision, TrainingModification } from './types';

/**
 * Calculate ACWR using EWMA method
 *
 * @param trainingHistory - Last 28+ days of training load
 * @returns ACWR assessment with risk level
 */
export function calculateACWR(trainingHistory: TrainingLoad[]): ACWRAssessment {
  if (trainingHistory.length < 28) {
    throw new Error('Minimum 28 days of training history required for ACWR calculation');
  }

  // Sort by date (oldest first)
  const sortedHistory = trainingHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Extract daily loads
  const dailyLoads = sortedHistory.map(day => day.dailyLoad);

  // Calculate EWMA for acute load (7-day, lambda = 2/(7+1) = 0.25)
  const acuteLoad = calculateEWMA(dailyLoads.slice(-7), 0.25);

  // Calculate EWMA for chronic load (28-day, lambda = 2/(28+1) = 0.069)
  const chronicLoad = calculateEWMA(dailyLoads, 0.069);

  // Calculate ACWR
  const acwr = acuteLoad / chronicLoad;

  // Determine zone and risk
  let zone: ACWRAssessment['zone'];
  let injuryRisk: ACWRAssessment['injuryRisk'];
  let riskMultiplier: number;

  if (acwr < 0.8) {
    zone = 'DETRAINING';
    injuryRisk = 'LOW';
    riskMultiplier = 0.6; // 40% reduction in baseline risk
  } else if (acwr <= 1.3) {
    zone = 'OPTIMAL';
    injuryRisk = 'LOW';
    riskMultiplier = 0.59; // Sweet spot
  } else if (acwr <= 1.5) {
    zone = 'CAUTION';
    injuryRisk = 'MODERATE';
    riskMultiplier = 1.69; // 69% increase
  } else if (acwr <= 2.0) {
    zone = 'DANGER';
    injuryRisk = 'HIGH';
    riskMultiplier = 2.8; // 180% increase
  } else {
    zone = 'CRITICAL';
    injuryRisk = 'VERY_HIGH';
    riskMultiplier = 4.0; // 300% increase
  }

  return {
    acwr: Math.round(acwr * 100) / 100,
    acuteLoad: Math.round(acuteLoad * 10) / 10,
    chronicLoad: Math.round(chronicLoad * 10) / 10,
    zone,
    injuryRisk,
    riskMultiplier
  };
}

/**
 * Calculate Exponentially Weighted Moving Average
 */
function calculateEWMA(values: number[], lambda: number): number {
  if (values.length === 0) return 0;

  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = lambda * values[i] + (1 - lambda) * ewma;
  }

  return ewma;
}

/**
 * Generate ACWR-based training decisions
 *
 * @param acwrAssessment - Current ACWR data
 * @returns Decision with specific modifications
 */
export function generateACWRDecision(acwrAssessment: ACWRAssessment): InjuryDecision {
  const { acwr, zone, riskMultiplier } = acwrAssessment;

  switch (zone) {
    case 'DETRAINING':
      return {
        decision: 'MODIFY',
        severity: 'YELLOW',
        reasoning: `ACWR ${acwr} indicates detraining. Gradual load increase recommended.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [{
          type: 'VOLUME_REDUCTION',
          percentage: -10, // Negative = increase
          duration: '1_WEEK'
        }]
      };

    case 'OPTIMAL':
      return {
        decision: 'CONTINUE',
        severity: 'GREEN',
        reasoning: `ACWR ${acwr} in optimal range. Continue current progression.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: false,
        medicalEvaluation: false
      };

    case 'CAUTION':
      return {
        decision: 'MODIFY',
        severity: 'YELLOW',
        reasoning: `ACWR ${acwr} in caution zone (${riskMultiplier}x baseline injury risk). Maintain current load.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [{
          type: 'VOLUME_REDUCTION',
          percentage: 0, // Maintain, don't increase
          duration: '1_WEEK'
        }]
      };

    case 'DANGER':
      return {
        decision: 'MODIFY',
        severity: 'RED',
        reasoning: `ACWR ${acwr} in danger zone (${riskMultiplier}x baseline injury risk). Immediate load reduction required.`,
        estimatedTimeOff: '0_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [{
          type: 'VOLUME_REDUCTION',
          percentage: 25,
          duration: '1_WEEK'
        }]
      };

    case 'CRITICAL':
      return {
        decision: 'REST_2_3_DAYS',
        severity: 'CRITICAL',
        reasoning: `ACWR ${acwr} critical (${riskMultiplier}x baseline injury risk). Major load reduction or rest required.`,
        estimatedTimeOff: '2_3_DAYS',
        followUpRequired: true,
        medicalEvaluation: false,
        modifications: [
          {
            type: 'COMPLETE_REST',
            duration: '2_3_DAYS'
          },
          {
            type: 'VOLUME_REDUCTION',
            percentage: 50,
            duration: '2_WEEKS'
          }
        ]
      };

    default:
      throw new Error(`Unknown ACWR zone: ${zone}`);
  }
}

/**
 * Monitor ACWR trends and provide early warnings
 */
export function monitorACWRTrends(last14Days: ACWRAssessment[]): {
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  warning?: string;
  action?: string;
} {
  if (last14Days.length < 7) {
    return { trend: 'STABLE' };
  }

  const recent3Days = last14Days.slice(-3).map(d => d.acwr);
  const previous3Days = last14Days.slice(-6, -3).map(d => d.acwr);

  const recentAvg = recent3Days.reduce((a, b) => a + b) / recent3Days.length;
  const previousAvg = previous3Days.reduce((a, b) => a + b) / previous3Days.length;

  const change = (recentAvg - previousAvg) / previousAvg;

  if (change > 0.15) { // >15% increase
    return {
      trend: 'WORSENING',
      warning: 'ACWR rising rapidly over past 3 days',
      action: 'Consider proactive load reduction before entering danger zone'
    };
  }

  if (change < -0.15) { // >15% decrease
    return {
      trend: 'IMPROVING',
      warning: 'ACWR decreasing - good recovery trend',
      action: 'Can consider gradual load increase if in detraining zone'
    };
  }

  return { trend: 'STABLE' };
}
