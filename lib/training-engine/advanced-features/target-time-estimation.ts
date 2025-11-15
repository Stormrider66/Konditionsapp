/**
 * Target Time Threshold Estimation
 *
 * Enables program generation for athletes without lab testing by estimating
 * thresholds from target race times or previous personal bests
 *
 * CRITICAL: All estimates require validation testing within 2-4 weeks
 */

import {
  TargetTimeInput,
  PersonalBestInput,
  ImprovementGoal,
  ThresholdEstimate,
  ValidationWarning,
  ValidationSchedule,
  ConservatismSettings
} from './types';

/**
 * Estimate thresholds from target race time (no previous data)
 *
 * Uses race-to-threshold relationships:
 * - 5K pace = LT2 × 1.07 (7% faster than threshold)
 * - 10K pace = LT2 × 1.02 (2% faster)
 * - Half marathon = at LT2
 * - Marathon = LT2 × 0.88 (12% slower)
 */
export function estimateThresholdsFromTargetTime(input: TargetTimeInput): ThresholdEstimate {
  const { distance, targetTime, runnerLevel, maxHR } = input;

  // Calculate target pace
  const targetPace = targetTime / (distance / 1000); // sec/km

  // Race-to-threshold factors by runner level
  const thresholdFactors = {
    'ELITE': { 5000: 1.10, 10000: 1.05, 21097.5: 1.00, 42195: 0.88 },
    'ADVANCED': { 5000: 1.08, 10000: 1.03, 21097.5: 1.00, 42195: 0.88 },
    'RECREATIONAL': { 5000: 1.07, 10000: 1.02, 21097.5: 1.00, 42195: 0.85 },
    'BEGINNER': { 5000: 1.05, 10000: 1.00, 21097.5: 0.98, 42195: 0.83 }
  };

  const raceFactor = thresholdFactors[runnerLevel][distance as keyof typeof thresholdFactors['ELITE']];

  if (!raceFactor) {
    throw new Error(`Unsupported distance: ${distance}m`);
  }

  // Calculate estimated LT2 and LT1
  const estimatedLT2 = targetPace / raceFactor;
  const estimatedLT1 = estimatedLT2 * 1.11; // LT1 ~11% slower than LT2

  // Heart rate estimates (if maxHR provided)
  let hrEstimates;
  if (maxHR) {
    hrEstimates = {
      LT1_HR: Math.round(maxHR * 0.75),
      LT2_HR: Math.round(maxHR * 0.87)
    };
  }

  return {
    method: 'TARGET_TIME_ONLY',
    confidence: 'LOW',

    LT1: {
      pace: estimatedLT1,
      heartRate: hrEstimates?.LT1_HR,
      confidence: 'LOW'
    },

    LT2: {
      pace: estimatedLT2,
      heartRate: hrEstimates?.LT2_HR,
      confidence: 'LOW'
    },

    warnings: [
      {
        severity: 'CRITICAL',
        message: 'Training zones estimated from target time WITHOUT validation',
        action: 'MANDATORY field test within 2 weeks: 30-min TT or 10K race',
        risk: 'Training at incorrect intensities may cause injury or inadequate stimulus'
      },
      {
        severity: 'HIGH',
        message: 'Initial program will be CONSERVATIVE',
        action: 'Zones will use slower end of ranges until validated',
        risk: 'Better too easy than too hard for unvalidated estimates'
      }
    ],

    validationProtocol: {
      week2: {
        test: '30-minute time trial OR 10K race',
        purpose: 'Validate estimated thresholds',
        critical: true,
        action_if_failed: 'REGENERATE entire program with validated zones'
      },
      week6: {
        test: '20-minute time trial',
        purpose: 'Assess early adaptations',
        critical: false,
        action_if_failed: 'Adjust zones downward'
      },
      week10: {
        test: '10K race or time trial',
        purpose: 'Confirm training effectiveness',
        critical: true,
        action_if_failed: 'Modify methodology or adjust goal'
      }
    },

    conservatismAdjustments: {
      note: 'Apply conservative adjustments until validation',
      LT1_upper: 0.02, // Only 2% above LT1 instead of 5%
      LT2_upper: -0.02, // 2% below LT2 instead of 2% above
      weeklyVolume: 0.85, // Start 15% lower
      progressionRate: 0.05 // 5% instead of 8-10% weekly increases
    }
  };
}

