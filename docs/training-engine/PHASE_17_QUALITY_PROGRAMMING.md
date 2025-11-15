# Phase 17: Quality Programming System

**Duration:** Weeks 22-23 (12-15 hours)
**Prerequisites:** [Phase 1: Database](./PHASE_01_DATABASE.md), [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md)
**Status:** ✅ 100% Complete

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 16 Advanced Features](./PHASE_16_ADVANCED_FEATURES.md)
- [Next: Phase 18 Cross-Training Integration](./PHASE_18_CROSS_TRAINING.md)

---

## Overview

Implement **comprehensive quality programming system** that integrates periodized strength training, plyometrics, and running drills to improve running economy by 3-8% while preventing injuries.

### What We're Building

**Quality Programming Components:**

1. **Periodized Strength Training** - 4-phase system (Anatomical → Maximum → Power → Maintenance)
2. **Plyometric Protocols** - Progressive contact loading with injury prevention
3. **Running Drills Integration** - Technical skill development
4. **Injury Prevention Exercises** - Targeted strengthening for common injury sites
5. **Integration Scheduling** - Optimal timing relative to running workouts
6. **Load Management** - Prevent interference with running adaptations
7. **Progression Algorithms** - Automatic advancement based on performance
8. **Sport-Specific Periodization** - Distance-specific emphasis (800m vs Marathon)

### Key Research Findings

- ✅ **3-8% running economy improvement** with proper periodized strength training
- ✅ **51% hamstring injury reduction** with Nordic curls
- ✅ **41% groin injury reduction** with Copenhagen planks
- ✅ **No interference effect** when properly scheduled (2-3x weekly)
- ✅ **Optimal timing** - same day as hard running (6+ hours apart) or separate days

---

## Implementation

### File Structure

```
lib/training-engine/
└── quality-programming/
    ├── index.ts                    # Main exports
    ├── types.ts                    # TypeScript interfaces
    ├── strength-periodization.ts   # 4-phase strength system
    ├── plyometric-protocols.ts     # Progressive plyometric training
    ├── running-drills.ts           # Technical drill progressions
    ├── injury-prevention.ts        # Targeted strengthening
    ├── integration-scheduling.ts   # Timing optimization
    ├── load-management.ts          # Prevent interference
    ├── progression-algorithms.ts   # Automatic advancement
    └── sport-specific.ts           # Distance-specific adaptations
```

---

## Task 17.1: Types and Interfaces

**File:** `lib/training-engine/quality-programming/types.ts`

```typescript
/**
 * Quality Programming Type Definitions
 */

export type StrengthPhase = 'ANATOMICAL_ADAPTATION' | 'MAXIMUM_STRENGTH' | 'POWER' | 'MAINTENANCE';

export type PlyometricIntensity = 'LOW' | 'MODERATE' | 'HIGH';

export type ExerciseTier = 'TIER1_BILATERAL' | 'TIER2_UNILATERAL' | 'TIER3_PLYOMETRIC' | 'INJURY_PREVENTION';

export interface StrengthExercise {
  name: string;
  tier: ExerciseTier;
  primaryMuscles: string[];
  runningTransfer: string;
  
  // Prescription
  sets: number;
  reps: string;              // "3-5", "8-12", "30 seconds"
  load: string;              // "85% 1RM", "Bodyweight", "20-30% BW"
  rest: number;              // seconds
  frequency: string;         // "2x weekly", "3x weekly"
  
  // Progression
  progressionMethod: 'LOAD' | 'REPS' | 'SETS' | 'TEMPO';
  progressionCriteria: string;
  regressionProtocol: string;
  
  // Safety
  contraindications: string[];
  formCues: string[];
  commonMistakes: string[];
}

export interface PlyometricExercise {
  name: string;
  intensity: PlyometricIntensity;
  groundContactTime: string; // "<150ms", "150-250ms", ">250ms"
  
  // Prescription
  sets: number;
  reps: number;
  contacts: number;          // Total ground contacts
  rest: number;              // seconds between sets
  
  // Progression
  prerequisite: string;
  progression: string;
  maxVolume: number;         // Maximum contacts per session
  
  // Safety
  experienceRequired: string; // "Beginner", "6+ months", etc.
  injuryRisk: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface RunningDrill {
  name: string;
  category: 'TECHNICAL' | 'SPEED' | 'POWER';
  focus: string[];           // ["knee lift", "hamstring engagement"]
  
  // Prescription
  sets: number;
  distance: number;          // meters
  intensity: string;         // "50%", "Progressive", "95% max speed"
  rest: string;              // "Walk back", "30 seconds"
  
  // Progression
  beginner: DrillProgression;
  intermediate: DrillProgression;
  advanced: DrillProgression;
  
  // Integration
  timing: string[];          // When to perform relative to other training
  frequency: string;
}

export interface DrillProgression {
  weeks: string;             // "1-4", "5-12", "13+"
  volume: string;            // "2 sets × 30m", "3 sets × 50m"
  frequency: string;         // "1x weekly", "2x weekly"
  focus: string;             // "Learn mechanics", "Coordination", "Power"
}

export interface QualitySession {
  date: Date;
  type: 'STRENGTH' | 'PLYOMETRIC' | 'COMBINED' | 'DRILLS_ONLY';
  phase: StrengthPhase;
  
  // Exercises performed
  strengthExercises: PerformedExercise[];
  plyometricExercises: PerformedPlyometric[];
  drills: PerformedDrill[];
  
  // Session metrics
  duration: number;          // minutes
  totalSets: number;
  totalContacts: number;     // Plyometric contacts
  rpe: number;               // 1-10 session RPE
  
  // Integration
  runningWorkoutSameDay: boolean;
  timingRelativeToRun: string; // "6 hours after", "separate day"
  
  // Outcomes
  completionRate: number;    // % of planned exercises completed
  qualityRating: string;     // "EXCELLENT", "GOOD", "MODERATE", "POOR"
  adaptationIndicators: string[]; // Strength gains, power improvements
}

export interface PerformedExercise {
  exercise: string;
  setsCompleted: number;
  repsCompleted: number[];   // Reps per set
  loadUsed: string;          // Actual weight/resistance
  rpe: number[];             // RPE per set
  formQuality: string;       // "EXCELLENT", "GOOD", "POOR"
  notes?: string;
}

export interface PerformedPlyometric {
  exercise: string;
  setsCompleted: number;
  repsCompleted: number[];
  contactsPerSet: number[];
  restTaken: number[];       // Actual rest between sets
  qualityRating: string;
  notes?: string;
}

export interface PerformedDrill {
  drill: string;
  setsCompleted: number;
  distance: number;
  qualityFocus: string[];
  technicalRating: string;   // "MASTERED", "GOOD", "NEEDS_WORK"
  notes?: string;
}
```

