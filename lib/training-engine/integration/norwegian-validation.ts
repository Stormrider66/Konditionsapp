/**
 * Norwegian Method Eligibility Validation
 *
 * Norwegian method cannot be "turned on" without proper prerequisites.
 * Requires multi-phase validation and 4-phase transition protocol.
 *
 * Prerequisites:
 * 1. Minimum training age (2+ years consistent training)
 * 2. Aerobic base (60+ km/week sustained)
 * 3. Recent lactate testing (within 8 weeks)
 * 4. Lactate meter access for monitoring
 * 5. Coach supervision
 */

import { PrismaClient } from '@prisma/client';

export interface NorwegianRequirement {
  met: boolean;
  requirement: 'TRAINING_AGE' | 'AEROBIC_BASE' | 'RECENT_TESTING' | 'LACTATE_MONITORING' | 'COACH_SUPERVISION';
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface TransitionPhase {
  phase: number;
  name: string;
  weeks: number | string;
  focus: string;
  volumeTarget: number;
  thresholdVolume: string;
  lactateTargets: {
    morning?: [number, number];
    afternoon?: [number, number];
  };
  successCriteria: string[];
}

export interface NorwegianEligibilityResult {
  eligible: boolean;
  requirements: NorwegianRequirement[];
  transitionPlan?: TransitionPhase[];
  estimatedTransitionWeeks?: number;
}

export async function validateNorwegianMethodEligibility(
  athleteId: string,
  prisma: PrismaClient
): Promise<NorwegianEligibilityResult> {

  const athlete = await prisma.athleteProfile.findUnique({
    where: { clientId: athleteId },
    include: {
      client: {
        include: {
          tests: {
            orderBy: { testDate: 'desc' },
            take: 1
          },
          trainingLoads: {
            where: {
              date: {
                gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) // Last 4 weeks
              }
            }
          }
        }
      }
    }
  });

  const requirements: NorwegianRequirement[] = [];

  // Requirement 1: Minimum training age (2+ years consistent training)
  const yearsRunning = athlete?.yearsRunning || 0;
  requirements.push({
    met: yearsRunning >= 2,
    requirement: 'TRAINING_AGE',
    message: yearsRunning >= 2
      ? `✅ Training age: ${yearsRunning} years (meets minimum of 2 years)`
      : `❌ Training age: ${yearsRunning} years (need minimum 2 years)`,
    severity: 'CRITICAL'
  });

  // Requirement 2: Aerobic base (60+ km/week sustained)
  const avgWeeklyVolume = calculateAverageWeeklyVolume(athlete?.client.trainingLoads || []);
  requirements.push({
    met: avgWeeklyVolume >= 60,
    requirement: 'AEROBIC_BASE',
    message: avgWeeklyVolume >= 60
      ? `✅ Weekly volume: ${avgWeeklyVolume.toFixed(1)} km/week (meets minimum of 60 km/week)`
      : `❌ Weekly volume: ${avgWeeklyVolume.toFixed(1)} km/week (need minimum 60 km/week)`,
    severity: 'CRITICAL'
  });

  // Requirement 3: Recent lactate testing (within 8 weeks)
  const recentTest = athlete?.client.tests[0];
  const testAge = recentTest
    ? (Date.now() - recentTest.testDate.getTime()) / (24 * 60 * 60 * 1000)
    : 999;

  requirements.push({
    met: testAge <= 56, // 8 weeks = 56 days
    requirement: 'RECENT_TESTING',
    message: testAge <= 56
      ? `✅ Lactate test age: ${Math.floor(testAge)} days (within 8 weeks)`
      : `❌ Lactate test age: ${Math.floor(testAge)} days (need test within 8 weeks)`,
    severity: 'HIGH'
  });

  // Requirement 4: Lactate meter access
  const hasLactateMeter = athlete?.hasLactateMeter || false;
  requirements.push({
    met: hasLactateMeter,
    requirement: 'LACTATE_MONITORING',
    message: hasLactateMeter
      ? '✅ Lactate meter available for session monitoring'
      : '❌ Lactate meter required for Norwegian method (twice-weekly monitoring needed)',
    severity: 'CRITICAL'
  });

  // Requirement 5: Coach supervision
  const hasCoach = !!athlete?.client.userId; // Has assigned coach
  requirements.push({
    met: hasCoach,
    requirement: 'COACH_SUPERVISION',
    message: hasCoach
      ? '✅ Coach supervision available'
      : '❌ Norwegian method requires dedicated coach supervision',
    severity: 'CRITICAL'
  });

  // Determine eligibility (all CRITICAL requirements must be met)
  const criticalUnmet = requirements.filter(r => r.severity === 'CRITICAL' && !r.met);
  const eligible = criticalUnmet.length === 0;

  // Generate transition plan if eligible
  let transitionPlan: TransitionPhase[] | undefined;
  let estimatedTransitionWeeks: number | undefined;

  if (eligible) {
    transitionPlan = generateNorwegianTransitionPlan(avgWeeklyVolume);
    estimatedTransitionWeeks = transitionPlan.reduce(
      (sum, phase) => sum + (typeof phase.weeks === 'number' ? phase.weeks : 0),
      0
    );
  }

  return {
    eligible,
    requirements,
    transitionPlan,
    estimatedTransitionWeeks
  };
}

