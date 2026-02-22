/**
 * VBT-Progression Integration
 *
 * Integrates Velocity-Based Training data with the strength progression system.
 *
 * Key features:
 * - VBT-based 1RM estimation (more accurate than rep-based)
 * - Velocity trend analysis for fatigue/readiness
 * - Combined progression tracking (VBT + traditional)
 * - Auto-regulation recommendations based on velocity
 */

import { prisma } from '@/lib/prisma';
import {
  calculateLoadVelocityProfile,
  predictVelocity,
  getRecommendedLoad,
  getVelocityZone,
  VELOCITY_ZONES,
  type LoadVelocityProfileResult,
} from '@/lib/integrations/vbt';
import { estimate1RMWithConfidence } from './rm-estimation';

// ============================================
// Types
// ============================================

export interface VBTProgressionData {
  exerciseId: string;
  exerciseName: string;
  // VBT-derived metrics
  vbt1RM: number | null;
  vbtConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  loadVelocityProfile: LoadVelocityProfileResult | null;
  // Rep-based metrics (for comparison)
  repBased1RM: number | null;
  repBasedConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  // Combined recommendation
  recommended1RM: number;
  recommendationSource: 'VBT' | 'REP_BASED' | 'COMBINED';
  // Velocity trends
  velocityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | null;
  avgVelocityLast7Days: number | null;
  avgVelocityPrevious7Days: number | null;
  // Training recommendations
  recommendations: {
    nextSessionLoad: number;
    targetVelocity: { min: number; max: number };
    velocityLossTarget: number;
    readinessIndicator: 'FRESH' | 'NORMAL' | 'FATIGUED' | null;
  };
}

export interface VBTVelocityTrend {
  exerciseName: string;
  currentAvgVelocity: number;
  previousAvgVelocity: number;
  percentChange: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  interpretation: string;
}

// ============================================
// Core Functions
// ============================================

/**
 * Get VBT-enhanced progression data for an exercise
 */
export async function getVBTProgressionData(
  clientId: string,
  exerciseId: string,
  exerciseName: string
): Promise<VBTProgressionData> {
  // Get VBT measurements for this exercise (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const vbtMeasurements = await prisma.vBTMeasurement.findMany({
    where: {
      session: {
        clientId,
      },
      exerciseId,
      meanVelocity: { not: null },
      load: { not: null },
    },
    orderBy: {
      session: { sessionDate: 'desc' },
    },
    include: {
      session: {
        select: { sessionDate: true },
      },
    },
    take: 100,
  });

  // Get rep-based progression data
  const repBasedProgression = await prisma.progressionTracking.findFirst({
    where: {
      clientId,
      exerciseId,
    },
    orderBy: { date: 'desc' },
  });

  // Calculate VBT-based 1RM if we have enough data
  let vbt1RM: number | null = null;
  let vbtConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | null = null;
  let loadVelocityProfile: LoadVelocityProfileResult | null = null;

  if (vbtMeasurements.length >= 3) {
    const dataPoints = vbtMeasurements
      .filter((m) => m.meanVelocity !== null && m.load !== null)
      .map((m) => ({
        load: m.load!,
        velocity: m.meanVelocity!,
      }));

    loadVelocityProfile = calculateLoadVelocityProfile(dataPoints, exerciseName);

    if (loadVelocityProfile.isValid) {
      // Use e1RM at 0.2 m/s (good balance for most exercises)
      vbt1RM = Math.round(loadVelocityProfile.e1RM_0_2 * 10) / 10;

      // Determine confidence based on R² and data points
      if (loadVelocityProfile.rSquared >= 0.95 && dataPoints.length >= 10) {
        vbtConfidence = 'HIGH';
      } else if (loadVelocityProfile.rSquared >= 0.85 && dataPoints.length >= 5) {
        vbtConfidence = 'MEDIUM';
      } else {
        vbtConfidence = 'LOW';
      }
    }
  }

  // Get rep-based 1RM
  const repBased1RM = repBasedProgression?.estimated1RM || null;
  const repBasedConfidence = repBasedProgression
    ? ('MEDIUM' as const) // Rep-based is typically medium confidence
    : null;

  // Determine recommended 1RM (prefer VBT if available and valid)
  let recommended1RM: number;
  let recommendationSource: 'VBT' | 'REP_BASED' | 'COMBINED';

  if (vbt1RM && vbtConfidence === 'HIGH') {
    recommended1RM = vbt1RM;
    recommendationSource = 'VBT';
  } else if (vbt1RM && repBased1RM) {
    // Average both if VBT is not high confidence
    recommended1RM = Math.round(((vbt1RM + repBased1RM) / 2) * 10) / 10;
    recommendationSource = 'COMBINED';
  } else if (vbt1RM) {
    recommended1RM = vbt1RM;
    recommendationSource = 'VBT';
  } else if (repBased1RM) {
    recommended1RM = repBased1RM;
    recommendationSource = 'REP_BASED';
  } else {
    recommended1RM = 0;
    recommendationSource = 'REP_BASED';
  }

  // Calculate velocity trends
  const velocityTrendData = await calculateVelocityTrend(
    clientId,
    exerciseId,
    exerciseName
  );

  // Generate training recommendations
  const recommendations = generateTrainingRecommendations(
    loadVelocityProfile,
    velocityTrendData,
    recommended1RM
  );

  return {
    exerciseId,
    exerciseName,
    vbt1RM,
    vbtConfidence,
    loadVelocityProfile,
    repBased1RM,
    repBasedConfidence,
    recommended1RM,
    recommendationSource,
    velocityTrend: velocityTrendData?.trend || null,
    avgVelocityLast7Days: velocityTrendData?.currentAvgVelocity || null,
    avgVelocityPrevious7Days: velocityTrendData?.previousAvgVelocity || null,
    recommendations,
  };
}

