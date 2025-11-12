# Phase 18: Cross-Training Integration System

**Duration:** Week 24 (8-10 hours)
**Prerequisites:** [Phase 1: Database](./PHASE_01_DATABASE.md), [Phase 15: Injury Management](./PHASE_15_INJURY_MANAGEMENT.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 17 Quality Programming](./PHASE_17_QUALITY_PROGRAMMING.md)
- [Next: Updated Master Plan](./MASTER_PLAN.md)

---

## Overview

Implement **comprehensive cross-training integration system** that maintains fitness during injury periods using validated equivalencies and enables seamless substitution of running workouts with alternative modalities.

### What We're Building

**Cross-Training Components:**

1. **Modality Equivalencies** - TSS conversions for 6 major cross-training types
2. **Fitness Retention Calculator** - Predict fitness maintenance during injury
3. **Workout Conversion Engine** - Transform running workouts to cross-training equivalents
4. **Progressive Return Integration** - Blend cross-training with return-to-running protocols
5. **AlterG Progression System** - Body weight support protocols
6. **Heart Rate Adjustments** - Sport-specific HR zone modifications
7. **Effectiveness Tracking** - Monitor fitness retention during cross-training periods
8. **Automatic Substitution** - Replace running workouts when injury detected

### Research-Validated Equivalencies

- ✅ **Deep Water Running**: 95-100% fitness retention, 100% VO2max maintenance
- ✅ **Cycling**: 70-80% fitness retention, 3:1 distance ratio
- ✅ **Elliptical**: 60-70% fitness retention, biomechanically closer to running
- ✅ **Swimming**: 40-50% fitness retention, excellent for active recovery
- ✅ **AlterG**: 80-95% fitness retention with graduated loading
- ✅ **Rowing**: 60-75% fitness retention, full-body engagement

---

## Implementation

### File Structure

```
lib/training-engine/
└── cross-training/
    ├── index.ts                    # Main exports
    ├── types.ts                    # TypeScript interfaces
    ├── modality-equivalencies.ts   # TSS and time conversions
    ├── fitness-retention.ts        # Predict fitness maintenance
    ├── workout-conversion.ts       # Transform workouts between modalities
    ├── progressive-return.ts       # Integration with return-to-running
    ├── alterg-protocols.ts         # Anti-gravity treadmill progression
    ├── heart-rate-adjustments.ts   # Sport-specific HR modifications
    ├── effectiveness-tracking.ts   # Monitor outcomes
    └── automatic-substitution.ts   # Replace workouts during injury
```

---

## Task 18.1: Types and Cross-Training Interfaces

**File:** `lib/training-engine/cross-training/types.ts`

