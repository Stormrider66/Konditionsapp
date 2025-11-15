/**
 * Cross-Training Modality Equivalencies
 *
 * Research-validated conversion factors for maintaining fitness
 * during injury periods or adding training variety
 */

import {
  ModalityEquivalency,
  CrossTrainingModality,
  WorkoutConversion,
  RunningWorkout,
  CrossTrainingWorkout,
  CrossTrainingStructure,
  CrossTrainingInterval,
  EquipmentSettings
} from './types';

/**
 * Validated equivalency factors for each cross-training modality
 */
export const MODALITY_EQUIVALENCIES: { [key in CrossTrainingModality]: ModalityEquivalency } = {
  DEEP_WATER_RUNNING: {
    modality: 'DEEP_WATER_RUNNING',
    fitnessRetention: 0.98,          // 98% fitness retention (research: 95-100%)
    tssMultiplier: 1.0,              // 1:1 TSS conversion
    hrAdjustment: -10,               // 10 bpm lower due to hydrostatic pressure
    timeMultiplier: 1.0,             // Same duration
    biomechanicalSimilarity: 0.85,   // High similarity to running mechanics
  },

  CYCLING: {
    modality: 'CYCLING',
    fitnessRetention: 0.75,          // 75% fitness retention (research: 70-80%)
    tssMultiplier: 1.33,             // Need 33% more TSS for equivalent stimulus
    distanceRatio: 3.0,              // 3km cycling ≈ 1km running
    hrAdjustment: 0,                 // No HR adjustment needed
    timeMultiplier: 1.5,             // 1.5x time for equivalent aerobic stimulus
    biomechanicalSimilarity: 0.35,   // Low similarity to running
  },

  ELLIPTICAL: {
    modality: 'ELLIPTICAL',
    fitnessRetention: 0.65,          // 65% fitness retention (research: 60-70%)
    tssMultiplier: 1.2,              // 20% more TSS needed
    hrAdjustment: 0,                 // No significant HR adjustment
    timeMultiplier: 1.3,             // 30% more time
    biomechanicalSimilarity: 0.60,   // Moderate similarity
  },

  SWIMMING: {
    modality: 'SWIMMING',
    fitnessRetention: 0.45,          // 45% fitness retention (research: 40-50%)
    tssMultiplier: 0.8,              // Lower TSS due to different movement
    hrAdjustment: -15,               // 15 bpm lower (horizontal position + cooling)
    timeMultiplier: 1.0,             // Same duration
    biomechanicalSimilarity: 0.20,   // Very different from running
  },

  ALTERG: {
    modality: 'ALTERG',
    fitnessRetention: 0.90,          // 90% retention (depends on body weight support)
    tssMultiplier: 1.0,              // Same TSS when at 100% body weight
    hrAdjustment: 0,                 // No adjustment at full body weight
    timeMultiplier: 1.0,             // Same duration
    biomechanicalSimilarity: 1.0,    // Identical to running when at 100% BW
  },

  ROWING: {
    modality: 'ROWING',
    fitnessRetention: 0.68,          // 68% retention (research: 60-75%)
    tssMultiplier: 1.1,              // 10% more TSS needed
    hrAdjustment: 5,                 // 5 bpm higher (full body engagement)
    timeMultiplier: 1.2,             // 20% more time
    biomechanicalSimilarity: 0.25,   // Different movement pattern
  }
};

/**
 * Convert running workout to cross-training equivalent
 */
export function convertRunningWorkout(
  runningWorkout: RunningWorkout,
  targetModality: CrossTrainingModality,
  injuryRestrictions?: string[]
): WorkoutConversion {

  const equivalency = MODALITY_EQUIVALENCIES[targetModality];

  // Calculate converted parameters
  const convertedDuration = Math.round(runningWorkout.duration * equivalency.timeMultiplier);
  const convertedTSS = Math.round(runningWorkout.tss * equivalency.tssMultiplier);
  const adjustedHR = runningWorkout.targetHR ? runningWorkout.targetHR + equivalency.hrAdjustment : undefined;

  // Convert distance if applicable
  let convertedDistance;
  if (runningWorkout.distance && equivalency.distanceRatio) {
    convertedDistance = runningWorkout.distance * equivalency.distanceRatio;
  }

  // Convert workout structure
  const convertedStructure = convertWorkoutStructure(
    runningWorkout.structure,
    targetModality,
    equivalency
  );

  const convertedWorkout: CrossTrainingWorkout = {
    modality: targetModality,
    duration: convertedDuration,
    distance: convertedDistance,
    intensity: runningWorkout.intensity,
    structure: convertedStructure,
    targetHR: adjustedHR,
    estimatedTSS: convertedTSS,
    equipmentSettings: getEquipmentSettings(targetModality, runningWorkout)
  };

  // Generate conversion notes
  const notes = generateConversionNotes(runningWorkout, convertedWorkout, equivalency);

  return {
    originalWorkout: runningWorkout,
    convertedWorkout,
    conversionRatio: equivalency.biomechanicalSimilarity,
    fitnessRetention: equivalency.fitnessRetention,
    notes
  };
}