---

## Task 17.2: Strength Training Periodization

**File:** `lib/training-engine/quality-programming/strength-periodization.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, strength training research

```typescript
/**
 * Periodized Strength Training for Runners
 * 
 * 4-Phase System:
 * 1. Anatomical Adaptation (4-6 weeks) - Movement foundations
 * 2. Maximum Strength (8-12 weeks) - Force development (85-93% 1RM)
 * 3. Power (6-8 weeks) - Rate of force development
 * 4. Maintenance (8-12 weeks) - Preserve gains during competition
 * 
 * Research: Støren study showed +33% strength, +5% running economy
 */

import { StrengthPhase, StrengthExercise, QualitySession } from './types';

/**
 * Generate strength training program for specific phase
 */
export function generateStrengthProgram(
  phase: StrengthPhase,
  athleteLevel: string,
  runningPhase: string,
  weeksInPhase: number
): {
  exercises: StrengthExercise[];
  schedule: StrengthSchedule;
  progression: ProgressionPlan;
} {
  
  const exercises = getExercisesForPhase(phase, athleteLevel);
  const schedule = getScheduleForPhase(phase, runningPhase);
  const progression = getProgressionPlan(phase, weeksInPhase);
  
  return { exercises, schedule, progression };
}

/**
 * Phase 1: Anatomical Adaptation (4-6 weeks)
 * Goal: Build movement foundations, prepare tissues
 */
function getAnatomicalAdaptationExercises(): StrengthExercise[] {
  return [
    {
      name: 'Goblet Squat',
      tier: 'TIER1_BILATERAL',
      primaryMuscles: ['Quadriceps', 'Glutes', 'Core'],
      runningTransfer: 'Ground reaction forces, landing mechanics',
      sets: 3,
      reps: '12-15',
      load: '40-60% 1RM or bodyweight',
      rest: 90,
      frequency: '2-3x weekly',
      progressionMethod: 'REPS',
      progressionCriteria: 'When completing 3×15 at RPE <6, increase load',
      regressionProtocol: 'Reduce load 20% if form breaks down',
      contraindications: ['Knee pain', 'Back pain'],
      formCues: ['Chest up', 'Knees track over toes', 'Full depth'],
      commonMistakes: ['Knee valgus', 'Forward lean', 'Partial range']
    },
    {
      name: 'Glute Bridge',
      tier: 'TIER1_BILATERAL',
      primaryMuscles: ['Glutes', 'Hamstrings'],
      runningTransfer: 'Hip extension power, posterior chain activation',
      sets: 3,
      reps: '15',
      load: 'Bodyweight',
      rest: 60,
      frequency: '2-3x weekly',
      progressionMethod: 'REPS',
      progressionCriteria: 'Progress to single-leg when 3×15 easy',
      regressionProtocol: 'Reduce range of motion if pain',
      contraindications: ['Lower back pain'],
      formCues: ['Squeeze glutes at top', 'Drive through heels', 'Neutral spine'],
      commonMistakes: ['Using back instead of glutes', 'Partial range']
    },
    {
      name: 'Plank',
      tier: 'INJURY_PREVENTION',
      primaryMuscles: ['Core', 'Shoulders'],
      runningTransfer: 'Core stability, posture maintenance',
      sets: 3,
      reps: '30-60 seconds',
      load: 'Bodyweight',
      rest: 60,
      frequency: '3x weekly',
      progressionMethod: 'REPS',
      progressionCriteria: 'Increase duration when current time achieved easily',
      regressionProtocol: 'Reduce to knee plank if form fails',
      contraindications: ['Shoulder impingement', 'Lower back pain'],
      formCues: ['Straight line head to heels', 'Engage core', 'Breathe normally'],
      commonMistakes: ['Hip sagging', 'Pike position', 'Holding breath']
    },
    {
      name: 'Single-Leg Glute Bridge',
      tier: 'TIER2_UNILATERAL',
      primaryMuscles: ['Glutes', 'Hamstrings', 'Core'],
      runningTransfer: 'Unilateral strength, asymmetry correction',
      sets: 3,
      reps: '8-12 per leg',
      load: 'Bodyweight',
      rest: 90,
      frequency: '2x weekly',
      progressionMethod: 'REPS',
      progressionCriteria: 'When 3×12 per leg achieved, add weight',
      regressionProtocol: 'Return to bilateral if asymmetry >20%',
      contraindications: ['Lower back pain', 'Hip pain'],
      formCues: ['Equal height both sides', 'Control descent', 'Glute squeeze'],
      commonMistakes: ['Compensatory movements', 'Using momentum']
    }
  ];
}

/**
 * Phase 2: Maximum Strength (8-12 weeks)
 * Goal: Develop maximal force capacity (85-93% 1RM)
 */
