/**
 * VBT Calculations
 *
 * Load-velocity profile calculations for:
 * - e1RM estimation
 * - MVT (Minimum Velocity Threshold) determination
 * - Velocity-based load prescription
 */

import type {
  LoadVelocityDataPoint,
  LoadVelocityProfileResult,
} from './types';
import { getExerciseMVT } from './types';

// ============================================
// Linear Regression
// ============================================

/**
 * Simple linear regression
 * Returns slope, intercept, and R² value
 */
export function linearRegression(
  points: { x: number; y: number }[]
): { slope: number; intercept: number; rSquared: number } {
  if (points.length < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (const p of points) {
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - (slope * p.x + intercept)) ** 2;
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

// ============================================
// Load-Velocity Profile
// ============================================

/**
 * Calculate load-velocity profile from measurements
 *
 * Uses best rep (highest velocity) at each load to build profile
 */
export function calculateLoadVelocityProfile(
  dataPoints: LoadVelocityDataPoint[],
  exerciseName?: string
): LoadVelocityProfileResult {
  // Group by load and take best velocity at each load
  const loadMap = new Map<number, number>();
  for (const dp of dataPoints) {
    const existing = loadMap.get(dp.load);
    if (!existing || dp.velocity > existing) {
      loadMap.set(dp.load, dp.velocity);
    }
  }

  // Convert to array and sort by load
  const bestPoints = Array.from(loadMap.entries())
    .map(([load, velocity]) => ({ load, velocity }))
    .sort((a, b) => a.load - b.load);

  // Need at least 2 different loads for profile
  if (bestPoints.length < 2) {
    return {
      dataPoints: bestPoints,
      slope: 0,
      intercept: 0,
      rSquared: 0,
      e1RM_0_3: 0,
      e1RM_0_2: 0,
      e1RM_0_15: 0,
      mvt: getExerciseMVT(exerciseName || ''),
      isValid: false,
    };
  }

  // Perform linear regression (velocity = slope * load + intercept)
  const regressionPoints = bestPoints.map(p => ({ x: p.load, y: p.velocity }));
  const { slope, intercept, rSquared } = linearRegression(regressionPoints);

  // Get exercise-specific MVT
  const mvt = getExerciseMVT(exerciseName || '');

  // Calculate e1RM at different velocity thresholds
  // velocity = slope * load + intercept
  // load = (velocity - intercept) / slope
  const calculateE1RM = (targetVelocity: number): number => {
    if (slope >= 0) return 0; // Invalid: velocity should decrease with load
    return (targetVelocity - intercept) / slope;
  };

  const e1RM_0_3 = calculateE1RM(0.3);
  const e1RM_0_2 = calculateE1RM(0.2);
  const e1RM_0_15 = calculateE1RM(0.15);

  // Validate profile
  // - Need at least 3 data points for reliable profile
  // - R² should be > 0.8 for good fit
  // - Slope should be negative (velocity decreases with load)
  // - Load range should cover at least 20% of estimated 1RM
  const minLoad = Math.min(...bestPoints.map(p => p.load));
  const maxLoad = Math.max(...bestPoints.map(p => p.load));
  const loadRange = e1RM_0_2 > 0 ? ((maxLoad - minLoad) / e1RM_0_2) * 100 : 0;

  const isValid =
    bestPoints.length >= 3 &&
    rSquared >= 0.8 &&
    slope < 0 &&
    loadRange >= 20;

  return {
    dataPoints: bestPoints,
    slope,
    intercept,
    rSquared,
    e1RM_0_3,
    e1RM_0_2,
    e1RM_0_15,
    mvt,
    isValid,
  };
}

/**
 * Predict velocity for a given load using profile
 */
export function predictVelocity(
  profile: LoadVelocityProfileResult,
  load: number
): number {
  return profile.slope * load + profile.intercept;
}

/**
 * Predict load for a target velocity using profile
 */
export function predictLoad(
  profile: LoadVelocityProfileResult,
  targetVelocity: number
): number {
  if (profile.slope >= 0) return 0;
  return (targetVelocity - profile.intercept) / profile.slope;
}

/**
 * Get recommended load for a training goal
 * Based on Jovanovic & Flanagan velocity zones
 */
export function getRecommendedLoad(
  profile: LoadVelocityProfileResult,
  goal: 'STRENGTH' | 'POWER' | 'SPEED' | 'HYPERTROPHY'
): { minLoad: number; maxLoad: number; targetVelocity: { min: number; max: number } } {
  const velocityRanges = {
    STRENGTH: { min: 0.15, max: 0.5 },
    POWER: { min: 0.5, max: 1.0 },
    SPEED: { min: 1.0, max: 1.3 },
    HYPERTROPHY: { min: 0.3, max: 0.7 },
  };

  const range = velocityRanges[goal];

  return {
    minLoad: predictLoad(profile, range.max), // Higher velocity = lower load
    maxLoad: predictLoad(profile, range.min), // Lower velocity = higher load
    targetVelocity: range,
  };
}

// ============================================
// Session Metrics
// ============================================

/**
 * Calculate session summary metrics
 */
export function calculateSessionMetrics(
  measurements: {
    exerciseName: string;
    setNumber: number;
    repNumber: number;
    load?: number;
    meanVelocity?: number;
    peakVelocity?: number;
    meanPower?: number;
    peakPower?: number;
  }[]
): {
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    avgMeanVelocity?: number;
    avgLoad?: number;
    maxLoad?: number;
    avgPower?: number;
  }[];
  totalVolume?: number;
  avgVelocityLoss?: number;
} {
  const exerciseMap = new Map<
    string,
    {
      sets: Set<number>;
      reps: number;
      totalVelocity: number;
      velocityCount: number;
      totalLoad: number;
      loadCount: number;
      maxLoad: number;
      totalPower: number;
      powerCount: number;
    }
  >();

  for (const m of measurements) {
    const stats = exerciseMap.get(m.exerciseName) || {
      sets: new Set<number>(),
      reps: 0,
      totalVelocity: 0,
      velocityCount: 0,
      totalLoad: 0,
      loadCount: 0,
      maxLoad: 0,
      totalPower: 0,
      powerCount: 0,
    };

    stats.sets.add(m.setNumber);
    stats.reps++;

    if (m.meanVelocity !== undefined) {
      stats.totalVelocity += m.meanVelocity;
      stats.velocityCount++;
    }

    if (m.load !== undefined) {
      stats.totalLoad += m.load;
      stats.loadCount++;
      stats.maxLoad = Math.max(stats.maxLoad, m.load);
    }

    if (m.meanPower !== undefined) {
      stats.totalPower += m.meanPower;
      stats.powerCount++;
    }

    exerciseMap.set(m.exerciseName, stats);
  }

  const exercises = Array.from(exerciseMap.entries()).map(([name, stats]) => ({
    name,
    sets: stats.sets.size,
    reps: stats.reps,
    avgMeanVelocity:
      stats.velocityCount > 0
        ? Math.round((stats.totalVelocity / stats.velocityCount) * 100) / 100
        : undefined,
    avgLoad:
      stats.loadCount > 0
        ? Math.round((stats.totalLoad / stats.loadCount) * 10) / 10
        : undefined,
    maxLoad: stats.maxLoad > 0 ? stats.maxLoad : undefined,
    avgPower:
      stats.powerCount > 0
        ? Math.round(stats.totalPower / stats.powerCount)
        : undefined,
  }));

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const totalReps = exercises.reduce((sum, e) => sum + e.reps, 0);

  // Calculate total volume (load × reps)
  let totalVolume = 0;
  for (const m of measurements) {
    if (m.load !== undefined) {
      totalVolume += m.load;
    }
  }

  return {
    totalSets,
    totalReps,
    exerciseCount: exercises.length,
    exercises,
    totalVolume: totalVolume > 0 ? Math.round(totalVolume) : undefined,
  };
}

// ============================================
// Velocity Thresholds for Autoregulation
// ============================================

/**
 * Check if velocity threshold has been reached
 * Used for autoregulation (stop set when velocity drops below threshold)
 */
export function checkVelocityThreshold(
  currentVelocity: number,
  firstRepVelocity: number,
  options: {
    absoluteThreshold?: number; // Stop if velocity drops below this
    velocityLossThreshold?: number; // Stop if % loss exceeds this (e.g., 20%)
  } = {}
): {
  shouldStop: boolean;
  reason?: string;
  velocityLoss: number;
} {
  const velocityLoss = ((firstRepVelocity - currentVelocity) / firstRepVelocity) * 100;

  // Check absolute threshold
  if (
    options.absoluteThreshold !== undefined &&
    currentVelocity < options.absoluteThreshold
  ) {
    return {
      shouldStop: true,
      reason: `Velocity below ${options.absoluteThreshold} m/s`,
      velocityLoss,
    };
  }

  // Check velocity loss threshold
  if (
    options.velocityLossThreshold !== undefined &&
    velocityLoss > options.velocityLossThreshold
  ) {
    return {
      shouldStop: true,
      reason: `Velocity loss exceeded ${options.velocityLossThreshold}%`,
      velocityLoss,
    };
  }

  return {
    shouldStop: false,
    velocityLoss,
  };
}

/**
 * Recommend reps based on velocity loss goals
 * From Sanchez-Medina & Gonzalez-Badillo research
 */
export function getVelocityLossRecommendations(goal: string): {
  targetLoss: number;
  description: string;
  bestFor: string[];
} {
  const recommendations: Record<
    string,
    { targetLoss: number; description: string; bestFor: string[] }
  > = {
    POWER: {
      targetLoss: 10,
      description: 'Stop at 10% velocity loss for power development',
      bestFor: ['Power output', 'Rate of force development', 'Speed-strength'],
    },
    HYPERTROPHY_MODERATE: {
      targetLoss: 20,
      description: 'Stop at 20% velocity loss for muscle growth',
      bestFor: ['Muscle hypertrophy', 'Strength gains', 'Training economy'],
    },
    HYPERTROPHY_HIGH: {
      targetLoss: 30,
      description: 'Stop at 30% velocity loss for maximum hypertrophy',
      bestFor: ['Maximum hypertrophy', 'Metabolic stress', 'Muscle endurance'],
    },
    STRENGTH: {
      targetLoss: 15,
      description: 'Stop at 15% velocity loss for strength without excessive fatigue',
      bestFor: ['Strength development', 'Neural adaptations', 'Fatigue management'],
    },
    FAILURE: {
      targetLoss: 40,
      description: 'Train close to failure (40%+ velocity loss)',
      bestFor: ['Maximum effort', 'Testing', 'Occasional use only'],
    },
  };

  return (
    recommendations[goal] ||
    recommendations.HYPERTROPHY_MODERATE
  );
}