/**
 * Convert workout structure between modalities
 */
function convertWorkoutStructure(
  runningStructure: any,
  modality: CrossTrainingModality,
  equivalency: ModalityEquivalency
): CrossTrainingStructure {

  // Base structure conversion
  const structure: CrossTrainingStructure = {
    warmup: {
      duration: runningStructure.warmup?.duration || 10,
      intensity: 'EASY'
    },
    mainSet: convertMainSet(runningStructure.mainSet, modality, equivalency),
    cooldown: {
      duration: runningStructure.cooldown?.duration || 10,
      intensity: 'EASY'
    }
  };

  // Add modality-specific elements
  switch (modality) {
    case 'DEEP_WATER_RUNNING':
      structure.modalitySpecific = {
        cadence: 180,              // Steps per minute
        form: 'Upright posture, high knee lift, compact back kick',
        equipment: 'Flotation belt optional after technique mastery'
      };
      break;

    case 'CYCLING':
      structure.modalitySpecific = {
        cadence: '85-95',          // RPM
        position: 'Aerodynamic but comfortable',
        gearing: 'Maintain cadence, adjust resistance'
      };
      break;

    case 'ELLIPTICAL':
      structure.modalitySpecific = {
        cadence: 90,               // Steps per minute
        incline: 'Moderate for running-like motion',
        resistance: 'Adjust for target HR'
      };
      break;

    case 'SWIMMING':
      structure.modalitySpecific = {
        strokeRate: '16-20 strokes per 25m',
        technique: 'Focus on efficiency over speed',
        breathing: 'Bilateral breathing pattern'
      };
      break;

    case 'ROWING':
      structure.modalitySpecific = {
        strokeRate: '20-24 strokes per minute',
        technique: 'Legs-core-arms sequence',
        damper: 'Setting 3-5 for aerobic work'
      };
      break;

    case 'ALTERG':
      structure.modalitySpecific = {
        calibration: 'Calibrate body weight support before each session',
        form: 'Maintain natural running form',
        monitoring: 'Track gait symmetry and pain levels'
      };
      break;
  }

  return structure;
}

/**
 * Convert running intervals to cross-training intervals
 */
function convertMainSet(
  runningIntervals: any[],
  modality: CrossTrainingModality,
  equivalency: ModalityEquivalency
): CrossTrainingInterval[] {

  if (!runningIntervals || runningIntervals.length === 0) {
    return [{
      duration: 20,
      intensity: 'MODERATE',
      recovery: 0,
      repetitions: 1,
      modalityNotes: 'Continuous effort'
    }];
  }

  return runningIntervals.map(interval => ({
    duration: Math.round(interval.duration * equivalency.timeMultiplier),
    intensity: convertIntensity(interval.intensity, modality),
    recovery: Math.round(interval.recovery * equivalency.timeMultiplier),
    repetitions: interval.repetitions,
    modalityNotes: getModalityNotes(interval, modality)
  }));
}

/**
 * Convert running intensity to cross-training equivalent
 */