function generateNorwegianTransitionPlan(currentVolume: number): TransitionPhase[] {
  return [
    {
      phase: 1,
      name: 'Threshold Familiarization',
      weeks: 4,
      focus: 'Single weekly threshold session at LT2 (2-3 mmol/L)',
      volumeTarget: currentVolume,
      thresholdVolume: '8-10 km',
      lactateTargets: {
        morning: [2.0, 3.0]
      },
      successCriteria: [
        'Consistent lactate values 2-3 mmol/L at threshold pace',
        'No excessive fatigue or overtraining symptoms',
        'Maintaining quality of easy runs (conversational pace)',
        'Recovery HR returning to baseline within 24 hours'
      ]
    },
    {
      phase: 2,
      name: 'Double Threshold Introduction',
      weeks: 4,
      focus: 'Add second weekly threshold session (72-hour spacing minimum)',
      volumeTarget: Math.round(currentVolume * 1.05),
      thresholdVolume: '15-18 km',
      lactateTargets: {
        morning: [2.0, 3.0],
        afternoon: [2.5, 3.5]
      },
      successCriteria: [
        'Recovery between sessions adequate (72+ hours)',
        'Lactate control maintained in both sessions',
        'No injury flags or excessive soreness',
        'HRV/RHR remain stable or improving'
      ]
    },
    {
      phase: 3,
      name: 'Volume Integration',
      weeks: 4,
      focus: 'Increase total threshold volume to 20-25 km/week',
      volumeTarget: Math.round(currentVolume * 1.10),
      thresholdVolume: '20-25 km',
      lactateTargets: {
        morning: [2.0, 3.0],
        afternoon: [2.5, 3.5]
      },
      successCriteria: [
        'Threshold volume 25-30% of weekly total',
        'HRV/RHR stable or improving trends',
        'Performance improving (faster paces at same lactate)',
        'Sleep quality and wellness scores maintained'
      ]
    },
    {
      phase: 4,
      name: 'Full Norwegian Protocol',
      weeks: 'Ongoing',
      focus: 'Maintain double threshold with continuous lactate monitoring',
      volumeTarget: Math.round(currentVolume * 1.15),
      thresholdVolume: '25-30 km',
      lactateTargets: {
        morning: [2.0, 3.0],
        afternoon: [2.5, 3.5]
      },
      successCriteria: [
        'Consistent lactate control (±0.3 mmol/L variability)',
        'No overtraining symptoms (validated by readiness scores)',
        'Race performance validates approach (PRs or near-PRs)',
        'Sustainable year-round with proper periodization'
      ]
    }
  ];
}

function calculateAverageWeeklyVolume(loads: any[]): number {
  if (loads.length === 0) return 0;

  const totalDistance = loads.reduce((sum, load) => sum + (load.distance || 0), 0);
  const weeks = loads.length / 7; // Assuming daily tracking

  return weeks > 0 ? totalDistance / weeks : 0;
}

/**
 * Check if athlete is ready to progress to next Norwegian phase
 */
export function validateNorwegianPhaseProgression(
  currentPhase: number,
  weeksInPhase: number,
  recentMetrics: {
    avgLactate: number;
    lactateVariability: number;
    hRVTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    rHRTrend: 'IMPROVING' | 'STABLE' | 'ELEVATED';
    injuryFlags: number;
  }
): {
  canProgress: boolean;
  reasoning: string[];
  recommendations: string[];
} {
  const reasoning: string[] = [];
  const recommendations: string[] = [];
  let canProgress = true;

  // Check minimum time in phase
  const minWeeks = currentPhase === 4 ? 12 : 4;
  if (weeksInPhase < minWeeks) {
    canProgress = false;
    reasoning.push(`❌ Insufficient time in phase ${currentPhase} (${weeksInPhase}/${minWeeks} weeks)`);
    recommendations.push(`Complete at least ${minWeeks} weeks in current phase before progressing`);
  }

  // Check lactate control
  if (recentMetrics.lactateVariability > 0.5) {
    canProgress = false;
    reasoning.push(`❌ Lactate variability too high (${recentMetrics.lactateVariability.toFixed(2)} mmol/L)`);
    recommendations.push('Improve lactate control consistency before adding volume');
  }

  // Check HRV trend
  if (recentMetrics.hRVTrend === 'DECLINING') {
    canProgress = false;
    reasoning.push('❌ HRV showing declining trend');
    recommendations.push('Address recovery before increasing training load');
  }

  // Check RHR trend
  if (recentMetrics.rHRTrend === 'ELEVATED') {
    canProgress = false;
    reasoning.push('❌ Resting HR elevated (overtraining indicator)');
    recommendations.push('Reduce training volume until RHR normalizes');
  }

  // Check injury flags
  if (recentMetrics.injuryFlags > 0) {
    canProgress = false;
    reasoning.push(`❌ ${recentMetrics.injuryFlags} injury flag(s) detected`);
    recommendations.push('Resolve injuries before progressing to higher volume');
  }

  if (canProgress) {
    reasoning.push('✅ All progression criteria met');
    recommendations.push(`Ready to progress to Phase ${currentPhase + 1}`);
  }

  return {
    canProgress,
    reasoning,
    recommendations
  };
}