```typescript
/**
 * Cross-Training Integration Type Definitions
 */

export type CrossTrainingModality = 
  | 'DEEP_WATER_RUNNING'
  | 'CYCLING'
  | 'ELLIPTICAL'
  | 'SWIMMING'
  | 'ALTERG'
  | 'ROWING';

export interface ModalityEquivalency {
  modality: CrossTrainingModality;
  fitnessRetention: number;        // % of running fitness maintained
  tssMultiplier: number;           // TSS conversion factor
  distanceRatio?: number;          // Distance conversion (3km cycling = 1km running)
  hrAdjustment: number;            // bpm adjustment from running zones
  timeMultiplier: number;          // Time conversion factor
  biomechanicalSimilarity: number; // % similarity to running mechanics
}

export interface WorkoutConversion {
  originalWorkout: RunningWorkout;
  convertedWorkout: CrossTrainingWorkout;
  conversionRatio: number;         // Confidence in equivalency
  fitnessRetention: number;        // Expected fitness maintenance
  notes: string[];
}

export interface CrossTrainingWorkout {
  modality: CrossTrainingModality;
  duration: number;                // minutes
  distance?: number;               // km (if applicable)
  intensity: string;               // Zone or description
  structure: CrossTrainingStructure;
  targetHR?: number;               // Adjusted for modality
  targetPower?: number;            // Watts (cycling)
  estimatedTSS: number;
  equipmentSettings?: EquipmentSettings;
}

export interface CrossTrainingStructure {
  warmup: {
    duration: number;
    intensity: string;
  };
  mainSet: CrossTrainingInterval[];
  cooldown: {
    duration: number;
    intensity: string;
  };
  modalitySpecific?: any;          // Stroke rate, cadence, etc.
}

export interface CrossTrainingInterval {
  duration: number;                // minutes
  intensity: string;
  recovery: number;                // minutes
  repetitions: number;
  modalityNotes?: string;          // Specific guidance
}

export interface EquipmentSettings {
  bodyWeightSupport?: number;      // % for AlterG
  resistance?: string;             // Elliptical/bike resistance
  incline?: number;                // Treadmill/bike incline
  strokeRate?: number;             // Swimming strokes/min
  cadence?: number;                // Cycling RPM
}

export interface FitnessRetentionPrediction {
  modality: CrossTrainingModality;
  duration: number;                // weeks of cross-training
  expectedRetention: {
    vo2max: number;                // % retained
    lactateThreshold: number;      // % retained
    runningEconomy: number;        // % retained
    overall: number;               // % overall fitness retained
  };
  returnToRunningTimeline: string;
  recommendations: string[];
}

export interface AlterGProgression {
  phase: 'INITIAL' | 'BUILDING' | 'ADVANCED' | 'RETURN_PREP';
  bodyWeightSupport: number;       // % support (100% = no support)
  duration: number;                // minutes
  intensity: string;
  progressionCriteria: string;
  nextPhase: string;
}

interface RunningWorkout {
  type: string;
  duration: number;
  distance?: number;
  intensity: string;
  structure: any;
  targetHR?: number;
  tss: number;
}
```

---

## Task 18.2: Modality Equivalencies Calculator

**File:** `lib/training-engine/cross-training/modality-equivalencies.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, cross-training research

```typescript
/**
 * Cross-Training Modality Equivalencies
 * 
 * Research-validated conversion factors for maintaining fitness
 * during injury periods or adding training variety
 */

import { ModalityEquivalency, CrossTrainingModality } from './types';

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
        cadence: 85-95,            // RPM
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
    'Z4': {
      DEEP_WATER_RUNNING: 'Hard water running (match RPE)',
      CYCLING: 'Threshold cycling',
      ELLIPTICAL: 'Hard elliptical',
      SWIMMING: 'Threshold swimming',
      ALTERG: 'Threshold pace at current body weight',
      ROWING: 'Threshold rowing'
    }
    // Additional intensity mappings...
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
  
  notes.push(`Converted ${original.type} run to ${converted.modality.toLowerCase()}`);
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
  }
  
  return notes;
}
```

---

## Task 18.3: Fitness Retention Calculator

**File:** `lib/training-engine/cross-training/fitness-retention.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, fitness retention research

```typescript
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
  }
  
  // Blended training recommendations
  if (runningPercentage > 0) {
    recommendations.push(`✅ Maintaining ${Math.round(runningPercentage * 100)}% running - excellent for specificity`);
    recommendations.push('Prioritize running sessions for quality work');
    recommendations.push('Use cross-training for volume and recovery');
  }
  
  return recommendations;
}
```

---

## Task 18.4: AlterG Progression System

**File:** `lib/training-engine/cross-training/alterg-protocols.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, AlterG research

```typescript
/**
 * Anti-Gravity Treadmill (AlterG) Progression System
 * 
 * Graduated return to running with precise body weight support
 * Research shows biomechanics preserved at ≥80% body weight
 */

import { AlterGProgression } from './types';

/**
 * Generate AlterG progression protocol
 */
export function generateAlterGProgression(
  injuryType: string,
  severity: 'MILD' | 'MODERATE' | 'SEVERE',
  currentPhase: string,
  weeksInCrossTraining: number
): AlterGProgression[] {
  
  let progression: AlterGProgression[];
  
  switch (severity) {
    case 'MILD':
      progression = getMildInjuryProgression();
      break;
    case 'MODERATE':
      progression = getModerateInjuryProgression();
      break;
    case 'SEVERE':
      progression = getSevereInjuryProgression();
      break;
  }
  
  // Adjust for specific injury types
  return adjustForInjuryType(progression, injuryType);
}

/**
 * Mild injury progression (4-6 weeks)
 */