function getMaximumStrengthExercises(): StrengthExercise[] {
  return [
    {
      name: 'Back Squat',
      tier: 'TIER1_BILATERAL',
      primaryMuscles: ['Quadriceps', 'Glutes', 'Core'],
      runningTransfer: 'Maximal ground reaction forces, propulsion power',
      sets: 4,
      reps: '3-5',
      load: '85-93% 1RM',
      rest: 240, // 4 minutes
      frequency: '2x weekly',
      progressionMethod: 'LOAD',
      progressionCriteria: 'When completing all sets at RPE <8, increase 2.5-5%',
      regressionProtocol: 'Reduce load 10% if failing sets twice',
      contraindications: ['Knee injury', 'Back injury', 'Poor mobility'],
      formCues: ['Chest up', 'Drive through heels', 'Full depth', 'Controlled tempo'],
      commonMistakes: ['Knee valgus', 'Forward lean', 'Bouncing out of bottom']
    },
    {
      name: 'Romanian Deadlift',
      tier: 'TIER1_BILATERAL',
      primaryMuscles: ['Hamstrings', 'Glutes', 'Erector Spinae'],
      runningTransfer: 'Posterior chain strength, eccentric control, injury prevention',
      sets: 4,
      reps: '4-6',
      load: '85-90% 1RM',
      rest: 240,
      frequency: '2x weekly',
      progressionMethod: 'LOAD',
      progressionCriteria: 'When completing all reps with good form, increase 2.5%',
      regressionProtocol: 'Focus on form before load progression',
      contraindications: ['Lower back injury', 'Hamstring strain'],
      formCues: ['Hinge at hips', 'Keep bar close', 'Neutral spine', 'Feel stretch in hamstrings'],
      commonMistakes: ['Rounding back', 'Bar drifting away', 'Knee flexion']
    },
    {
      name: 'Bulgarian Split Squat',
      tier: 'TIER2_UNILATERAL',
      primaryMuscles: ['Quadriceps', 'Glutes'],
      runningTransfer: 'Single-leg strength, running-specific loading, asymmetry correction',
      sets: 3,
      reps: '5-8 per leg',
      load: '70-85% of bilateral squat weight',
      rest: 180,
      frequency: '2x weekly',
      progressionMethod: 'LOAD',
      progressionCriteria: 'When 3×8 per leg achieved, increase load 5%',
      regressionProtocol: 'Reduce load if asymmetry >15%',
      contraindications: ['Knee pain', 'Ankle mobility issues'],
      formCues: ['85% weight on front leg', 'Vertical torso', 'Control descent'],
      commonMistakes: ['Too much weight on back leg', 'Forward lean', 'Bouncing']
    }
  ];
}

/**
 * Phase 3: Power Development (6-8 weeks)
 * Goal: Convert strength to power, improve rate of force development
 */
function getPowerPhaseExercises(): StrengthExercise[] {
  return [
    {
      name: 'Jump Squat',
      tier: 'TIER3_PLYOMETRIC',
      primaryMuscles: ['Quadriceps', 'Glutes', 'Calves'],
      runningTransfer: 'Explosive power, ground contact time reduction',
      sets: 4,
      reps: '6-8',
      load: '30-60% 1RM squat',
      rest: 180,
      frequency: '2x weekly',
      progressionMethod: 'LOAD',
      progressionCriteria: 'Increase load when jump height maintained',
      regressionProtocol: 'Reduce load if landing quality deteriorates',
      contraindications: ['Knee pain', 'Recent injury'],
      formCues: ['Maximum height', 'Soft landing', 'Immediate rebound'],
      commonMistakes: ['Hard landing', 'Pause between jumps', 'Poor landing mechanics']
    },
    {
      name: 'Box Jump',
      tier: 'TIER3_PLYOMETRIC',
      primaryMuscles: ['Quadriceps', 'Glutes', 'Calves'],
      runningTransfer: 'Reactive strength, ankle stiffness',
      sets: 4,
      reps: '6-8',
      load: 'Bodyweight',
      rest: 180,
      frequency: '2x weekly',
      progressionMethod: 'REPS',
      progressionCriteria: 'Increase height when 4×8 achieved cleanly',
      regressionProtocol: 'Reduce height if form deteriorates',
      contraindications: ['Knee injury', 'Ankle injury'],
      formCues: ['Step down, don\'t jump down', 'Soft landing on box', 'Full hip extension'],
      commonMistakes: ['Jumping down from box', 'Incomplete hip extension', 'Hesitation']
    }
  ];
}

export interface StrengthSchedule {
  frequency: number;         // Sessions per week
  duration: number;          // Minutes per session
  timing: string[];          // Relative to running workouts
  weeklySetVolume: { [muscle: string]: number };
  deloadFrequency: number;   // Every N weeks
}

export interface ProgressionPlan {
  method: string;            // "Double progression", "Linear", "Undulating"
  loadIncrease: string;      // "2.5-5% when criteria met"
  deloadProtocol: string;    // "40-50% volume reduction every 4th week"
  plateauHandling: string;   // "Reduce load 10%, rebuild"
  testingSchedule: string;   // "1RM test every 6-8 weeks"
}
```

---

## Task 17.3: Plyometric Training Protocols

**File:** `lib/training-engine/quality-programming/plyometric-protocols.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, plyometric research

```typescript
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
  const baseVolumes = {
    'BEGINNER': 80,      // 60-100 contacts per session, 1-2x weekly = 80-120
    'INTERMEDIATE': 160,  // 80-120 contacts per session, 2x weekly = 160-240
    'ADVANCED': 240,     // 120-200 contacts per session, 2x weekly = 240-400
    'ELITE': 400        // 150-300 contacts per session, 2x weekly = 300-600
  };
  
  let volume = baseVolumes[experienceLevel as keyof typeof baseVolumes] || 160;
  
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
  const distributions = {
    'BEGINNER': { LOW: 0.8, MODERATE: 0.2, HIGH: 0.0 },
    'INTERMEDIATE': { LOW: 0.5, MODERATE: 0.4, HIGH: 0.1 },
    'ADVANCED': { LOW: 0.3, MODERATE: 0.5, HIGH: 0.2 },
    'ELITE': { LOW: 0.2, MODERATE: 0.5, HIGH: 0.3 }
  };
  
  let distribution = distributions[experienceLevel as keyof typeof distributions] || distributions['INTERMEDIATE'];
  
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
```

---

## Task 17.4: Running Drills Integration

**File:** `lib/training-engine/quality-programming/running-drills.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, technical drill protocols

```typescript
/**
 * Running Drills Integration System
 * 
 * Progressive technical skill development:
 * - Beginners: Learn basic mechanics (A-march, high knees)
 * - Intermediate: Coordination and speed (A-skip, B-march)
 * - Advanced: Power and transfer (B-skip, bounding, strides)
 */

import { RunningDrill, DrillProgression } from './types';

/**
 * Core running drills library
 */