/**
 * Calculate velocity trend for an exercise
 * Compares last 7 days to previous 7 days at similar loads
 */
async function calculateVelocityTrend(
  clientId: string,
  exerciseId: string,
  exerciseName: string
): Promise<VBTVelocityTrend | null> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get measurements from last 7 days
  const recentMeasurements = await prisma.vBTMeasurement.findMany({
    where: {
      session: {
        clientId,
        sessionDate: { gte: sevenDaysAgo },
      },
      exerciseId,
      meanVelocity: { not: null },
      load: { not: null },
    },
    include: {
      session: { select: { sessionDate: true } },
    },
  });

  // Get measurements from 7-14 days ago
  const previousMeasurements = await prisma.vBTMeasurement.findMany({
    where: {
      session: {
        clientId,
        sessionDate: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
      exerciseId,
      meanVelocity: { not: null },
      load: { not: null },
    },
    include: {
      session: { select: { sessionDate: true } },
    },
  });

  if (recentMeasurements.length < 3 || previousMeasurements.length < 3) {
    return null;
  }

  // Calculate average velocity at comparable loads
  const recentAvgVelocity =
    recentMeasurements.reduce((sum, m) => sum + (m.meanVelocity || 0), 0) /
    recentMeasurements.length;

  const previousAvgVelocity =
    previousMeasurements.reduce((sum, m) => sum + (m.meanVelocity || 0), 0) /
    previousMeasurements.length;

  const percentChange =
    ((recentAvgVelocity - previousAvgVelocity) / previousAvgVelocity) * 100;

  let trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  let interpretation: string;

  if (percentChange > 3) {
    trend = 'IMPROVING';
    interpretation = 'Velocity increasing - good recovery and adaptation';
  } else if (percentChange < -3) {
    trend = 'DECLINING';
    interpretation = 'Velocity decreasing - possible fatigue or overreaching';
  } else {
    trend = 'STABLE';
    interpretation = 'Velocity stable - consistent performance';
  }

  return {
    exerciseName,
    currentAvgVelocity: Math.round(recentAvgVelocity * 100) / 100,
    previousAvgVelocity: Math.round(previousAvgVelocity * 100) / 100,
    percentChange: Math.round(percentChange * 10) / 10,
    trend,
    interpretation,
  };
}

/**
 * Generate training recommendations based on VBT data
 */
