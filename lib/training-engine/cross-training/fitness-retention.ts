/**
 * Fitness Retention Calculator
 *
 * Predicts fitness maintenance during cross-training periods
 * based on research showing modality-specific retention rates
 */

import { CrossTrainingModality, FitnessRetentionPrediction } from './types';
import { MODALITY_EQUIVALENCIES } from './modality-equivalencies';

/**
 * Calculate expected fitness retention during cross-training period
 */
export function calculateFitnessRetention(
  modality: CrossTrainingModality,
  durationWeeks: number,
  weeklyTSS: number,
  runningPercentage: number = 0 // % of training that remains running
): FitnessRetentionPrediction {

  const equivalency = MODALITY_EQUIVALENCIES[modality];

  // Base retention rates from research
  let vo2maxRetention = equivalency.fitnessRetention;
  let thresholdRetention = equivalency.fitnessRetention * 0.95; // Threshold slightly less retained
  let economyRetention = getRunningEconomyRetention(modality);

  // Adjust for duration - longer periods = greater decline
  const durationFactor = calculateDurationDecay(durationWeeks);
  vo2maxRetention *= durationFactor;
  thresholdRetention *= durationFactor;
  economyRetention *= durationFactor;

  // Adjust for training volume
  const volumeFactor = calculateVolumeFactor(weeklyTSS, modality);
  vo2maxRetention *= volumeFactor;
  thresholdRetention *= volumeFactor;

  // Adjust for blended training (if some running continues)
  if (runningPercentage > 0) {
    const blendingBonus = calculateBlendingBonus(runningPercentage);
    vo2maxRetention = Math.min(1.0, vo2maxRetention + blendingBonus);
    thresholdRetention = Math.min(1.0, thresholdRetention + blendingBonus);
    economyRetention = Math.min(1.0, economyRetention + blendingBonus * 2); // Economy benefits most from running
  }

  const overallRetention = (vo2maxRetention + thresholdRetention + economyRetention) / 3;

  return {
    modality,
    duration: durationWeeks,
    expectedRetention: {
      vo2max: Math.round(vo2maxRetention * 100),
      lactateThreshold: Math.round(thresholdRetention * 100),
      runningEconomy: Math.round(economyRetention * 100),
      overall: Math.round(overallRetention * 100)
    },
    returnToRunningTimeline: calculateReturnTimeline(overallRetention, durationWeeks),
    recommendations: generateRetentionRecommendations(modality, overallRetention, runningPercentage)
  };
}

/**
 * Calculate running economy retention by modality
 */
function getRunningEconomyRetention(modality: CrossTrainingModality): number {
  const economyRetentionRates = {
    DEEP_WATER_RUNNING: 0.92,  // Maintains running-specific patterns
    CYCLING: 0.70,             // Different movement pattern
    ELLIPTICAL: 0.75,          // Somewhat similar mechanics
    SWIMMING: 0.50,            // Very different mechanics
    ALTERG: 0.95,              // Identical mechanics
    ROWING: 0.60               // Different mechanics but good core engagement
  };

  return economyRetentionRates[modality];
}

/**
 * Calculate fitness decay over time
 * Research shows 2-4% decline per week without specific stimulus
 */
function calculateDurationDecay(weeks: number): number {
  const weeklyDecayRate = 0.02; // 2% per week
  const maxDecay = 0.20;        // Maximum 20% decay

  const decay = Math.min(weeks * weeklyDecayRate, maxDecay);
  return 1 - decay;
}

/**
 * Calculate impact of training volume on retention
 */
function calculateVolumeFactor(weeklyTSS: number, modality: CrossTrainingModality): number {
  const equivalency = MODALITY_EQUIVALENCIES[modality];

  // Target TSS for full retention varies by modality
  const targetTSS = {
    DEEP_WATER_RUNNING: 400,   // Same as running
    CYCLING: 500,              // Higher due to lower specificity
    ELLIPTICAL: 450,
    SWIMMING: 350,             // Lower due to different demands
    ALTERG: 400,
    ROWING: 450
  };

  const target = targetTSS[modality];
  const volumeRatio = weeklyTSS / target;

  // Diminishing returns - 150% volume doesn't give 150% retention
  if (volumeRatio >= 1.0) {
    return 1.0;
  } else if (volumeRatio >= 0.8) {
    return 0.9 + (volumeRatio - 0.8) * 0.5; // 0.9 to 1.0
  } else {
    return volumeRatio * 1.125; // Linear below 80%
  }
}