export const RUNNING_DRILLS: RunningDrill[] = [
  {
    name: 'A-March → A-Skip',
    category: 'TECHNICAL',
    focus: ['knee lift', 'lower-leg strength', 'efficient footstrike'],
    sets: 3,
    distance: 50,
    intensity: 'Progressive',
    rest: 'Walk back to start',
    beginner: {
      weeks: '1-4',
      volume: '2 sets × 30m',
      frequency: '1x weekly',
      focus: 'Learn proper mechanics'
    },
    intermediate: {
      weeks: '5-12', 
      volume: '2-3 sets × 40m',
      frequency: '2x weekly',
      focus: 'Coordination and speed'
    },
    advanced: {
      weeks: '13+',
      volume: '3 sets × 50m',
      frequency: '2x weekly',
      focus: 'Power and running-specific transfer'
    },
    timing: [
      'Before speed workouts (10-15 min post warm-up)',
      'After easy runs as standalone session',
      'Separate session 6+ hours from hard running'
    ],
    frequency: '2x weekly optimal'
  },
  
  {
    name: 'B-March → B-Skip',
    category: 'TECHNICAL',
    focus: ['hamstring strength', 'leg snap-back', 'posterior chain'],
    sets: 3,
    distance: 50,
    intensity: 'Progressive',
    rest: 'Walk back to start',
    beginner: {
      weeks: 'Not recommended',
      volume: 'N/A',
      frequency: 'N/A',
      focus: 'Master A-march first'
    },
    intermediate: {
      weeks: '8-16',
      volume: '2-3 sets × 40m',
      frequency: '2x weekly',
      focus: 'Hamstring engagement'
    },
    advanced: {
      weeks: '12+',
      volume: '3 sets × 50m',
      frequency: '2x weekly',
      focus: 'Power development'
    },
    timing: [
      'Before speed workouts',
      'After easy runs',
      'Part of dynamic warmup'
    ],
    frequency: '2x weekly'
  },
  
  {
    name: 'Bounding',
    category: 'POWER',
    focus: ['horizontal power', 'exaggerated stride', 'ground force'],
    sets: 3,
    distance: 100,
    intensity: '85-95% effort',
    rest: '2-3 minutes',
    beginner: {
      weeks: 'Not recommended',
      volume: 'N/A',
      frequency: 'N/A',
      focus: 'Build strength base first'
    },
    intermediate: {
      weeks: 'Not recommended',
      volume: 'N/A',
      frequency: 'N/A',
      focus: 'Develop technical skills first'
    },
    advanced: {
      weeks: '16+',
      volume: '3 sets × 50-100m',
      frequency: '1-2x weekly',
      focus: 'Horizontal power development'
    },
    timing: [
      'Before speed workouts only',
      'Never after hard running',
      'Separate power session'
    ],
    frequency: '1-2x weekly maximum'
  },
  
  {
    name: 'Strides',
    category: 'SPEED',
    focus: ['neuromuscular coordination', 'running economy', 'leg speed'],
    sets: 6,
    distance: 80,
    intensity: 'Build to 85-95% max speed',
    rest: 'Walk back recovery',
    beginner: {
      weeks: '4+',
      volume: '4-6 × 60m',
      frequency: '1-2x weekly',
      focus: 'Learn acceleration and relaxation'
    },
    intermediate: {
      weeks: '1+',
      volume: '6-8 × 80m',
      frequency: '2x weekly',
      focus: 'Speed and coordination'
    },
    advanced: {
      weeks: '1+',
      volume: '6-10 × 100m',
      frequency: '2-3x weekly',
      focus: 'Neuromuscular power'
    },
    timing: [
      'End of easy runs',
      'Before speed workouts',
      'Separate technical session'
    ],
    frequency: '2-3x weekly'
  }
];

/**
 * Select appropriate drills based on athlete level and focus
 */
export function selectDrillsForAthlete(
  experienceLevel: string,
  runningFocus: string,
  currentWeek: number,
  availableTime: number // minutes
): RunningDrill[] {
  
  const appropriateDrills = RUNNING_DRILLS.filter(drill => {
    const progression = drill[experienceLevel.toLowerCase() as keyof RunningDrill] as DrillProgression;
    return progression && progression.weeks !== 'Not recommended' && progression.weeks !== 'N/A';
  });
  
  // Prioritize based on running focus
  let prioritizedDrills = appropriateDrills;
  
  switch (runningFocus) {
    case 'SPEED':
      prioritizedDrills = appropriateDrills.filter(d => 
        d.category === 'SPEED' || d.category === 'POWER'
      );
      break;
    case 'ENDURANCE':
      prioritizedDrills = appropriateDrills.filter(d => 
        d.category === 'TECHNICAL'
      );
      break;
    case 'TECHNIQUE':
      prioritizedDrills = appropriateDrills.filter(d => 
        d.category === 'TECHNICAL'
      );
      break;
  }
  
  // Select based on available time
  const timePerDrill = 5; // minutes including rest
  const maxDrills = Math.floor(availableTime / timePerDrill);
  
  return prioritizedDrills.slice(0, maxDrills);
}

/**
 * Generate drill session structure
 */
export function generateDrillSession(
  selectedDrills: RunningDrill[],
  sessionType: 'STANDALONE' | 'PRE_WORKOUT' | 'POST_EASY_RUN'
): {
  structure: DrillSessionStructure;
  duration: number;
  integration: string;
} {
  
  const structure: DrillSessionStructure = {
    warmup: sessionType === 'STANDALONE' ? {
      duration: 5,
      activity: '5 minutes easy jogging'
    } : undefined,
    
    drills: selectedDrills.map(drill => ({
      drill: drill.name,
      sets: drill.sets,
      distance: drill.distance,
      rest: drill.rest,
      focus: drill.focus,
      technique_cues: getDrillCues(drill.name)
    })),
    
    cooldown: sessionType === 'STANDALONE' ? {
      duration: 5,
      activity: '5 minutes easy jogging + stretching'
    } : undefined
  };
  
  const duration = calculateSessionDuration(structure);
  const integration = getIntegrationGuidance(sessionType);
  
  return { structure, duration, integration };
}

