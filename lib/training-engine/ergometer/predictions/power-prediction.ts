/**
 * Ergometer Power Prediction Engine
 *
 * Predicts performance based on Critical Power model:
 * - Power at specific durations: P(t) = CP + W'/t
 * - Time for specific distances (Concept2)
 * - Pace predictions
 *
 * Reference: Monod & Scherrer (1965), Vanhatalo et al. (2007)
 */

import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { estimatePowerForDuration, estimateTimeToExhaustion } from '../calculations/critical-power';

export interface PowerPredictionInput {
  criticalPower: number;      // CP in Watts
  wPrime: number;             // W' in Joules
  ergometerType: ErgometerType;
  athleteWeight?: number;     // kg (for W/kg calculations)
}

export interface PowerPrediction {
  duration: number;           // seconds
  durationFormatted: string;  // "6:32"
  predictedPower: number;     // Watts
  predictedPace?: number;     // sec/500m (Concept2 only)
  predictedPaceFormatted?: string; // "1:45.2/500m"
  predictedWattsPerKg?: number;
  zone: number;               // 1-6 training zone
  sustainability: 'sustainable' | 'threshold' | 'severe' | 'extreme';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TimePrediction {
  distance: number;           // meters
  distanceFormatted: string;  // "2000m"
  predictedTime: number;      // seconds
  predictedTimeFormatted: string; // "6:32.4"
  predictedPace: number;      // sec/500m
  predictedPaceFormatted: string;
  avgPower: number;           // Watts
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Standard test durations in seconds
const STANDARD_DURATIONS = [
  { seconds: 60, label: '1 min' },
  { seconds: 120, label: '2 min' },
  { seconds: 180, label: '3 min' },
  { seconds: 300, label: '5 min' },
  { seconds: 420, label: '7 min' },
  { seconds: 600, label: '10 min' },
  { seconds: 1200, label: '20 min' },
  { seconds: 1800, label: '30 min' },
  { seconds: 3600, label: '60 min' },
];

// Standard Concept2 distances
const CONCEPT2_DISTANCES = [
  { meters: 500, label: '500m' },
  { meters: 1000, label: '1K' },
  { meters: 2000, label: '2K' },
  { meters: 5000, label: '5K' },
  { meters: 6000, label: '6K' },
  { meters: 10000, label: '10K' },
];

/**
 * Convert watts to pace (Concept2 formula)
 * pace = 500 × (2.80 / watts)^(1/3)
 */
function wattsToPace(watts: number): number {
  if (watts <= 0) return Infinity;
  return 500 * Math.pow(2.80 / watts, 1 / 3);
}

/**
 * Convert pace to watts (Concept2 formula)
 * watts = 2.80 / (pace/500)³
 */
function paceToWatts(paceSeconds: number): number {
  const pacePerMeter = paceSeconds / 500;
  return 2.80 / Math.pow(pacePerMeter, 3);
}

/**
 * Format seconds as M:SS.s
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Format pace as M:SS.s/500m
 */
function formatPace(paceSeconds: number): string {
  const mins = Math.floor(paceSeconds / 60);
  const secs = paceSeconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}/500m`;
}

/**
 * Determine training zone based on % of CP
 */
function getZone(power: number, cp: number): number {
  const percentCP = (power / cp) * 100;

  if (percentCP < 56) return 1;      // Recovery
  if (percentCP < 76) return 2;      // Endurance
  if (percentCP < 91) return 3;      // Tempo
  if (percentCP < 106) return 4;     // Threshold
  if (percentCP < 121) return 5;     // VO2max
  return 6;                          // Anaerobic
}

/**
 * Determine sustainability category
 */
function getSustainability(power: number, cp: number): PowerPrediction['sustainability'] {
  const ratio = power / cp;

  if (ratio <= 0.95) return 'sustainable';
  if (ratio <= 1.05) return 'threshold';
  if (ratio <= 1.30) return 'severe';
  return 'extreme';
}

/**
 * Predict power output for a given duration
 */
export function predictPowerForDuration(
  input: PowerPredictionInput,
  targetDuration: number
): PowerPrediction {
  const { criticalPower, wPrime, ergometerType, athleteWeight } = input;

  // Use CP model: P = CP + W'/t
  const predictedPower = estimatePowerForDuration(targetDuration, criticalPower, wPrime);

  // Calculate pace for Concept2 machines
  const isConcept2 = ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);
  const predictedPace = isConcept2 ? wattsToPace(predictedPower) : undefined;

  // Calculate W/kg if weight provided
  const predictedWattsPerKg = athleteWeight && athleteWeight > 0
    ? predictedPower / athleteWeight
    : undefined;

  // Determine confidence based on duration relative to W' depletion
  let confidence: PowerPrediction['confidence'] = 'HIGH';
  const tte = estimateTimeToExhaustion(predictedPower, criticalPower, wPrime);

  if (targetDuration > 1800) {
    // Very long durations - lower confidence as model assumptions weaken
    confidence = 'MEDIUM';
  } else if (targetDuration < 30) {
    // Very short durations - W' dominant, higher variability
    confidence = 'MEDIUM';
  }

  return {
    duration: targetDuration,
    durationFormatted: formatTime(targetDuration),
    predictedPower: Math.round(predictedPower),
    predictedPace: predictedPace ? Math.round(predictedPace * 10) / 10 : undefined,
    predictedPaceFormatted: predictedPace ? formatPace(predictedPace) : undefined,
    predictedWattsPerKg: predictedWattsPerKg ? Math.round(predictedWattsPerKg * 100) / 100 : undefined,
    zone: getZone(predictedPower, criticalPower),
    sustainability: getSustainability(predictedPower, criticalPower),
    confidence,
  };
}

/**
 * Predict time for a given distance (Concept2 only)
 */
export function predictTimeForDistance(
  input: PowerPredictionInput,
  targetDistance: number
): TimePrediction | null {
  const { criticalPower, wPrime, ergometerType } = input;

  // Only valid for Concept2 machines
  const isConcept2 = ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);
  if (!isConcept2) return null;

  // Iteratively find the power/time that covers the distance
  // Distance = (time / pace) * 500
  // We need to solve for time where distance = targetDistance

  // Start with CP estimate and iterate
  let estimatedTime = targetDistance / 500 * wattsToPace(criticalPower * 1.05);

  // Newton-Raphson iteration
  for (let i = 0; i < 10; i++) {
    const power = estimatePowerForDuration(estimatedTime, criticalPower, wPrime);
    const pace = wattsToPace(power);
    const achievedDistance = (estimatedTime / pace) * 500;

    const error = targetDistance - achievedDistance;
    if (Math.abs(error) < 1) break; // Within 1 meter

    // Adjust time proportionally
    estimatedTime *= targetDistance / achievedDistance;
  }

  const finalPower = estimatePowerForDuration(estimatedTime, criticalPower, wPrime);
  const finalPace = wattsToPace(finalPower);

  // Confidence based on duration
  let confidence: TimePrediction['confidence'] = 'HIGH';
  if (estimatedTime > 1800) confidence = 'MEDIUM';
  if (estimatedTime > 3600) confidence = 'LOW';

  // Format distance label
  let distanceFormatted = `${targetDistance}m`;
  if (targetDistance >= 1000) {
    distanceFormatted = `${(targetDistance / 1000).toFixed(targetDistance % 1000 === 0 ? 0 : 1)}K`;
  }

  return {
    distance: targetDistance,
    distanceFormatted,
    predictedTime: Math.round(estimatedTime * 10) / 10,
    predictedTimeFormatted: formatTime(estimatedTime),
    predictedPace: Math.round(finalPace * 10) / 10,
    predictedPaceFormatted: formatPace(finalPace),
    avgPower: Math.round(finalPower),
    confidence,
  };
}

/**
 * Generate full power curve predictions
 */
export function generatePowerCurve(
  input: PowerPredictionInput
): PowerPrediction[] {
  return STANDARD_DURATIONS.map(({ seconds }) =>
    predictPowerForDuration(input, seconds)
  );
}

/**
 * Generate Concept2 distance predictions
 */
export function generateDistancePredictions(
  input: PowerPredictionInput
): TimePrediction[] {
  return CONCEPT2_DISTANCES
    .map(({ meters }) => predictTimeForDistance(input, meters))
    .filter((p): p is TimePrediction => p !== null);
}

/**
 * Compare predicted vs actual performance
 */
export function analyzePerformance(
  predicted: PowerPrediction,
  actualPower: number
): {
  difference: number;
  differencePercent: number;
  assessment: 'exceeded' | 'met' | 'below';
  insights: string[];
} {
  const difference = actualPower - predicted.predictedPower;
  const differencePercent = (difference / predicted.predictedPower) * 100;

  let assessment: 'exceeded' | 'met' | 'below';
  const insights: string[] = [];

  if (differencePercent > 3) {
    assessment = 'exceeded';
    insights.push('Presterade bättre än förväntat - överväg att uppdatera CP-modell');
    if (differencePercent > 10) {
      insights.push('Stor avvikelse kan indikera att CP eller W\' behöver omkalibreras');
    }
  } else if (differencePercent < -3) {
    assessment = 'below';
    insights.push('Presterade under förväntan');
    if (differencePercent < -10) {
      insights.push('Kontrollera återhämtning, motivation, eller om testet paceades korrekt');
    }
  } else {
    assessment = 'met';
    insights.push('Presterade enligt förväntan - CP-modell är välkalibrerad');
  }

  return {
    difference: Math.round(difference),
    differencePercent: Math.round(differencePercent * 10) / 10,
    assessment,
    insights,
  };
}