function convertIntensity(runningIntensity: string, modality: CrossTrainingModality): string {
  const intensityMap: { [key: string]: { [key in CrossTrainingModality]: string } } = {
    'Z1': {
      DEEP_WATER_RUNNING: 'Easy water running',
      CYCLING: 'Zone 2 cycling',
      ELLIPTICAL: 'Easy elliptical',
      SWIMMING: 'Easy swimming',
      ALTERG: 'Easy pace at current body weight',
      ROWING: 'Easy rowing'
    },
    'Z2': {
      DEEP_WATER_RUNNING: 'Moderate water running',
      CYCLING: 'Zone 2-3 cycling',
      ELLIPTICAL: 'Moderate elliptical',
      SWIMMING: 'Moderate swimming',
      ALTERG: 'Moderate pace at current body weight',
      ROWING: 'Moderate rowing'
    },
    'Z4': {
      DEEP_WATER_RUNNING: 'Hard water running (match RPE)',
      CYCLING: 'Threshold cycling',
      ELLIPTICAL: 'Hard elliptical',
      SWIMMING: 'Threshold swimming',
      ALTERG: 'Threshold pace at current body weight',
      ROWING: 'Threshold rowing'
    },
    'EASY': {
      DEEP_WATER_RUNNING: 'Easy water running',
      CYCLING: 'Easy cycling',
      ELLIPTICAL: 'Easy elliptical',
      SWIMMING: 'Easy swimming',
      ALTERG: 'Easy running',
      ROWING: 'Easy rowing'
    },
    'MODERATE': {
      DEEP_WATER_RUNNING: 'Moderate water running',
      CYCLING: 'Moderate cycling',
      ELLIPTICAL: 'Moderate elliptical',
      SWIMMING: 'Moderate swimming',
      ALTERG: 'Moderate running',
      ROWING: 'Moderate rowing'
    }
  };

  return intensityMap[runningIntensity]?.[modality] || 'Moderate effort';
}

function getModalityNotes(interval: any, modality: CrossTrainingModality): string {
  switch (modality) {
    case 'DEEP_WATER_RUNNING':
      return 'Maintain 180 step cadence, focus on form';
    case 'CYCLING':
      return 'Maintain 85-95 RPM cadence';
    case 'ELLIPTICAL':
      return 'Use arms actively, maintain 90 SPM';
    case 'SWIMMING':
      return 'Focus on stroke efficiency';
    case 'ROWING':
      return 'Maintain consistent stroke rate';
    case 'ALTERG':
      return 'Monitor pain and gait symmetry';
    default:
      return 'Match effort level of original workout';
  }
}

function getEquipmentSettings(modality: CrossTrainingModality, runningWorkout: RunningWorkout): EquipmentSettings {
  switch (modality) {
    case 'ALTERG':
      return {
        bodyWeightSupport: 80, // Start at 80% body weight
        incline: 1             // Slight incline
      };
    case 'CYCLING':
      return {
        cadence: 90,
        resistance: 'Moderate'
      };
    case 'ELLIPTICAL':
      return {
        incline: 5,
        resistance: 'Moderate'
      };
    case 'SWIMMING':
      return {
        strokeRate: 18
      };
    case 'ROWING':
      return {
        strokeRate: 22
      };
    default:
      return {};
  }
}

function generateConversionNotes(
  original: RunningWorkout,
  converted: CrossTrainingWorkout,
  equivalency: ModalityEquivalency
): string[] {

  const notes: string[] = [];

  notes.push(`Converted ${original.type} run to ${converted.modality.toLowerCase().replace(/_/g, ' ')}`);
  notes.push(`Expected fitness retention: ${Math.round(equivalency.fitnessRetention * 100)}%`);

  if (equivalency.hrAdjustment !== 0) {
    const adjustment = equivalency.hrAdjustment > 0 ? 'higher' : 'lower';
    notes.push(`Heart rate typically ${Math.abs(equivalency.hrAdjustment)} bpm ${adjustment} than running`);
  }

  if (converted.duration !== original.duration) {
    notes.push(`Duration adjusted from ${original.duration} to ${converted.duration} minutes`);
  }

  // Modality-specific notes
  switch (converted.modality) {
    case 'DEEP_WATER_RUNNING':
      notes.push('Excellent running fitness maintenance - closest equivalent to running');
      notes.push('Can perform all workout types including intervals and threshold work');
      break;

    case 'CYCLING':
      notes.push('Good aerobic fitness maintenance, less running-specific');
      notes.push('Focus on maintaining cadence rather than speed');
      break;

    case 'SWIMMING':
      notes.push('Excellent for active recovery, less for maintaining run fitness');
      notes.push('Focus on technique and rhythm rather than speed');
      break;

    case 'ELLIPTICAL':
      notes.push('Moderate fitness retention with biomechanical similarity to running');
      notes.push('Use arms actively for full-body engagement');
      break;

    case 'ALTERG':
      notes.push('Excellent for graduated return to running with reduced impact');
      notes.push('Biomechanics preserved at ≥80% body weight');
      break;

    case 'ROWING':
      notes.push('Good aerobic stimulus with full-body engagement');
      notes.push('Focus on proper technique: legs-core-arms sequence');
      break;
  }

  return notes;
}
