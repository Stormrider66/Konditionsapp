/**
 * Plyometric Training Protocols
 *
 * Progressive contact loading system:
 * - Beginners: 60-100 contacts, low impact only
 * - Intermediate: 80-120 contacts, low + moderate impact
 * - Advanced: 120-200 contacts, all intensities
 * - Elite: 150-300 contacts, sport-specific emphasis
 */

import { PlyometricExercise, PlyometricIntensity } from './types';

/**
 * Generate plyometric program based on experience and running focus
 */
export function generatePlyometricProgram(
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE',
  runningDistance: string,
  trainingPhase: string,
  weeksInPhase: number
): {
  exercises: PlyometricExercise[];
  weeklyVolume: number;      // Total contacts per week
  frequency: number;         // Sessions per week
  intensityDistribution: { [key in PlyometricIntensity]: number };
} {

  const program = {
    exercises: getPlyometricExercises(experienceLevel, runningDistance),
    weeklyVolume: getWeeklyVolume(experienceLevel, trainingPhase),
    frequency: getFrequency(experienceLevel, trainingPhase),
    intensityDistribution: getIntensityDistribution(experienceLevel, trainingPhase)
  };

  return program;
}

/**
 * Get plyometric exercises for experience level
 */
function getPlyometricExercises(
  experienceLevel: string,
  runningDistance: string
): PlyometricExercise[] {

  const baseExercises: PlyometricExercise[] = [];

  // Low-impact exercises (all levels)
  baseExercises.push({
    name: 'Pogo Jumps',
    intensity: 'LOW',
    groundContactTime: '>250ms',
    sets: 3,
    reps: 10,
    contacts: 20, // 2 feet × 10 reps
    rest: 90,
    prerequisite: 'None',
    progression: 'Increase to 3×15, then add single-leg',
    maxVolume: 60, // Per session
    experienceRequired: 'Beginner',
    injuryRisk: 'LOW'
  });

  baseExercises.push({
    name: 'Squat Jumps',
    intensity: 'LOW',
    groundContactTime: '>250ms',
    sets: 3,
    reps: 8,
    contacts: 16,
    rest: 90,
    prerequisite: 'Bodyweight squat mastery',
    progression: 'Increase to 3×12, then add weight',
    maxVolume: 40,
    experienceRequired: 'Beginner',
    injuryRisk: 'LOW'
  });

  // Add intermediate exercises if appropriate
  if (['INTERMEDIATE', 'ADVANCED', 'ELITE'].includes(experienceLevel)) {
    baseExercises.push({
      name: 'Countermovement Jumps',
      intensity: 'MODERATE',
      groundContactTime: '150-250ms',
      sets: 3,
      reps: 8,
      contacts: 16,
      rest: 120,
      prerequisite: '2+ months plyometric experience',
      progression: 'Increase height, then add weight',
      maxVolume: 30,
      experienceRequired: 'Intermediate',
      injuryRisk: 'MODERATE'
    });

    baseExercises.push({
      name: 'Lateral Bounds',
      intensity: 'MODERATE',
      groundContactTime: '150-250ms',
      sets: 3,
      reps: 10,
      contacts: 20, // Single leg
      rest: 120,
      prerequisite: 'Single-leg strength adequate',
      progression: 'Increase distance, then speed',
      maxVolume: 40,
      experienceRequired: 'Intermediate',
      injuryRisk: 'MODERATE'
    });
  }

  // Add advanced exercises if appropriate
  if (['ADVANCED', 'ELITE'].includes(experienceLevel)) {
    baseExercises.push({
      name: 'Depth Jumps',
      intensity: 'HIGH',
      groundContactTime: '<150ms',
      sets: 3,
      reps: 6,
      contacts: 12,
      rest: 240, // 4 minutes for neuromuscular recovery
      prerequisite: '6+ months plyometric experience',
      progression: 'Increase box height (max 24 inches)',
      maxVolume: 27, // Research limit for depth jumps
      experienceRequired: 'Advanced',
      injuryRisk: 'HIGH'
    });
  }

  // Sport-specific adjustments
  return adjustForRunningDistance(baseExercises, runningDistance);
}

/**
 * Adjust plyometric emphasis based on running distance
 */
function adjustForRunningDistance(
  exercises: PlyometricExercise[],
  distance: string
): PlyometricExercise[] {

  switch (distance) {
    case '800M':
    case '1500M':
      // Emphasize maximum power and speed-endurance
      return exercises.filter(ex => ex.intensity === 'HIGH' || ex.intensity === 'MODERATE');

    case '5K':
      // Emphasize running economy and reactive strength
      return exercises.filter(ex => ex.intensity !== 'HIGH').concat(
        exercises.filter(ex => ex.name.includes('Bound'))
      );

    case '10K':
      // Prioritize efficiency and strength-endurance
      return exercises.filter(ex => ex.intensity === 'LOW' || ex.intensity === 'MODERATE');

    case 'MARATHON':
      // Focus on tendon stiffness with minimal stress
      return exercises.filter(ex => ex.intensity === 'LOW');

    default:
      return exercises;
  }
}