/**
 * Calculate bonus for blended training (maintaining some running)
 */
function calculateBlendingBonus(runningPercentage: number): number {
  // Research shows even small amounts of running preserve specificity
  if (runningPercentage >= 0.5) return 0.15;      // 50%+ running = 15% bonus
  if (runningPercentage >= 0.25) return 0.10;     // 25-50% = 10% bonus
  if (runningPercentage >= 0.10) return 0.05;     // 10-25% = 5% bonus
  return 0;
}

/**
 * Calculate return-to-running timeline
 */
function calculateReturnTimeline(overallRetention: number, crossTrainingWeeks: number): string {
  if (overallRetention >= 0.95) {
    return 'Immediate return to full training possible';
  } else if (overallRetention >= 0.85) {
    return `${Math.ceil(crossTrainingWeeks * 0.25)}-${Math.ceil(crossTrainingWeeks * 0.5)} weeks to full fitness`;
  } else if (overallRetention >= 0.70) {
    return `${Math.ceil(crossTrainingWeeks * 0.5)}-${crossTrainingWeeks} weeks to full fitness`;
  } else {
    return `${crossTrainingWeeks}-${crossTrainingWeeks * 2} weeks to full fitness - significant rebuilding needed`;
  }
}

/**
 * Generate modality-specific recommendations
 */
function generateRetentionRecommendations(
  modality: CrossTrainingModality,
  retention: number,
  runningPercentage: number
): string[] {

  const recommendations: string[] = [];

  // General recommendations based on retention
  if (retention < 0.70) {
    recommendations.push('⚠️ Significant fitness loss expected - plan extended rebuild period');
    recommendations.push('Consider adding small amount of running if injury allows');
  } else if (retention < 0.85) {
    recommendations.push('Moderate fitness loss expected - plan gradual return');
  } else {
    recommendations.push('✅ Excellent fitness retention expected');
  }

  // Modality-specific recommendations
  switch (modality) {
    case 'DEEP_WATER_RUNNING':
      recommendations.push('Maintain all workout types - intervals, tempo, long runs');
      recommendations.push('Focus on form and cadence (180 steps/min)');
      if (runningPercentage === 0) {
        recommendations.push('Consider 1-2 short runs per week if injury allows');
      }
      break;

    case 'CYCLING':
      recommendations.push('Emphasize longer sessions to match aerobic stimulus');
      recommendations.push('Include some high-intensity work to maintain lactate tolerance');
      recommendations.push('Add running drills or strides if injury allows');
      break;

    case 'ELLIPTICAL':
      recommendations.push('Use arms actively for full-body engagement');
      recommendations.push('Vary incline and resistance to prevent monotony');
      break;

    case 'SWIMMING':
      recommendations.push('Best used for active recovery and aerobic base maintenance');
      recommendations.push('Combine with higher-retention modality if possible');
      recommendations.push('Focus on technique improvement during this period');
      break;

    case 'ALTERG':
      recommendations.push('Progress body weight support gradually (10% per week)');
      recommendations.push('Monitor gait symmetry and pain levels closely');
      recommendations.push('Can maintain full training volume with reduced impact');
      break;

    case 'ROWING':
      recommendations.push('Focus on proper technique: legs-core-arms sequence');
      recommendations.push('Include high-intensity intervals to maintain lactate tolerance');
      recommendations.push('Combine with running-specific drills if injury allows');
      break;
  }

  // Blended training recommendations
  if (runningPercentage > 0) {
    recommendations.push(`✅ Maintaining ${Math.round(runningPercentage * 100)}% running - excellent for specificity`);
    recommendations.push('Prioritize running sessions for quality work');
    recommendations.push('Use cross-training for volume and recovery');
  }

  return recommendations;
}