function getMildInjuryProgression(): AlterGProgression[] {
  return [
    {
      phase: 'INITIAL',
      bodyWeightSupport: 70, // 30% unweighting
      duration: 15,
      intensity: 'Easy pace',
      progressionCriteria: 'Pain-free for 3 consecutive sessions',
      nextPhase: 'Increase body weight to 80%'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 80, // 20% unweighting
      duration: 25,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 5 consecutive sessions',
      nextPhase: 'Increase body weight to 90%'
    },
    {
      phase: 'ADVANCED',
      bodyWeightSupport: 90, // 10% unweighting
      duration: 35,
      intensity: 'Easy to tempo',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Progress to 100% body weight'
    },
    {
      phase: 'RETURN_PREP',
      bodyWeightSupport: 100, // Full body weight
      duration: 45,
      intensity: 'Full range including quality work',
      progressionCriteria: 'Pain-free quality work for 1 week',
      nextPhase: 'Transition to ground running'
    }
  ];
}

/**
 * Moderate injury progression (6-8 weeks)
 */
function getModerateInjuryProgression(): AlterGProgression[] {
  return [
    {
      phase: 'INITIAL',
      bodyWeightSupport: 50, // 50% unweighting
      duration: 10,
      intensity: 'Walking to easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase body weight to 65%'
    },
    {
      phase: 'INITIAL',
      bodyWeightSupport: 65, // 35% unweighting
      duration: 20,
      intensity: 'Easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase body weight to 80%'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 80,
      duration: 30,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase body weight to 90%'
    },
    {
      phase: 'ADVANCED',
      bodyWeightSupport: 90,
      duration: 40,
      intensity: 'Easy to tempo',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Progress to 100% body weight'
    },
    {
      phase: 'RETURN_PREP',
      bodyWeightSupport: 100,
      duration: 50,
      intensity: 'Full range',
      progressionCriteria: 'Pain-free full training for 2 weeks',
      nextPhase: 'Transition to ground running'
    }
  ];
}

/**
 * Severe injury progression (8-12 weeks)
 */
function getSevereInjuryProgression(): AlterGProgression[] {
  return [
    {
      phase: 'INITIAL',
      bodyWeightSupport: 30, // 70% unweighting
      duration: 5,
      intensity: 'Walking only',
      progressionCriteria: 'Pain-free walking for 1 week',
      nextPhase: 'Begin easy jogging at 40% body weight'
    },
    {
      phase: 'INITIAL',
      bodyWeightSupport: 40,
      duration: 10,
      intensity: 'Walking to easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase to 50% body weight'
    },
    {
      phase: 'INITIAL',
      bodyWeightSupport: 50,
      duration: 15,
      intensity: 'Easy jogging',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase to 65% body weight'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 65,
      duration: 25,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 1 week',
      nextPhase: 'Increase to 80% body weight'
    },
    {
      phase: 'BUILDING',
      bodyWeightSupport: 80,
      duration: 35,
      intensity: 'Easy to moderate',
      progressionCriteria: 'Pain-free for 2 weeks',
      nextPhase: 'Increase to 90% body weight'
    },
    {
      phase: 'ADVANCED',
      bodyWeightSupport: 90,
      duration: 45,
      intensity: 'Easy to tempo',
      progressionCriteria: 'Pain-free for 2 weeks',
      nextPhase: 'Progress to 100% body weight'
    },
    {
      phase: 'RETURN_PREP',
      bodyWeightSupport: 100,
      duration: 60,
      intensity: 'Full range including quality work',
      progressionCriteria: 'Pain-free full training for 3 weeks',
      nextPhase: 'Transition to ground running'
    }
  ];
}

/**
 * Adjust progression for specific injury types
 */