/**
 * Estimate thresholds from personal best with improvement goal
 * More reliable than pure target time as it's anchored to real performance
 */
export function estimateThresholdsFromPBWithImprovement(
  personalBest: PersonalBestInput,
  improvementGoal: ImprovementGoal,
  trainingHistory?: any
): ThresholdEstimate | { error: string; validation: any } {

  // Calculate current thresholds from PB
  const currentThresholds = estimateCurrentThresholdsFromPB(personalBest);

  // Calculate improvement percentage
  const improvementPercent = ((personalBest.time - improvementGoal.targetTime) / personalBest.time) * 100;

  // Validate improvement goal is realistic
  const validation = validateImprovementGoal(
    personalBest.distance,
    improvementPercent,
    improvementGoal.weeksAvailable,
    trainingHistory
  );

  if (!validation.realistic) {
    return {
      error: 'UNREALISTIC_GOAL',
      validation
    };
  }

  // Project improved thresholds (threshold improvement = 75% of race improvement)
  const thresholdImprovementFactor = 0.75;
  const expectedThresholdImprovement = improvementPercent * thresholdImprovementFactor;

  const projectedLT2 = currentThresholds.LT2.pace * (1 - expectedThresholdImprovement / 100);
  const projectedLT1 = currentThresholds.LT1.pace * (1 - expectedThresholdImprovement / 100);

  return {
    method: 'PB_WITH_IMPROVEMENT',
    confidence: validation.confidence,

    LT1: {
      pace: currentThresholds.LT1.pace, // Use current for initial weeks
      confidence: 'MEDIUM'
    },

    LT2: {
      pace: currentThresholds.LT2.pace, // Use current for initial weeks
      confidence: 'MEDIUM_HIGH'
    },

    warnings: validation.warnings,

    validationProtocol: {
      week4: {
        test: '30-minute time trial',
        purpose: 'Establish baseline for improvement tracking',
        critical: true,
        expectedResult: 'Confirm current threshold estimates accurate'
      },
      week8: {
        test: '20-minute time trial',
        purpose: 'Assess improvement trajectory',
        critical: true,
        expectedResult: 'Show 40-50% of projected improvement achieved'
      },
      week12: {
        test: '10K race or time trial',
        purpose: 'Validate threshold improvements',
        critical: true,
        expectedResult: 'Show 70-80% of projected improvement achieved'
      },
      finalWeek: {
        test: 'Race simulation at target pace',
        purpose: 'Final validation of race readiness',
        critical: true,
        expectedResult: 'Sustain target pace for 30-40 minutes comfortably'
      }
    }
  };
}

/**
 * Estimate current thresholds from personal best performance
 */
function estimateCurrentThresholdsFromPB(personalBest: PersonalBestInput): ThresholdEstimate {
  const pbPace = personalBest.time / (personalBest.distance / 1000); // sec/km

  // Estimate LT2 from race pace (similar to target time estimation)
  const runnerFactors = {
    5000: 1.07,
    10000: 1.02,
    21097.5: 1.00,
    42195: 0.88
  };

  const factor = runnerFactors[personalBest.distance as keyof typeof runnerFactors] || 1.00;
  const estimatedLT2 = pbPace / factor;
  const estimatedLT1 = estimatedLT2 * 1.11;

  // Adjust for race conditions
  let conditionFactor = 1.0;
  switch (personalBest.conditions) {
    case 'EXCELLENT':
      conditionFactor = 0.98; // PB was 2% faster than normal
      break;
    case 'POOR':
      conditionFactor = 1.02; // PB was 2% slower than normal
      break;
    default:
      conditionFactor = 1.0;
  }

  return {
    method: 'TARGET_TIME_ONLY',
    confidence: 'MEDIUM',
    LT1: {
      pace: estimatedLT1 * conditionFactor,
      confidence: 'MEDIUM'
    },
    LT2: {
      pace: estimatedLT2 * conditionFactor,
      confidence: 'MEDIUM_HIGH'
    },
    warnings: [],
    validationProtocol: {}
  };
}

