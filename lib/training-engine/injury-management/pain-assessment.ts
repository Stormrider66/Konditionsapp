/**
 * Pain Assessment and Decision Tree
 *
 * Implements evidence-based pain assessment using:
 * - 0-10 Numeric Pain Rating Scale
 * - University of Delaware Soreness Rules
 * - Gait mechanics protection
 * - Automatic decision algorithms
 */

import { PainAssessment, SorenessRules, InjuryDecision, TrainingModification, RedFlag } from './types';

/**
 * Assess pain and generate training recommendations
 *
 * Critical thresholds:
 * - Pain 0-2: Acceptable, continue with monitoring
 * - Pain 3-4: Yellow flag, modify immediately
 * - Pain 5-7: Red flag, stop running
 * - Pain 8-10: Critical, medical attention
 *
 * @param assessment - Pain assessment data
 * @param sorenessRules - University of Delaware rules
 * @returns Decision with modifications
 */
export function assessPainAndRecommend(
  assessment: PainAssessment,
  sorenessRules: SorenessRules
): InjuryDecision {
  const { painLevel, gaitAffected, timing } = assessment;

  // CRITICAL: Gait alteration overrides all other factors
  if (gaitAffected) {
    return {
      decision: 'STOP_IMMEDIATELY',
      severity: 'CRITICAL',
      reasoning: 'Pain altering gait mechanics indicates significant injury risk. Immediate cessation required.',
      estimatedTimeOff: 'UNKNOWN',
      followUpRequired: true,
      medicalEvaluation: true,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: 'UNTIL_MEDICAL_CLEARANCE',
        alternatives: []
      }]
    };
  }

  // CRITICAL: Severe pain levels
  if (painLevel >= 8) {
    return {
      decision: 'MEDICAL_EVALUATION',
      severity: 'CRITICAL',
      reasoning: 'Severe pain (8-10/10) indicates significant injury. Medical evaluation required.',
      estimatedTimeOff: 'UNKNOWN',
      followUpRequired: true,
      medicalEvaluation: true,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: 'UNTIL_MEDICAL_CLEARANCE'
      }]
    };
  }

  // RED FLAG: Significant pain
  if (painLevel >= 5) {
    return {
      decision: 'REST_2_3_DAYS',
      severity: 'RED',
      reasoning: 'Significant pain (5-7/10) requires immediate rest to prevent worsening.',
      estimatedTimeOff: '7_14_DAYS',
      followUpRequired: true,
      medicalEvaluation: painLevel >= 6,
      modifications: [
        {
          type: 'COMPLETE_REST',
          duration: '2_3_DAYS'
        },
        {
          type: 'CROSS_TRAINING_SUBSTITUTION',
          alternatives: ['DEEP_WATER_RUNNING', 'SWIMMING'],
          duration: '1_2_WEEKS'
        }
      ]
    };
  }

  // YELLOW FLAG: Moderate pain
  if (painLevel >= 3) {
    const modifications: TrainingModification[] = [
      {
        type: 'VOLUME_REDUCTION',
        percentage: 30,
        duration: '1_WEEK'
      },
      {
        type: 'INTENSITY_REDUCTION',
        percentage: 40,
        duration: '1_WEEK'
      }
    ];

    return {
      decision: 'MODIFY',
      severity: 'YELLOW',
      reasoning: 'Moderate pain (3-4/10) requires immediate training modification to prevent progression.',
      estimatedTimeOff: '0_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications
    };
  }

  // Apply University of Delaware Soreness Rules
  const sorenessDecision = applySorenessRules(sorenessRules, painLevel);
  if (sorenessDecision.decision !== 'CONTINUE') {
    return sorenessDecision;
  }

  // ACCEPTABLE: Low pain levels
  if (painLevel <= 2) {
    return {
      decision: 'CONTINUE',
      severity: 'GREEN',
      reasoning: 'Minimal pain (0-2/10) acceptable. Continue with close monitoring.',
      estimatedTimeOff: '0_DAYS',
      followUpRequired: false,
      medicalEvaluation: false,
      modifications: [{
        type: 'VOLUME_REDUCTION',
        percentage: 0,
        duration: 'NONE'
      }]
    };
  }

  // Default fallback
  return {
    decision: 'MODIFY',
    severity: 'YELLOW',
    reasoning: 'Precautionary modification due to pain presence.',
    estimatedTimeOff: '0_DAYS',
    followUpRequired: true,
    medicalEvaluation: false
  };
}