interface DrillSessionStructure {
  warmup?: {
    duration: number;
    activity: string;
  };
  drills: {
    drill: string;
    sets: number;
    distance: number;
    rest: string;
    focus: string[];
    technique_cues: string[];
  }[];
  cooldown?: {
    duration: number;
    activity: string;
  };
}

function getDrillCues(drillName: string): string[] {
  const cueMap: { [key: string]: string[] } = {
    'A-March → A-Skip': [
      'Knee to waist height',
      'Midfoot landing under center of mass',
      'Tall posture, slight forward lean',
      'Arms drive straight back'
    ],
    'B-March → B-Skip': [
      'Leg extends forward then snaps back',
      'Powerful hamstring engagement',
      'Quick ground contacts',
      'Maintain rhythm and cadence'
    ],
    'Bounding': [
      'Emphasize both height and distance',
      'Drive knee up and forward',
      'Land on forefoot, absorb and rebound',
      'Exaggerated arm drive'
    ],
    'Strides': [
      'Gradual acceleration to 85-95% max',
      'Maintain relaxed form throughout',
      'Focus on leg turnover, not overstride',
      'Decelerate gradually, don\'t stop abruptly'
    ]
  };
  
  return cueMap[drillName] || ['Focus on proper form', 'Maintain rhythm'];
}

function calculateSessionDuration(structure: DrillSessionStructure): number {
  let duration = 0;
  
  if (structure.warmup) duration += structure.warmup.duration;
  if (structure.cooldown) duration += structure.cooldown.duration;
  
  // Estimate drill time (including rest)
  structure.drills.forEach(drill => {
    const timePerSet = 2; // ~2 minutes per set including rest
    duration += drill.sets * timePerSet;
  });
  
  return duration;
}

function getIntegrationGuidance(sessionType: string): string {
  switch (sessionType) {
    case 'PRE_WORKOUT':
      return 'Perform after general warmup, before main workout. Serves as neuromuscular activation.';
    case 'POST_EASY_RUN':
      return 'Perform immediately after easy run while muscles are warm. Focus on technique.';
    case 'STANDALONE':
      return 'Separate technical session. Allow 6+ hours from hard running workouts.';
    default:
      return 'Integrate based on training schedule and recovery status.';
  }
}
```

---

## Task 17.5: Integration Scheduling System

**File:** `lib/training-engine/quality-programming/integration-scheduling.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, concurrent training research