/**
 * Calculate weekly plyometric volume by experience level
 */
function getWeeklyVolume(experienceLevel: string, trainingPhase: string): number {
  const baseVolumes: { [key: string]: number } = {
    'BEGINNER': 80,      // 60-100 contacts per session, 1-2x weekly = 80-120
    'INTERMEDIATE': 160,  // 80-120 contacts per session, 2x weekly = 160-240
    'ADVANCED': 240,     // 120-200 contacts per session, 2x weekly = 240-400
    'ELITE': 400        // 150-300 contacts per session, 2x weekly = 300-600
  };

  let volume = baseVolumes[experienceLevel] || 160;

  // Adjust for training phase
  switch (trainingPhase) {
    case 'BASE':
      volume *= 0.8;  // Reduced during base building
      break;
    case 'BUILD':
      volume *= 1.0;  // Full volume
      break;
    case 'PEAK':
      volume *= 0.7;  // Reduced during peak phase
      break;
    case 'COMPETITION':
      volume *= 0.4;  // Minimal during competition
      break;
  }

  return Math.round(volume);
}

/**
 * Get training frequency for plyometrics
 */
function getFrequency(experienceLevel: string, trainingPhase: string): number {
  if (trainingPhase === 'COMPETITION') return 1; // Once weekly max during competition

  switch (experienceLevel) {
    case 'BEGINNER': return 1; // Once weekly
    case 'INTERMEDIATE': return 2; // Twice weekly
    case 'ADVANCED': return 2; // Twice weekly
    case 'ELITE': return 2; // Twice weekly (base/build), 1x (competition)
    default: return 2;
  }
}

/**
 * Get intensity distribution for plyometric training
 */
function getIntensityDistribution(
  experienceLevel: string,
  trainingPhase: string
): { [key in PlyometricIntensity]: number } {

  // Base distributions by experience
  const distributions: { [key: string]: { [key in PlyometricIntensity]: number } } = {
    'BEGINNER': { LOW: 0.8, MODERATE: 0.2, HIGH: 0.0 },
    'INTERMEDIATE': { LOW: 0.5, MODERATE: 0.4, HIGH: 0.1 },
    'ADVANCED': { LOW: 0.3, MODERATE: 0.5, HIGH: 0.2 },
    'ELITE': { LOW: 0.2, MODERATE: 0.5, HIGH: 0.3 }
  };

  let distribution = distributions[experienceLevel] || distributions['INTERMEDIATE'];

  // Adjust for training phase
  if (trainingPhase === 'PEAK' || trainingPhase === 'COMPETITION') {
    // Increase high-intensity percentage during peak/competition
    distribution = {
      LOW: distribution.LOW * 0.7,
      MODERATE: distribution.MODERATE * 0.8,
      HIGH: distribution.HIGH * 1.5
    };

    // Normalize to 100%
    const total = distribution.LOW + distribution.MODERATE + distribution.HIGH;
    distribution.LOW /= total;
    distribution.MODERATE /= total;
    distribution.HIGH /= total;
  }

  return distribution;
}

/**
 * Assess plyometric readiness and safety
 */
export function assessPlyometricReadiness(
  strengthLevels: { [exercise: string]: number },
  injuryHistory: string[],
  currentReadiness: number
): {
  cleared: boolean;
  restrictions: string[];
  recommendations: string[];
} {

  const restrictions: string[] = [];
  const recommendations: string[] = [];
  let cleared = true;

  // Strength prerequisites
  if (!strengthLevels['bodyweight_squat'] || strengthLevels['bodyweight_squat'] < 20) {
    cleared = false;
    restrictions.push('Must complete 20+ bodyweight squats before plyometrics');
  }

  if (!strengthLevels['single_leg_balance'] || strengthLevels['single_leg_balance'] < 30) {
    cleared = false;
    restrictions.push('Must balance on single leg 30+ seconds');
  }

  // Injury history considerations
  const recentInjuries = injuryHistory.filter(injury =>
    ['STRESS_FRACTURE', 'ACHILLES', 'PLANTAR_FASCIITIS'].includes(injury)
  );

  if (recentInjuries.length > 0) {
    restrictions.push('Start with low-impact only due to injury history');
    recommendations.push('Progress very conservatively');
  }

  // Readiness requirements
  if (currentReadiness < 7.0) {
    cleared = false;
    restrictions.push('Readiness score too low for plyometric training');
    recommendations.push('Wait for readiness >7.0 before starting');
  }

  return { cleared, restrictions, recommendations };
}