/**
 * Apply University of Delaware Soreness Rules
 *
 * Rules:
 * 1. Soreness during warmup that continues → STOP, 2 days off, drop level
 * 2. Soreness during warmup that disappears → Continue with caution
 * 3. Soreness appears then redevelops → STOP, 2 days off, drop level
 * 4. Soreness day after workout → Normal DOMS if pain ≤2/10
 * 5. Pain persists >1 hour post → Rest day required
 */
function applySorenessRules(rules: SorenessRules, painLevel: number): InjuryDecision {
  const {
    painDuringWarmup,
    painContinuesThroughout,
    painDisappearsAfterWarmup,
    painRedevelopsLater,
    painPersists1HourPost
  } = rules;

  // Rule 1: Pain during warmup that continues
  if (painDuringWarmup && painContinuesThroughout) {
    return {
      decision: 'REST_2_3_DAYS',
      severity: 'RED',
      reasoning: 'Soreness Rule #1: Pain during warmup continuing throughout session.',
      estimatedTimeOff: '2_3_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: '2_3_DAYS'
      }]
    };
  }

  // Rule 3: Pain appears then redevelops
  if (painRedevelopsLater) {
    return {
      decision: 'REST_2_3_DAYS',
      severity: 'RED',
      reasoning: 'Soreness Rule #3: Pain redeveloping during session indicates tissue stress.',
      estimatedTimeOff: '2_3_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: '2_3_DAYS'
      }]
    };
  }

  // Rule 5: Pain persists >1 hour post-workout
  if (painPersists1HourPost) {
    return {
      decision: 'REST_1_DAY',
      severity: 'YELLOW',
      reasoning: 'Soreness Rule #5: Pain persisting >1 hour indicates excessive stress.',
      estimatedTimeOff: '1_DAY',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'COMPLETE_REST',
        duration: '1_DAY'
      }]
    };
  }

  // Rule 2: Pain during warmup that disappears - proceed with caution
  if (painDuringWarmup && painDisappearsAfterWarmup) {
    return {
      decision: 'MODIFY',
      severity: 'YELLOW',
      reasoning: 'Soreness Rule #2: Pain during warmup that disappears. Proceed with caution.',
      estimatedTimeOff: '0_DAYS',
      followUpRequired: true,
      medicalEvaluation: false,
      modifications: [{
        type: 'INTENSITY_REDUCTION',
        percentage: 20,
        duration: '3_DAYS'
      }]
    };
  }

  // No soreness rules triggered
  return {
    decision: 'CONTINUE',
    severity: 'GREEN',
    reasoning: 'No soreness rules triggered. Normal training adaptation.',
    estimatedTimeOff: '0_DAYS',
    followUpRequired: false,
    medicalEvaluation: false
  };
}

/**
 * Detect critical red flags requiring immediate action
 */
export function detectRedFlags(assessment: PainAssessment): RedFlag[] {
  const flags: RedFlag[] = [];

  // Gait alteration
  if (assessment.gaitAffected) {
    flags.push({
      flag: 'GAIT_ALTERATION',
      severity: 'CRITICAL',
      action: 'STOP_IMMEDIATELY',
      timeframe: 'IMMEDIATE',
      medicalRequired: true
    });
  }

  // Severe pain
  if (assessment.painLevel >= 8) {
    flags.push({
      flag: 'SEVERE_PAIN',
      severity: 'CRITICAL',
      action: 'MEDICAL_EVALUATION',
      timeframe: 'IMMEDIATE',
      medicalRequired: true
    });
  }

  // Night pain (indicates serious pathology)
  if (assessment.timing === 'NIGHT_PAIN') {
    flags.push({
      flag: 'NIGHT_PAIN',
      severity: 'CRITICAL',
      action: 'MEDICAL_EVALUATION',
      timeframe: '24_HOURS',
      medicalRequired: true
    });
  }

  // Constant pain
  if (assessment.timing === 'CONSTANT') {
    flags.push({
      flag: 'CONSTANT_PAIN',
      severity: 'HIGH',
      action: 'MEDICAL_EVALUATION',
      timeframe: '48_HOURS',
      medicalRequired: true
    });
  }

  // Swelling with pain
  if (assessment.swelling && assessment.painLevel >= 4) {
    flags.push({
      flag: 'PAIN_WITH_SWELLING',
      severity: 'HIGH',
      action: 'REST_AND_EVALUATE',
      timeframe: '24_HOURS',
      medicalRequired: true
    });
  }

  return flags;
}