```typescript
/**
 * Integration Scheduling System
 * 
 * Optimizes timing of strength/plyometric work relative to running
 * to maximize adaptation while preventing interference effects
 * 
 * Key principles:
 * - Same-day sequencing for hard days (6+ hours apart)
 * - Easy days stay truly easy
 * - 48-hour recovery between strength sessions
 * - No strength within 48 hours of key running workouts
 */

export interface IntegrationSchedule {
  weekStructure: DaySchedule[];
  totalWeeklyMinutes: number;
  interferenceRisk: 'LOW' | 'MODERATE' | 'HIGH';
  recommendations: string[];
}

export interface DaySchedule {
  day: number;               // 1-7 (Monday = 1)
  running: RunningSession | null;
  strength: StrengthSession | null;
  plyometric: PlyometricSession | null;
  drills: DrillSession | null;
  recovery: RecoverySession | null;
  timing: TimingGuidance;
}

export interface TimingGuidance {
  sequence: string[];        // Order of activities
  gaps: number[];            // Hours between activities
  reasoning: string;
  alternatives?: string[];
}

/**
 * Generate optimal integration schedule
 */
export function generateIntegrationSchedule(
  runningProgram: WeeklyRunning,
  strengthPhase: StrengthPhase,
  athleteLevel: string,
  availableDays: number,
  timeConstraints: TimeConstraints
): IntegrationSchedule {
  
  const weekStructure: DaySchedule[] = [];
  
  // Identify hard and easy running days
  const hardRunningDays = identifyHardDays(runningProgram);
  const easyRunningDays = identifyEasyDays(runningProgram);
  
  // Schedule strength training
  const strengthDays = scheduleStrengthTraining(
    hardRunningDays,
    strengthPhase,
    timeConstraints
  );
  
  // Schedule plyometrics (if not combined with strength)
  const plyometricDays = schedulePlyometrics(
    strengthDays,
    hardRunningDays,
    athleteLevel
  );
  
  // Schedule drills
  const drillDays = scheduleDrills(
    hardRunningDays,
    easyRunningDays,
    strengthDays
  );
  
  // Build daily schedules
  for (let day = 1; day <= 7; day++) {
    const daySchedule = buildDaySchedule(
      day,
      runningProgram,
      strengthDays,
      plyometricDays,
      drillDays,
      timeConstraints
    );
    
    weekStructure.push(daySchedule);
  }
  
  // Calculate interference risk
  const interferenceRisk = assessInterferenceRisk(weekStructure);
  
  // Generate recommendations
  const recommendations = generateIntegrationRecommendations(
    weekStructure,
    interferenceRisk,
    athleteLevel
  );
  
  return {
    weekStructure,
    totalWeeklyMinutes: calculateTotalMinutes(weekStructure),
    interferenceRisk,
    recommendations
  };
}

/**
 * Schedule strength training optimally
 * 
 * Preferred approach: Same day as hard running (6+ hours apart)
 * Alternative: Separate days with 48+ hour gap from next hard run
 */
function scheduleStrengthTraining(
  hardRunningDays: number[],
  strengthPhase: StrengthPhase,
  timeConstraints: TimeConstraints
): { day: number; timing: string }[] {
  
  const strengthSchedule: { day: number; timing: string }[] = [];
  
  // Frequency based on phase
  const frequency = strengthPhase === 'MAINTENANCE' ? 1 : 2;
  
  if (timeConstraints.preferSameDayTraining) {
    // Option A: Same day as hard running
    for (let i = 0; i < frequency && i < hardRunningDays.length; i++) {
      strengthSchedule.push({
        day: hardRunningDays[i],
        timing: 'EVENING' // 6+ hours after morning run
      });
    }
  } else {
    // Option B: Separate days
    const availableDays = [1, 2, 3, 4, 5, 6, 7].filter(day => 
      !hardRunningDays.includes(day)
    );
    
    for (let i = 0; i < frequency && i < availableDays.length; i++) {
      strengthSchedule.push({
        day: availableDays[i],
        timing: 'MORNING_OR_EVENING'
      });
    }
  }
  
  return strengthSchedule;
}

/**
 * Assess interference risk between running and strength training
 */
function assessInterferenceRisk(weekStructure: DaySchedule[]): 'LOW' | 'MODERATE' | 'HIGH' {
  let riskFactors = 0;
  
  weekStructure.forEach(day => {
    // Same day with <6 hours gap
    if (day.running && day.strength) {
      const gap = day.timing.gaps[0] || 0;
      if (gap < 6) riskFactors += 2;
    }
    
    // Strength day before hard running
    const nextDay = weekStructure[(day.day % 7)];
    if (day.strength && nextDay?.running?.intensity === 'HARD') {
      riskFactors += 1;
    }
    
    // Too many quality days per week
    const qualityCount = weekStructure.filter(d => 
      (d.running?.intensity === 'HARD') || d.strength || d.plyometric
    ).length;
    if (qualityCount > 4) riskFactors += 1;
  });
  
  if (riskFactors >= 4) return 'HIGH';
  if (riskFactors >= 2) return 'MODERATE';
  return 'LOW';
}

/**
 * Generate integration recommendations based on schedule analysis
 */
function generateIntegrationRecommendations(
  schedule: DaySchedule[],
  interferenceRisk: string,
  athleteLevel: string
): string[] {
  
  const recommendations: string[] = [];
  
  if (interferenceRisk === 'HIGH') {
    recommendations.push('⚠️ High interference risk detected');
    recommendations.push('Consider reducing strength frequency or adjusting timing');
    recommendations.push('Monitor recovery closely - may need to drop to maintenance phase');
  }
  
  if (interferenceRisk === 'MODERATE') {
    recommendations.push('Moderate interference risk - monitor recovery');
    recommendations.push('Ensure minimum 6 hours between running and strength on same days');
  }
  
  // Athlete-level specific recommendations
  switch (athleteLevel) {
    case 'RECREATIONAL':
      recommendations.push('Focus on consistency over intensity');
      recommendations.push('2x weekly strength training sufficient');
      recommendations.push('Prioritize injury prevention exercises');
      break;
      
    case 'ADVANCED':
      recommendations.push('Can handle 2-3x weekly strength training');
      recommendations.push('Emphasize maximum strength phase during base training');
      recommendations.push('Maintain strength work year-round');
      break;
      
    case 'ELITE':
      recommendations.push('Year-round strength training essential');
      recommendations.push('Careful timing around key workouts and competitions');
      recommendations.push('Consider velocity-based training for autoregulation');
      break;
  }
  
  return recommendations;
}

interface TimeConstraints {
  preferSameDayTraining: boolean;
  maxSessionDuration: number; // minutes
  availableDays: number[];
  morningAvailable: boolean;
  eveningAvailable: boolean;
}

interface WeeklyRunning {
  [day: number]: {
    type: string;
    duration: number;
    intensity: 'EASY' | 'MODERATE' | 'HARD';
    importance: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

interface RunningSession {
  type: string;
  duration: number;
  intensity: 'EASY' | 'MODERATE' | 'HARD';
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface StrengthSession {
  phase: StrengthPhase;
  duration: number;
  exercises: string[];
  timing: 'MORNING' | 'EVENING';
}

interface PlyometricSession {
  contacts: number;
  duration: number;
  intensity: PlyometricIntensity;
}

interface DrillSession {
  drills: string[];
  duration: number;
  focus: string;
}

interface RecoverySession {
  type: 'COMPLETE_REST' | 'ACTIVE_RECOVERY';
  activities?: string[];
}

function identifyHardDays(program: WeeklyRunning): number[] {
  return Object.entries(program)
    .filter(([_, session]) => session.intensity === 'HARD')
    .map(([day, _]) => parseInt(day));
}

function identifyEasyDays(program: WeeklyRunning): number[] {
  return Object.entries(program)
    .filter(([_, session]) => session.intensity === 'EASY')
    .map(([day, _]) => parseInt(day));
}

function schedulePlyometrics(
  strengthDays: { day: number; timing: string }[],
  hardRunningDays: number[],
  athleteLevel: string
): { day: number; timing: string }[] {
  // Implementation for plyometric scheduling
  return [];
}

function scheduleDrills(
  hardRunningDays: number[],
  easyRunningDays: number[],
  strengthDays: { day: number; timing: string }[]
): { day: number; timing: string }[] {
  // Implementation for drill scheduling
  return [];
}

function buildDaySchedule(
  day: number,
  runningProgram: WeeklyRunning,
  strengthDays: { day: number; timing: string }[],
  plyometricDays: { day: number; timing: string }[],
  drillDays: { day: number; timing: string }[],
  timeConstraints: TimeConstraints
): DaySchedule {
  // Implementation for building individual day schedules
  return {
    day,
    running: null,
    strength: null,
    plyometric: null,
    drills: null,
    recovery: null,
    timing: {
      sequence: [],
      gaps: [],
      reasoning: ''
    }
  };
}

function calculateTotalMinutes(schedule: DaySchedule[]): number {
  return schedule.reduce((total, day) => {
    let dayMinutes = 0;
    if (day.strength) dayMinutes += day.strength.duration;
    if (day.plyometric) dayMinutes += day.plyometric.duration;
    if (day.drills) dayMinutes += day.drills.duration;
    return total + dayMinutes;
  }, 0);
}
```

---

## Task 17.6: Injury Prevention Exercise Library

**File:** `lib/training-engine/quality-programming/injury-prevention.ts`

**Reference:** Production-Ready_Runner_Training_Engine document, injury prevention research

