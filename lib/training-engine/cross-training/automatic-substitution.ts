/**
 * Automatic Cross-Training Substitution
 *
 * Automatically replaces running workouts with cross-training equivalents
 * when injury is detected or load reduction is required
 */

import { CrossTrainingModality, WorkoutConversion } from './types';
import { convertRunningWorkout, MODALITY_EQUIVALENCIES } from './modality-equivalencies';

// Import InjuryDecision type from injury management
interface InjuryDecision {
  decision: string;
  severity: string;
  reasoning: string;
  modifications?: any[];
}

/**
 * Automatically substitute running workout with cross-training
 */
export function automaticWorkoutSubstitution(
  originalWorkout: any,
  injuryDecision: InjuryDecision,
  availableModalities: CrossTrainingModality[],
  athletePreferences?: CrossTrainingModality[]
): WorkoutConversion | { error: string } {

  // Determine appropriate modality based on injury
  const recommendedModality = selectOptimalModality(
    injuryDecision,
    originalWorkout.type,
    availableModalities,
    athletePreferences
  );

  if (!recommendedModality) {
    return { error: 'No suitable cross-training modality available for this injury/workout combination' };
  }

  // Convert the workout
  const conversion = convertRunningWorkout(originalWorkout, recommendedModality);

  // Add injury-specific modifications
  conversion.convertedWorkout = applyInjurySpecificModifications(
    conversion.convertedWorkout,
    injuryDecision
  );

  // Add substitution reasoning
  conversion.notes.unshift(`Automatic substitution due to: ${injuryDecision.reasoning}`);

  return conversion;
}

/**
 * Select optimal cross-training modality based on injury and workout type
 */
function selectOptimalModality(
  injuryDecision: InjuryDecision,
  workoutType: string,
  availableModalities: CrossTrainingModality[],
  preferences?: CrossTrainingModality[]
): CrossTrainingModality | null {

  // Injury-specific modality recommendations
  const injuryModalityMap: { [key: string]: CrossTrainingModality[] } = {
    'STRESS_FRACTURE': ['DEEP_WATER_RUNNING', 'SWIMMING', 'CYCLING'],
    'PLANTAR_FASCIITIS': ['DEEP_WATER_RUNNING', 'CYCLING', 'ELLIPTICAL'],
    'ACHILLES_TENDINOPATHY': ['DEEP_WATER_RUNNING', 'CYCLING', 'SWIMMING'],
    'IT_BAND_SYNDROME': ['DEEP_WATER_RUNNING', 'ELLIPTICAL', 'SWIMMING'],
    'PATELLOFEMORAL_PAIN': ['DEEP_WATER_RUNNING', 'SWIMMING', 'CYCLING'],
    'SHIN_SPLINTS': ['DEEP_WATER_RUNNING', 'CYCLING', 'SWIMMING'],
    'HIP_FLEXOR_STRAIN': ['DEEP_WATER_RUNNING', 'SWIMMING'],
    'HAMSTRING_STRAIN': ['DEEP_WATER_RUNNING', 'CYCLING', 'ELLIPTICAL'],
    'GENERAL': ['DEEP_WATER_RUNNING', 'CYCLING', 'ELLIPTICAL']
  };

  // Get recommended modalities for this injury
  const recommendedForInjury = injuryModalityMap['GENERAL'] || ['DEEP_WATER_RUNNING', 'CYCLING'];

  // Filter by available modalities
  const viableOptions = recommendedForInjury.filter(modality =>
    availableModalities.includes(modality)
  );

  if (viableOptions.length === 0) {
    return null;
  }

  // Prioritize by workout type
  if (workoutType === 'INTERVALS' || workoutType === 'THRESHOLD') {
    // High-intensity workouts best maintained with DWR
    if (viableOptions.includes('DEEP_WATER_RUNNING')) {
      return 'DEEP_WATER_RUNNING';
    }
  }

  if (workoutType === 'LONG' || workoutType === 'EASY') {
    // Volume workouts can use cycling effectively
    if (viableOptions.includes('CYCLING')) {
      return 'CYCLING';
    }
  }

  // Apply athlete preferences
  if (preferences) {
    for (const preferred of preferences) {
      if (viableOptions.includes(preferred)) {
        return preferred;
      }
    }
  }

  // Default to best option available
  const priorityOrder: CrossTrainingModality[] = [
    'DEEP_WATER_RUNNING',  // Best for fitness retention
    'ALTERG',              // Best for mechanics if available
    'CYCLING',             // Good for volume
    'ELLIPTICAL',          // Moderate similarity
    'ROWING',              // Good aerobic stimulus
    'SWIMMING'             // Best for recovery
  ];

  for (const modality of priorityOrder) {
    if (viableOptions.includes(modality)) {
      return modality;
    }
  }

  return viableOptions[0];
}

/**
 * Apply injury-specific modifications to cross-training workout
 */