function generateTrainingRecommendations(
  profile: LoadVelocityProfileResult | null,
  velocityTrend: VBTVelocityTrend | null,
  estimated1RM: number
): VBTProgressionData['recommendations'] {
  // Default recommendations
  let nextSessionLoad = estimated1RM * 0.75; // 75% of 1RM
  let targetVelocity = { min: 0.5, max: 0.75 };
  let velocityLossTarget = 20;
  let readinessIndicator: 'FRESH' | 'NORMAL' | 'FATIGUED' | null = null;

  // Adjust based on profile
  if (profile?.isValid) {
    const strengthRecommendation = getRecommendedLoad(profile, 'STRENGTH');
    nextSessionLoad = Math.round(strengthRecommendation.maxLoad * 0.9); // 90% of strength zone max
    targetVelocity = strengthRecommendation.targetVelocity;
  }

  // Adjust based on velocity trend
  if (velocityTrend) {
    if (velocityTrend.trend === 'IMPROVING') {
      readinessIndicator = 'FRESH';
      // Can push harder
      nextSessionLoad = Math.round(nextSessionLoad * 1.025); // +2.5%
      velocityLossTarget = 25;
    } else if (velocityTrend.trend === 'DECLINING') {
      readinessIndicator = 'FATIGUED';
      // Back off
      nextSessionLoad = Math.round(nextSessionLoad * 0.95); // -5%
      velocityLossTarget = 15;
    } else {
      readinessIndicator = 'NORMAL';
    }
  }

  return {
    nextSessionLoad: Math.round(nextSessionLoad * 10) / 10,
    targetVelocity,
    velocityLossTarget,
    readinessIndicator,
  };
}

/**
 * Get VBT summary for all exercises for a client
 */
export async function getVBTProgressionSummary(
  clientId: string
): Promise<{
  exercisesWithVBT: number;
  totalVBTSessions: number;
  avgVelocityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  exerciseSummaries: Array<{
    exerciseId: string;
    exerciseName: string;
    vbt1RM: number | null;
    repBased1RM: number | null;
    recommended1RM: number;
    velocityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | null;
    lastSessionDate: Date | null;
  }>;
}> {
  // Get all VBT sessions for client
  const sessions = await prisma.vBTSession.findMany({
    where: { clientId },
    select: { id: true, sessionDate: true },
  });

  // Get unique exercises with VBT data
  const exerciseStats = await prisma.vBTMeasurement.groupBy({
    by: ['exerciseId', 'exerciseName'],
    where: {
      session: { clientId },
      exerciseId: { not: null },
    },
    _count: { id: true },
    _max: { createdAt: true },
  });

  // Get progression data for each exercise
  const exerciseSummaries = await Promise.all(
    exerciseStats
      .filter((e) => e.exerciseId)
      .slice(0, 20) // Limit to top 20 exercises
      .map(async (e) => {
        const progressionData = await getVBTProgressionData(
          clientId,
          e.exerciseId!,
          e.exerciseName
        );

        return {
          exerciseId: e.exerciseId!,
          exerciseName: e.exerciseName,
          vbt1RM: progressionData.vbt1RM,
          repBased1RM: progressionData.repBased1RM,
          recommended1RM: progressionData.recommended1RM,
          velocityTrend: progressionData.velocityTrend,
          lastSessionDate: e._max.createdAt,
        };
      })
  );

  // Calculate overall velocity trend
  const trendCounts = {
    IMPROVING: 0,
    STABLE: 0,
    DECLINING: 0,
  };

  for (const summary of exerciseSummaries) {
    if (summary.velocityTrend) {
      trendCounts[summary.velocityTrend]++;
    }
  }

  let avgVelocityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
  if (trendCounts.IMPROVING > trendCounts.DECLINING) {
    avgVelocityTrend = 'IMPROVING';
  } else if (trendCounts.DECLINING > trendCounts.IMPROVING) {
    avgVelocityTrend = 'DECLINING';
  }

  return {
    exercisesWithVBT: exerciseStats.filter((e) => e.exerciseId).length,
    totalVBTSessions: sessions.length,
    avgVelocityTrend,
    exerciseSummaries,
  };
}

/**
 * Update progression tracking with VBT data
 * Called after VBT session upload
 */