```typescript
/**
 * Injury Prevention Exercise Library
 * 
 * Evidence-based exercises targeting the most common running injury sites:
 * - Copenhagen planks: 41% groin injury reduction
 * - Nordic hamstring curls: 51% hamstring injury reduction
 * - Single-leg calf raises: Achilles injury prevention
 * - Hip strengthening: IT band and patellofemoral pain prevention
 */

import { StrengthExercise } from './types';

/**
 * Core injury prevention exercises
 * Should be included 2-3x weekly for all runners
 */
export const INJURY_PREVENTION_EXERCISES: StrengthExercise[] = [
  {
    name: 'Copenhagen Planks',
    tier: 'INJURY_PREVENTION',
    primaryMuscles: ['Adductors', 'Core'],
    runningTransfer: 'Groin injury prevention, pelvic stability',
    sets: 3,
    reps: '20-30 seconds per side',
    load: 'Bodyweight',
    rest: 60,
    frequency: '3x weekly',
    progressionMethod: 'REPS',
    progressionCriteria: 'Increase duration when current time achieved easily',
    regressionProtocol: 'Use modified position (knee supported)',
    contraindications: ['Acute groin strain', 'Hip pain'],
    formCues: ['Straight line from head to feet', 'Top leg supports body', 'Engage adductors'],
    commonMistakes: ['Hip sagging', 'Using bottom leg for support', 'Holding breath']
  },
  
  {
    name: 'Nordic Hamstring Curls',
    tier: 'INJURY_PREVENTION',
    primaryMuscles: ['Hamstrings', 'Glutes'],
    runningTransfer: '51% hamstring injury reduction, eccentric strength',
    sets: 3,
    reps: '6-10',
    load: 'Bodyweight',
    rest: 120,
    frequency: '2x weekly minimum',
    progressionMethod: 'REPS',
    progressionCriteria: 'Reduce assistance when 3×10 achieved',
    regressionProtocol: 'Increase assistance (band or partner)',
    contraindications: ['Acute hamstring strain', 'Knee pain'],
    formCues: ['5-second eccentric lowering', 'Control descent', 'Use hands minimally'],
    commonMistakes: ['Dropping too fast', 'Over-reliance on hands', 'Incomplete range']
  },
  
  {
    name: 'Single-Leg Calf Raises',
    tier: 'INJURY_PREVENTION',
    primaryMuscles: ['Gastrocnemius', 'Soleus'],
    runningTransfer: 'Achilles injury prevention, calf strength',
    sets: 3,
    reps: '15-20 per leg',
    load: 'Bodyweight',
    rest: 90,
    frequency: '3x weekly',
    progressionMethod: 'REPS',
    progressionCriteria: 'When 3×20 achieved, add weight',
    regressionProtocol: 'Return to bilateral if <10 reps per leg',
    contraindications: ['Achilles pain', 'Calf strain'],
    formCues: ['Full range of motion', 'Control lowering phase', 'Balance without support'],
    commonMistakes: ['Partial range', 'Using momentum', 'Holding support']
  },
  
  {
    name: 'Hip Airplanes',
    tier: 'INJURY_PREVENTION',
    primaryMuscles: ['Glute Medius', 'Core', 'Hip Stabilizers'],
    runningTransfer: 'IT band syndrome prevention, hip stability',
    sets: 3,
    reps: '8 per leg',
    load: 'Bodyweight',
    rest: 60,
    frequency: '2-3x weekly',
    progressionMethod: 'REPS',
    progressionCriteria: 'Increase range of motion and control',
    regressionProtocol: 'Reduce range of motion or add support',
    contraindications: ['Hip pain', 'Balance disorders'],
    formCues: ['Maintain single-leg balance', 'Rotate from hip', 'Keep hips level'],
    commonMistakes: ['Using momentum', 'Losing balance', 'Compensatory movements']
  },
  
  {
    name: 'Monster Walks',
    tier: 'INJURY_PREVENTION',
    primaryMuscles: ['Glute Medius', 'Glute Minimus'],
    runningTransfer: 'Hip abduction strength, IT band syndrome prevention',
    sets: 3,
    reps: '20 steps',
    load: 'Resistance band',
    rest: 60,
    frequency: '3x weekly',
    progressionMethod: 'LOAD',
    progressionCriteria: 'Increase band resistance when 20 steps easy',
    regressionProtocol: 'Use lighter resistance band',
    contraindications: ['Hip pain', 'Knee pain'],
    formCues: ['Maintain band tension', 'Avoid hip drop', 'Control each step'],
    commonMistakes: ['Losing tension', 'Trendelenburg gait', 'Too fast tempo']
  },
  
  {
    name: 'Dead Bug',
    tier: 'INJURY_PREVENTION',
    primaryMuscles: ['Deep Core', 'Diaphragm'],
    runningTransfer: 'Core anti-extension control, running posture',
    sets: 3,
    reps: '10 per side',
    load: 'Bodyweight',
    rest: 60,
    frequency: '3x weekly',
    progressionMethod: 'REPS',
    progressionCriteria: 'Add resistance band when form perfect',
    regressionProtocol: 'Reduce range of motion',
    contraindications: ['Lower back pain'],
    formCues: ['Maintain lower back contact', 'Slow controlled movement', 'Breathe normally'],
    commonMistakes: ['Back arching', 'Moving too fast', 'Holding breath']
  }
];

/**
 * Generate injury prevention routine for specific athlete
 */
export function generateInjuryPreventionRoutine(
  injuryHistory: string[],
  currentInjuryRisk: string[],
  availableTime: number,
  equipment: string[]
): {
  routine: StrengthExercise[];
  duration: number;
  frequency: string;
  priorityOrder: string[];
} {
  
  let selectedExercises = [...INJURY_PREVENTION_EXERCISES];
  
  // Prioritize based on injury history
  if (injuryHistory.includes('HAMSTRING_STRAIN')) {
    // Move Nordic curls to top priority
    selectedExercises = prioritizeExercise(selectedExercises, 'Nordic Hamstring Curls');
  }
  
  if (injuryHistory.includes('IT_BAND_SYNDROME')) {
    // Prioritize hip strengthening
    selectedExercises = prioritizeExercise(selectedExercises, 'Hip Airplanes');
    selectedExercises = prioritizeExercise(selectedExercises, 'Monster Walks');
  }
  
  if (injuryHistory.includes('ACHILLES_TENDINOPATHY')) {
    selectedExercises = prioritizeExercise(selectedExercises, 'Single-Leg Calf Raises');
  }
  
  // Filter based on available equipment
  selectedExercises = filterByEquipment(selectedExercises, equipment);
  
  // Fit into available time
  const timePerExercise = 4; // minutes including rest
  const maxExercises = Math.floor(availableTime / timePerExercise);
  selectedExercises = selectedExercises.slice(0, maxExercises);
  
  const duration = selectedExercises.length * timePerExercise;
  
  return {
    routine: selectedExercises,
    duration,
    frequency: '2-3x weekly',
    priorityOrder: selectedExercises.map(ex => ex.name)
  };
}

function prioritizeExercise(exercises: StrengthExercise[], exerciseName: string): StrengthExercise[] {
  const exercise = exercises.find(ex => ex.name === exerciseName);
  if (!exercise) return exercises;
  
  const others = exercises.filter(ex => ex.name !== exerciseName);
  return [exercise, ...others];
}

function filterByEquipment(exercises: StrengthExercise[], equipment: string[]): StrengthExercise[] {
  // Filter exercises based on available equipment
  // For now, return all (most are bodyweight)
  return exercises;
}

/**
 * Track injury prevention compliance and effectiveness
 */
export function trackInjuryPreventionCompliance(
  performedSessions: QualitySession[],
  timeframe: number // weeks
): {
  complianceRate: number;    // % of prescribed sessions completed
  exerciseFrequency: { [exercise: string]: number };
  injuryIncidence: number;   // Injuries per 1000 training hours
  effectiveness: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
} {
  
  // Calculate compliance rate
  const prescribedSessions = timeframe * 3; // 3x weekly target
  const completedSessions = performedSessions.filter(session =>
    session.strengthExercises.some(ex => 
      INJURY_PREVENTION_EXERCISES.some(prev => prev.name === ex.exercise)
    )
  ).length;
  
  const complianceRate = (completedSessions / prescribedSessions) * 100;
  
  // Track exercise frequency
  const exerciseFrequency: { [exercise: string]: number } = {};
  INJURY_PREVENTION_EXERCISES.forEach(ex => {
    exerciseFrequency[ex.name] = performedSessions.filter(session =>
      session.strengthExercises.some(performed => performed.exercise === ex.name)
    ).length;
  });
  
  // Assess effectiveness
  let effectiveness: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
  if (complianceRate >= 85) effectiveness = 'EXCELLENT';
  else if (complianceRate >= 70) effectiveness = 'GOOD';
  else if (complianceRate >= 50) effectiveness = 'MODERATE';
  else effectiveness = 'POOR';
  
  return {
    complianceRate,
    exerciseFrequency,
    injuryIncidence: 0, // Would calculate from injury data
    effectiveness
  };
}
```