/**
 * Validate improvement goal against physiological limits
 */
function validateImprovementGoal(
  distance: number,
  improvementPercent: number,
  weeksAvailable: number,
  trainingHistory?: any
): {
  realistic: boolean;
  confidence: string;
  warnings: ValidationWarning[];
  estimatedWeeksNeeded: number;
} {

  // Realistic improvement benchmarks by experience level and distance
  const improvementBenchmarks = {
    5000: {
      12: [8, 5, 3], // [beginner%, recreational%, advanced%] for 12 weeks
      16: [12, 8, 5],
      24: [18, 12, 8],
      36: [25, 18, 12]
    },
    10000: {
      12: [6, 4, 2],
      16: [10, 6, 4],
      24: [15, 10, 6],
      36: [22, 15, 10]
    },
    21097.5: { // Half marathon
      12: [5, 3, 2],
      16: [8, 5, 3],
      24: [12, 8, 5],
      36: [18, 12, 8]
    },
    42195: { // Marathon
      12: [4, 2, 1.5],
      16: [6, 4, 2.5],
      24: [10, 6, 4],
      36: [15, 10, 6]
    }
  };

  // Determine athlete category from training history
  const category = determineAthleteCategory(trainingHistory);
  const benchmarks = improvementBenchmarks[distance as keyof typeof improvementBenchmarks];

  if (!benchmarks) {
    return {
      realistic: false,
      confidence: 'LOW',
      warnings: [{ severity: 'CRITICAL', message: 'Distance not supported', action: 'Use supported distance' }],
      estimatedWeeksNeeded: 0
    };
  }

  // Find closest week bracket
  const weekBrackets = Object.keys(benchmarks).map(Number).sort((a, b) => a - b);
  const closestWeeks = weekBrackets.reduce((prev, curr) =>
    Math.abs(curr - weeksAvailable) < Math.abs(prev - weeksAvailable) ? curr : prev
  );

  const maxRealistic = benchmarks[closestWeeks as keyof typeof benchmarks][category];
  const realizability = (maxRealistic / improvementPercent) * 100;

  let realistic = true;
  let confidence = 'HIGH';
  const warnings: ValidationWarning[] = [];

  if (improvementPercent <= maxRealistic * 0.7) {
    confidence = 'HIGH';
    warnings.push({
      severity: 'INFO',
      message: 'Conservative improvement goal - achievable with proper training',
      action: 'You may exceed this goal if training goes very well'
    });
  } else if (improvementPercent <= maxRealistic) {
    confidence = 'MEDIUM_HIGH';
    warnings.push({
      severity: 'INFO',
      message: 'Realistic improvement goal requiring consistent, quality training',
      action: 'Stay healthy and follow the program diligently'
    });
  } else if (improvementPercent <= maxRealistic * 1.2) {
    confidence = 'MEDIUM';
    warnings.push({
      severity: 'HIGH',
      message: 'Ambitious goal - achievable but requires perfect execution',
      action: 'Consider extending timeline or adjusting goal slightly',
      risk: 'High injury risk if you push too hard too soon'
    });
  } else {
    realistic = false;
    confidence = 'LOW';
    warnings.push({
      severity: 'CRITICAL',
      message: 'UNREALISTIC GOAL - Improvement rate exceeds physiological limits',
      action: 'MUST adjust goal or timeline before proceeding',
      risk: 'Training for this goal will likely result in injury or burnout'
    });
  }

  return {
    realistic,
    confidence,
    warnings,
    estimatedWeeksNeeded: Math.ceil((improvementPercent / maxRealistic) * weeksAvailable)
  };
}

/**
 * Determine athlete category from training history
 */
function determineAthleteCategory(trainingHistory?: any): number {
  if (!trainingHistory) return 1; // Default to recreational

  const { yearsRunning = 0, weeklyVolume = 0, consistentTraining = false } = trainingHistory;

  if (yearsRunning < 1 || weeklyVolume < 30) return 0; // Beginner
  if (yearsRunning < 3 || weeklyVolume < 50 || !consistentTraining) return 1; // Recreational
  return 2; // Advanced
}