function adjustForInjuryType(
  progression: AlterGProgression[],
  injuryType: string
): AlterGProgression[] {
  
  const adjusted = [...progression];
  
  switch (injuryType) {
    case 'STRESS_FRACTURE':
      // More conservative progression, longer at each phase
      adjusted.forEach(phase => {
        phase.bodyWeightSupport = Math.max(30, phase.bodyWeightSupport - 10); // More unweighting
        phase.progressionCriteria = phase.progressionCriteria.replace('1 week', '2 weeks');
      });
      break;
      
    case 'PLANTAR_FASCIITIS':
      // Focus on soft landing mechanics
      adjusted.forEach(phase => {
        phase.progressionCriteria += ' + No morning pain increase';
      });
      break;
      
    case 'ACHILLES_TENDINOPATHY':
      // Avoid speed work until later phases
      adjusted.forEach((phase, index) => {
        if (index < adjusted.length - 1) {
          phase.intensity = phase.intensity.replace('tempo', 'moderate');
        }
      });
      break;
  }
  
  return adjusted;
}

/**
 * Assess readiness to progress AlterG phase
 */
export function assessAlterGProgression(
  currentPhase: AlterGProgression,
  completedSessions: number,
  painLevels: number[],
  performanceMetrics: any
): {
  readyToProgress: boolean;
  reasoning: string;
  recommendations: string[];
} {
  
  // Check minimum session requirement
  const minSessions = getMinimumSessions(currentPhase.phase);
  if (completedSessions < minSessions) {
    return {
      readyToProgress: false,
      reasoning: `Need ${minSessions - completedSessions} more sessions at current level`,
      recommendations: [`Complete ${minSessions} sessions before progressing`]
    };
  }
  
  // Check pain levels
  const maxPain = Math.max(...painLevels);
  const avgPain = painLevels.reduce((a, b) => a + b) / painLevels.length;
  
  if (maxPain > 2 || avgPain > 1) {
    return {
      readyToProgress: false,
      reasoning: 'Pain levels too high for progression',
      recommendations: [
        'All sessions must be ≤2/10 pain',
        'Consider reducing body weight support',
        'Focus on pain-free movement patterns'
      ]
    };
  }
  
  // Check biomechanics (if available)
  if (performanceMetrics?.asymmetry > 10) {
    return {
      readyToProgress: false,
      reasoning: 'Gait asymmetry detected',
      recommendations: [
        'Address asymmetry before progressing',
        'Consider physiotherapy evaluation',
        'Focus on symmetrical movement patterns'
      ]
    };
  }
  
  return {
    readyToProgress: true,
    reasoning: 'All progression criteria met',
    recommendations: [
      'Progress to next phase',
      'Continue monitoring pain and biomechanics',
      'Maintain conservative approach'
    ]
  };
}

function getMinimumSessions(phase: string): number {
  switch (phase) {
    case 'INITIAL': return 5;
    case 'BUILDING': return 7;
    case 'ADVANCED': return 7;
    case 'RETURN_PREP': return 10;
    default: return 5;
  }
}

/**
 * Calculate metabolic adjustments for body weight support
 */
export function calculateMetabolicAdjustments(
  bodyWeightSupport: number,
  targetPace: number,
  targetHR: number
): {
  adjustedPace: number;
  adjustedHR: number;
  inclineCompensation?: number;
} {
  
  // Research: HR decreases 8.6% at 20% support, 13.3% at 40% support
  const supportPercentage = (100 - bodyWeightSupport) / 100;
  const hrReduction = supportPercentage * 0.25; // 25% max HR reduction at full support
  
  // Pace adjustment - need to run faster to maintain metabolic demand
  const paceAdjustment = supportPercentage * 0.15; // 15% faster at full support
  
  // Alternative: incline compensation (every 2% incline = 6.4% VO2 increase)
  const inclineForCompensation = (supportPercentage * 0.15) / 0.064 * 2; // Convert to incline %
  
  return {
    adjustedPace: targetPace * (1 - paceAdjustment),
    adjustedHR: Math.round(targetHR * (1 - hrReduction)),
    inclineCompensation: Math.round(inclineForCompensation * 10) / 10
  };
}
```

---

## Task 18.5: Automatic Substitution System

**File:** `lib/training-engine/cross-training/automatic-substitution.ts`

```typescript
/**
 * Automatic Cross-Training Substitution
 * 
 * Automatically replaces running workouts with cross-training equivalents
 * when injury is detected or load reduction is required
 */