---

## Acceptance Criteria

- [ ] Strength training periodization implements all 4 phases with proper load progression
- [ ] Plyometric protocols include progressive contact loading with safety limits
- [ ] Running drills system provides technical progression from beginner to advanced
- [ ] Injury prevention exercise library includes evidence-based exercises with research citations
- [ ] Integration scheduling optimizes timing to prevent interference effects
- [ ] Load management prevents excessive fatigue while maximizing adaptation
- [ ] Progression algorithms automatically advance athletes based on performance criteria
- [ ] Sport-specific periodization adjusts emphasis based on race distance goals
- [ ] Safety protocols prevent injury during quality programming
- [ ] Integration with main training engine maintains running workout priority
- [ ] All quality programming components have comprehensive unit tests
- [ ] Compliance tracking monitors adherence and effectiveness
- [ ] Coach override capabilities allow manual adjustments
- [ ] Athlete education materials explain purpose and proper form

---

## Testing Requirements

### Unit Tests

**File:** `__tests__/quality-programming/strength-periodization.test.ts`

```typescript
describe('Strength Training Periodization', () => {
  test('anatomical adaptation phase uses appropriate loads and volumes', () => {
    const program = generateStrengthProgram('ANATOMICAL_ADAPTATION', 'RECREATIONAL', 'BASE', 6);
    
    program.exercises.forEach(exercise => {
      expect(exercise.load).toMatch(/40-60%|bodyweight/i);
      expect(exercise.reps).toMatch(/12-15/);
      expect(exercise.sets).toBeLessThanOrEqual(3);
    });
  });
  
  test('maximum strength phase uses heavy loads with adequate rest', () => {
    const program = generateStrengthProgram('MAXIMUM_STRENGTH', 'ADVANCED', 'BASE', 10);
    
    program.exercises.forEach(exercise => {
      if (exercise.tier === 'TIER1_BILATERAL') {
        expect(exercise.load).toMatch(/85-93%/);
        expect(exercise.rest).toBeGreaterThanOrEqual(180);
      }
    });
  });
  
  test('integration scheduling prevents interference', () => {
    const schedule = generateIntegrationSchedule(
      mockRunningProgram,
      'MAXIMUM_STRENGTH',
      'ADVANCED',
      6,
      mockTimeConstraints
    );
    
    expect(schedule.interferenceRisk).toBe('LOW');
    
    // Check no strength day before hard running day
    schedule.weekStructure.forEach((day, index) => {
      if (day.strength) {
        const nextDay = schedule.weekStructure[(index + 1) % 7];
        if (nextDay?.running?.intensity === 'HARD') {
          expect(day.timing.gaps[0]).toBeGreaterThanOrEqual(24);
        }
      }
    });
  });
});
```

---

## Related Phases

**Depends on:**
- [Phase 1: Database](./PHASE_01_DATABASE.md) - StrengthTrainingSession model
- [Phase 7: Program Generation](./PHASE_07_PROGRAM_GENERATION.md) - Integration with running programs

**Integrates with:**
- [Phase 15: Injury Management](./PHASE_15_INJURY_MANAGEMENT.md) - Injury prevention focus
- [Phase 16: Advanced Features](./PHASE_16_ADVANCED_FEATURES.md) - Race-specific periodization

**Enhances:**
- All UI phases with quality programming features
- Monitoring systems with strength/power tracking
- Program generation with comprehensive training

---

**Status:** Ready for implementation after Phase 16

**Next Phase:** [Phase 18: Cross-Training Integration](./PHASE_18_CROSS_TRAINING.md)