function applyInjurySpecificModifications(
  workout: any,
  injuryDecision: InjuryDecision
): any {

  const modified = { ...workout };

  // Reduce intensity if injury is severe
  if (injuryDecision.severity === 'RED' || injuryDecision.severity === 'CRITICAL') {
    modified.intensity = 'EASY';
    modified.structure.mainSet = modified.structure.mainSet.map((interval: any) => ({
      ...interval,
      intensity: 'EASY',
      modalityNotes: 'Reduced intensity due to injury severity'
    }));
  }

  // Add injury-specific equipment settings
  if (workout.modality === 'ALTERG') {
    modified.equipmentSettings = {
      ...modified.equipmentSettings,
      bodyWeightSupport: 70, // Start conservative
      incline: 0 // Flat initially
    };
  }

  // Add monitoring requirements
  modified.structure.monitoring = {
    painCheck: 'Monitor pain every 5 minutes',
    stopCriteria: 'Stop if pain >2/10 or gait changes',
    adaptations: 'Adjust intensity/duration as needed'
  };

  return modified;
}

/**
 * Generate weekly cross-training schedule
 */
export function generateCrossTrainingSchedule(
  originalRunningWeek: any,
  injuryType: string,
  availableModalities: CrossTrainingModality[],
  targetTSS: number
): {
  schedule: any[];
  totalTSS: number;
  fitnessRetention: number;
  recommendations: string[];
} {

  const schedule: any[] = [];
  let totalTSS = 0;

  // Convert each running session
  originalRunningWeek.forEach((session: any, dayIndex: number) => {
    if (session.type === 'REST') {
      schedule.push(session);
      return;
    }

    // Select modality for this session
    const modality = selectModalityForSession(session, injuryType, availableModalities);

    if (modality) {
      const conversion = convertRunningWorkout(session, modality);
      schedule.push({
        day: dayIndex + 1,
        originalSession: session,
        crossTrainingSession: conversion.convertedWorkout,
        notes: conversion.notes
      });
      totalTSS += conversion.convertedWorkout.estimatedTSS;
    } else {
      // Convert to rest day if no suitable modality
      schedule.push({
        day: dayIndex + 1,
        type: 'REST',
        reason: 'No suitable cross-training modality available'
      });
    }
  });

  // Calculate overall fitness retention
  const modalitiesUsed = schedule
    .filter(s => s.crossTrainingSession)
    .map(s => s.crossTrainingSession.modality);

  const avgRetention = modalitiesUsed.length > 0
    ? modalitiesUsed
      .map((modality: keyof typeof MODALITY_EQUIVALENCIES) => MODALITY_EQUIVALENCIES[modality].fitnessRetention)
      .reduce((sum, retention) => sum + retention, 0) / modalitiesUsed.length
    : 0;

  const recommendations = generateScheduleRecommendations(schedule, avgRetention, targetTSS);

  return {
    schedule,
    totalTSS,
    fitnessRetention: avgRetention,
    recommendations
  };
}

function selectModalityForSession(
  session: any,
  injuryType: string,
  availableModalities: CrossTrainingModality[]
): CrossTrainingModality | null {

  // Prioritize modalities based on session type
  if (session.type === 'INTERVALS' || session.type === 'THRESHOLD') {
    // High-intensity sessions best with DWR
    if (availableModalities.includes('DEEP_WATER_RUNNING')) {
      return 'DEEP_WATER_RUNNING';
    }
    if (availableModalities.includes('ALTERG')) {
      return 'ALTERG';
    }
  }

  if (session.type === 'LONG' || session.type === 'EASY') {
    // Volume sessions work well with cycling
    if (availableModalities.includes('CYCLING')) {
      return 'CYCLING';
    }
    if (availableModalities.includes('DEEP_WATER_RUNNING')) {
      return 'DEEP_WATER_RUNNING';
    }
  }

  // Default to best available option
  const priorityOrder: CrossTrainingModality[] = [
    'DEEP_WATER_RUNNING', 'ALTERG', 'CYCLING', 'ELLIPTICAL', 'ROWING', 'SWIMMING'
  ];

  for (const modality of priorityOrder) {
    if (availableModalities.includes(modality)) {
      return modality;
    }
  }

  return null;
}

function generateScheduleRecommendations(
  schedule: any[],
  avgRetention: number,
  targetTSS: number
): string[] {

  const recommendations: string[] = [];

  if (avgRetention >= 0.90) {
    recommendations.push('✅ Excellent fitness retention expected');
    recommendations.push('Maintain current cross-training approach');
  } else if (avgRetention >= 0.75) {
    recommendations.push('Good fitness retention expected');
    recommendations.push('Consider adding minimal running if injury allows');
  } else {
    recommendations.push('⚠️ Moderate fitness retention - plan extended rebuild');
    recommendations.push('Focus on maintaining aerobic base');
    recommendations.push('Consider increasing cross-training volume if tolerated');
  }

  const actualTSS = schedule.reduce((sum, session) =>
    sum + (session.crossTrainingSession?.estimatedTSS || 0), 0
  );

  if (actualTSS < targetTSS * 0.8) {
    recommendations.push('Consider increasing session duration to match target training load');
  }

  return recommendations;
}