import { CrossTrainingModality, WorkoutConversion } from './types';
import { convertRunningWorkout } from './modality-equivalencies';
import { InjuryDecision } from '../injury-management/types';

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
    'HAMSTRING_STRAIN': ['DEEP_WATER_RUNNING', 'CYCLING', 'ELLIPTICAL']
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
  
  const avgRetention = modalitiesUsed
    .map(modality => MODALITY_EQUIVALENCIES[modality].fitnessRetention)
    .reduce((sum, retention) => sum + retention, 0) / modalitiesUsed.length;
  
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
```

---

## Acceptance Criteria

- [ ] Cross-training equivalencies implemented for all 6 major modalities with research-validated conversion factors
- [ ] Fitness retention calculator predicts VO2max, threshold, and running economy maintenance
- [ ] Workout conversion engine transforms running workouts to equivalent cross-training sessions
- [ ] AlterG progression system provides graduated body weight support protocols
- [ ] Heart rate adjustments account for modality-specific differences
- [ ] Automatic substitution system replaces running workouts during injury
- [ ] Progressive return integration blends cross-training with return-to-running protocols
- [ ] Effectiveness tracking monitors actual fitness retention vs predictions
- [ ] Integration with injury management system provides seamless workout replacement
- [ ] Coach override capabilities allow manual modality selection
- [ ] All cross-training components have comprehensive unit tests
- [ ] Athlete education materials explain proper cross-training technique
- [ ] Equipment-specific guidance provided for each modality

---

## Testing Requirements

### Unit Tests

**File:** `__tests__/cross-training/modality-equivalencies.test.ts`

```typescript
describe('Cross-Training Equivalencies', () => {
  test('deep water running maintains 1:1 time conversion', () => {
    const runningWorkout = {
      type: 'THRESHOLD',
      duration: 45,
      distance: 10,
      intensity: 'Z4',
      tss: 75,
      targetHR: 170
    };
    
    const conversion = convertRunningWorkout(runningWorkout, 'DEEP_WATER_RUNNING');
    
    expect(conversion.convertedWorkout.duration).toBe(45);
    expect(conversion.convertedWorkout.estimatedTSS).toBe(75);
    expect(conversion.convertedWorkout.targetHR).toBe(160); // -10 bpm adjustment
    expect(conversion.fitnessRetention).toBe(0.98);
  });
  
  test('cycling requires distance and time adjustment', () => {
    const runningWorkout = {
      type: 'LONG',
      duration: 90,
      distance: 20,
      intensity: 'Z2',
      tss: 100,
      targetHR: 150
    };
    
    const conversion = convertRunningWorkout(runningWorkout, 'CYCLING');
    
    expect(conversion.convertedWorkout.duration).toBe(135); // 1.5x time
    expect(conversion.convertedWorkout.distance).toBe(60);  // 3x distance
    expect(conversion.convertedWorkout.estimatedTSS).toBe(133); // 1.33x TSS
    expect(conversion.fitnessRetention).toBe(0.75);
  });
  
  test('automatic substitution selects appropriate modality', () => {
    const injuryDecision = {
      decision: 'MODIFY',
      severity: 'YELLOW',
      reasoning: 'Plantar fasciitis pain',
      modifications: []
    };
    
    const substitution = automaticWorkoutSubstitution(
      mockRunningWorkout,
      injuryDecision,
      ['DEEP_WATER_RUNNING', 'CYCLING'],
      ['CYCLING'] // Athlete preference
    );
    
    expect('convertedWorkout' in substitution).toBe(true);
    if ('convertedWorkout' in substitution) {
      expect(substitution.convertedWorkout.modality).toBe('DEEP_WATER_RUNNING'); // Better for plantar fasciitis
    }
  });
});
```

---

## Related Phases

**Depends on:**
- [Phase 1: Database](./PHASE_01_DATABASE.md) - CrossTrainingSession model
- [Phase 15: Injury Management](./PHASE_15_INJURY_MANAGEMENT.md) - Injury-based substitution triggers

**Integrates with:**
- [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md) - Automatic workout replacement
- [Phase 17: Quality Programming](./PHASE_17_QUALITY_PROGRAMMING.md) - Alternative training during injury

**Enhances:**
- All UI phases with cross-training options
- Injury management with fitness maintenance
- Program generation with alternative training paths

---

**Status:** Ready for implementation after Phase 17

**Next:** Update Master Plan with new phases and extended timeline