export async function updateProgressionWithVBT(
  clientId: string,
  sessionId: string
): Promise<void> {
  // Get measurements from the session
  const measurements = await prisma.vBTMeasurement.findMany({
    where: {
      sessionId,
      exerciseId: { not: null },
      meanVelocity: { not: null },
      load: { not: null },
    },
    include: {
      session: { select: { sessionDate: true } },
    },
  });

  // Group by exercise
  const byExercise = new Map<
    string,
    typeof measurements
  >();

  for (const m of measurements) {
    if (!m.exerciseId) continue;
    const existing = byExercise.get(m.exerciseId) || [];
    existing.push(m);
    byExercise.set(m.exerciseId, existing);
  }

  // Update progression tracking for each exercise
  for (const [exerciseId, exerciseMeasurements] of byExercise) {
    if (exerciseMeasurements.length === 0) continue;

    const exerciseName = exerciseMeasurements[0].exerciseName;
    const sessionDate = exerciseMeasurements[0].session.sessionDate;

    // Calculate VBT-based 1RM
    const dataPoints = exerciseMeasurements.map((m) => ({
      load: m.load!,
      velocity: m.meanVelocity!,
    }));

    const profile = calculateLoadVelocityProfile(dataPoints, exerciseName);

    if (profile.isValid && profile.e1RM_0_2 > 0) {
      // Calculate metrics for progression tracking
      const totalSets = new Set(exerciseMeasurements.map((m) => m.setNumber)).size;
      const totalReps = exerciseMeasurements.length;
      const maxLoad = Math.max(...exerciseMeasurements.map((m) => m.load || 0));
      const avgVelocity =
        exerciseMeasurements.reduce((sum, m) => sum + (m.meanVelocity || 0), 0) /
        exerciseMeasurements.length;

      // Create or update progression tracking record
      await prisma.progressionTracking.create({
        data: {
          clientId,
          exerciseId,
          date: sessionDate,
          sets: totalSets,
          repsCompleted: totalReps,
          repsTarget: totalReps, // VBT typically uses velocity, not rep targets
          actualLoad: maxLoad,
          estimated1RM: Math.round(profile.e1RM_0_2 * 10) / 10,
          estimationMethod: 'VBT_PROFILE',
          strengthPhase: 'MAXIMUM_STRENGTH',
          progressionStatus: 'ON_TRACK',
          // Store VBT-specific data in notes or separate fields
        },
      });
    }
  }
}

/**
 * Compare VBT e1RM with rep-based 1RM
 * Useful for validating estimates
 */
export async function compare1RMEstimates(
  clientId: string,
  exerciseId: string
): Promise<{
  vbt1RM: number | null;
  repBased1RM: number | null;
  difference: number | null;
  differencePercent: number | null;
  moreAccurate: 'VBT' | 'REP_BASED' | 'UNKNOWN';
  recommendation: string;
}> {
  const progressionData = await getVBTProgressionData(
    clientId,
    exerciseId,
    '' // Will fetch name from DB
  );

  const { vbt1RM, repBased1RM } = progressionData;

  if (!vbt1RM || !repBased1RM) {
    return {
      vbt1RM,
      repBased1RM,
      difference: null,
      differencePercent: null,
      moreAccurate: 'UNKNOWN',
      recommendation:
        'Need both VBT and rep-based data for comparison',
    };
  }

  const difference = vbt1RM - repBased1RM;
  const differencePercent = (difference / repBased1RM) * 100;

  let moreAccurate: 'VBT' | 'REP_BASED' | 'UNKNOWN' = 'UNKNOWN';
  let recommendation: string;

  if (Math.abs(differencePercent) < 5) {
    recommendation =
      'Both estimates are consistent. Either can be used with confidence.';
    moreAccurate = 'VBT'; // VBT is generally more accurate when consistent
  } else if (differencePercent > 5) {
    recommendation =
      'VBT estimate is higher. This is typical for well-recovered athletes. Consider using VBT for programming.';
    moreAccurate = 'VBT';
  } else {
    recommendation =
      'Rep-based estimate is higher. This may indicate accumulated fatigue affecting velocity. Consider a deload.';
    moreAccurate = 'REP_BASED';
  }

  return {
    vbt1RM,
    repBased1RM,
    difference: Math.round(difference * 10) / 10,
    differencePercent: Math.round(differencePercent * 10) / 10,
    moreAccurate,
    recommendation,
  };
}
