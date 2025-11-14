# Phase 7: Program Generation Engine

**Duration:** Weeks 5-7 (15-20 hours)
**Prerequisites:** [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md), [Phase 6: Methodologies](./PHASE_06_METHODOLOGIES.md)
**Status:** 📝 Not Started

---

## Quick Links

- [Master Plan](./MASTER_PLAN.md)
- [Previous: Phase 6 Methodologies](./PHASE_06_METHODOLOGIES.md)
- [Next: Phase 8 Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md)

---

## Overview

Build the complete training program generation system that creates individualized, periodized training plans from race goals, physiological testing, and athlete characteristics.

### What We're Building

**7 Core Components:**

1. **Periodization Engine** - Base → Build → Peak → Taper phase system
2. **Weekly Builder** - Generate week-by-week training schedules
3. **Workout Templates** - 20+ workout types with intensity prescriptions
4. **Progressive Overload** - Automatic volume/intensity progression
5. **Deload Scheduling** - Automatic recovery weeks every 3-4 weeks
6. **Target Time Module** - VDOT, Riegel formula, race predictions
7. **Multi-Race Planner** - Season planning with A/B/C race classification

### Key Features

- ✅ **Individualized zones** - Never uses %HRmax, always LT1/LT2 anchored
- ✅ **Methodology integration** - Works with all 4 training methodologies
- ✅ **ACWR monitoring** - Prevents injury with automatic load management
- ✅ **Quality control** - 15+ validation rules ensure safe programs
- ✅ **Flexibility** - Handles 3-26 week programs, multiple race goals
- ✅ **Cross-training** - DWR, cycling, elliptical equivalencies

---

## Implementation

### File Structure

```
lib/training-engine/
└── program-generator/
    ├── index.ts                    # Main program generation
    ├── types.ts                    # TypeScript types
    ├── periodization.ts            # Phase system
    ├── weekly-builder.ts           # Week generation
    ├── workout-templates.ts        # Workout library
    ├── progression.ts              # Progressive overload
    ├── deload.ts                   # Deload scheduling
    ├── target-time.ts              # VDOT & race predictions
    ├── multi-race-planner.ts       # Season planning
    ├── field-test-schedule.ts      # Benchmark scheduling
    ├── report.ts                   # Program report compiler
    ├── cross-training.ts           # XC equivalencies
    └── validation.ts               # Quality control
```

---

## Task 7.1: Types and Interfaces

**File:** `lib/training-engine/program-generator/types.ts`

```typescript
/**
 * Program Generator Type Definitions
 */

import { MethodologyType, AthleteLevel, GoalDistance, TrainingPhase } from '../methodologies/types';

/**
 * Training program input parameters
 */
export interface ProgramInput {
  clientId: string;
  athleteLevel: AthleteLevel;
  methodology: MethodologyType;

  // Goal parameters
  goalDistance: GoalDistance;
  targetTime?: number;          // seconds (optional if no time goal)
  raceDate: Date;

  // Current fitness
  currentVolume: number;        // km per week
  lt1: {
    pace: number;               // sec/km
    heartRate: number;          // bpm
  };
  lt2: {
    pace: number;
    heartRate: number;
  };
  maxHR: number;

  // Training availability
  sessionsPerWeek: number;
  longRunDay?: 'SATURDAY' | 'SUNDAY';
  qualityDays?: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY')[];

  // Optional parameters
  previousBestTime?: number;    // seconds
  hasLactateAccess?: boolean;
  crossTrainingOptions?: ('DWR' | 'CYCLING' | 'ELLIPTICAL')[];
}

/**
 * Generated training program
 */
export interface TrainingProgram {
  id: string;
  clientId: string;
  createdAt: Date;

  // Program structure
  startDate: Date;
  raceDate: Date;
  totalWeeks: number;
  phases: ProgramPhase[];
  weeks: TrainingWeek[];

  // Metadata
  methodology: MethodologyType;
  goalDistance: GoalDistance;
  targetTime?: number;
  predictedTime?: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';

  // Quality control
  validation: ValidationResult;
  warnings: string[];
}

/**
 * Program phase (Base, Build, Peak, Taper)
 */
export interface ProgramPhase {
  phase: TrainingPhase;
  startWeek: number;
  endWeek: number;
  durationWeeks: number;

  // Volume/intensity targets
  volumeRange: { min: number; max: number };  // km per week
  intensityDistribution: {
    easy: number;      // %
    moderate: number;  // %
    hard: number;      // %
  };

  // Quality sessions
  qualitySessionsPerWeek: number;
  longRunTarget: number;  // minutes or km

  description: string;
}

/**
 * Weekly training structure
 */
export interface TrainingWeek {
  weekNumber: number;
  startDate: Date;
  phase: TrainingPhase;

  // Volume/load
  plannedVolume: number;        // km
  plannedTimeMinutes: number;
  plannedTSS: number;
  acwr: number;

  // Week type
  isDeload: boolean;
  isRaceWeek: boolean;
  isTaper: boolean;

  // Workouts
  days: TrainingDay[];

  // Progression notes
  progressionNote?: string;
}

/**
 * Daily training
 */
export interface TrainingDay {
  date: Date;
  dayOfWeek: string;
  workout?: Workout;
  isRestDay: boolean;
}

/**
 * Workout structure
 */
export interface Workout {
  id: string;
  type: WorkoutType;
  name: string;
  description: string;

  // Intensity
  primaryZone: number;          // 1-5
  secondaryZone?: number;
  targetPace?: number;          // sec/km
  targetHR?: number;            // bpm
  targetPaceRange?: { min: number; max: number };

  // Structure
  warmupMinutes: number;
  cooldownMinutes: number;
  mainSet: WorkoutSegment[];

  // Totals
  totalDuration: number;        // minutes
  totalDistance: number;        // km
  estimatedTSS: number;

  // Alternatives
  crossTrainingAlternative?: CrossTrainingWorkout;
}

/**
 * Workout types
 */
export type WorkoutType =
  | 'EASY_RUN'
  | 'LONG_RUN'
  | 'RECOVERY_RUN'
  | 'TEMPO_RUN'
  | 'THRESHOLD_INTERVALS'
  | 'VO2MAX_INTERVALS'
  | 'RACE_PACE_INTERVALS'
  | 'PROGRESSION_RUN'
  | 'FARTLEK'
  | 'HILL_REPEATS'
  | 'STRIDES'
  | 'REST';

/**
 * Workout segment (for intervals)
 */
export interface WorkoutSegment {
  type: 'WARMUP' | 'WORK' | 'RECOVERY' | 'COOLDOWN';
  repetitions: number;
  duration?: number;            // minutes
  distance?: number;            // meters
  pace?: number;                // sec/km
  intensity: string;            // Description
  restDuration?: number;        // seconds between reps
  restType?: 'ACTIVE' | 'COMPLETE';
}

/**
 * Cross-training workout
 */
export interface CrossTrainingWorkout {
  type: 'DWR' | 'CYCLING' | 'ELLIPTICAL';
  duration: number;             // minutes
  equivalentRunning: number;    // km
  intensity: string;
  hrAdjustment: number;         // bpm to subtract from target
}

/**
 * Progressive overload calculation
 */
export interface ProgressionRule {
  athleteLevel: AthleteLevel;
  weeklyIncreasePercent: number;
  maxWeeklyIncreaseKm: number;
  progressionWeeks: number;     // Weeks before deload
  deloadReductionPercent: number;
}

/**
 * Deload configuration
 */
export interface DeloadConfig {
  frequencyWeeks: number;
  volumeReductionPercent: number;
  intensityReduction: 'NONE' | 'MODERATE' | 'FULL';
  eliminateQuality: boolean;
}

/**
 * Target time estimation
 */
export interface TargetTimeEstimation {
  method: 'VDOT' | 'RIEGEL' | 'LT2_RATIO' | 'TARGET_ONLY';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVALIDATED';

  // Predictions
  predictedTime: number;        // seconds
  confidenceInterval: { min: number; max: number };

  // Training paces
  trainingPaces: {
    easy: { min: number; max: number };
    tempo: { min: number; max: number };
    threshold: { min: number; max: number };
    vo2max: { min: number; max: number };
  };

  // Validation
  requiresValidation: boolean;
  validationTest?: 'THIRTY_MIN_TT' | 'TEN_K_RACE';
  validationDeadline?: Date;
}

/**
 * Multi-race season plan
 */
export interface MultiRacePlan {
  seasonStart: Date;
  seasonEnd: Date;

  races: RaceGoal[];
  phases: SeasonPhase[];

  peaksCount: number;
  warnings: string[];
}

export interface RaceGoal {
  date: Date;
  distance: GoalDistance;
  classification: 'A' | 'B' | 'C';
  targetTime?: number;

  taperWeeks: number;
  recoveryDays: number;
  priority: number;
}

export interface SeasonPhase {
  type: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'MAINTENANCE';
  startDate: Date;
  endDate: Date;
  weeks: number;
  targetRace?: RaceGoal;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  checks: ValidationCheck[];
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  recommendation: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  value?: any;
  threshold?: any;
}
```

---

## Task 7.2: Periodization Engine

**File:** `lib/training-engine/program-generator/periodization.ts`

**Reference:** Program Generation Research, Section 1

```typescript
/**
 * Periodization Engine
 *
 * Divides training program into phases:
 * - Base: Build aerobic foundation
 * - Build: Add race-specific workouts
 * - Peak: Maximum intensity
 * - Taper: Supercompensation for race
 *
 * @module periodization
 */

import { TrainingPhase, AthleteLevel, GoalDistance } from '../methodologies/types';
import { ProgramPhase, ProgramInput } from './types';

/**
 * Calculate program phases from race date and current fitness
 *
 * Logic:
 * 1. Calculate weeks available until race
 * 2. Determine phase durations based on athlete level
 * 3. Allocate time to Base → Build → Peak → Taper
 * 4. Ensure minimum phase durations met
 *
 * @param input - Program parameters
 * @param weeksAvailable - Weeks from start to race
 * @returns Array of program phases
 */
export function calculateProgramPhases(
  input: ProgramInput,
  weeksAvailable: number
): ProgramPhase[] {
  const { athleteLevel, goalDistance } = input;

  // Get phase duration requirements
  const requirements = getPhaseDurationRequirements(athleteLevel, goalDistance);

  // Calculate taper duration (fixed by distance)
  const taperWeeks = getTaperDuration(goalDistance);

  // Calculate minimum program duration
  const minWeeks = requirements.baseMin + requirements.buildMin +
                   requirements.peakMin + taperWeeks;

  if (weeksAvailable < minWeeks) {
    throw new Error(
      `Insufficient time for ${goalDistance} preparation. ` +
      `Need ${minWeeks} weeks minimum, have ${weeksAvailable} weeks.`
    );
  }

  // Allocate remaining weeks
  let remainingWeeks = weeksAvailable - taperWeeks;

  // Peak phase (fixed duration)
  const peakWeeks = Math.min(requirements.peakMax,
    goalDistance === 'MARATHON' ? 6 : 4);
  remainingWeeks -= peakWeeks;

  // Build phase (fixed duration)
  const buildWeeks = Math.min(requirements.buildMax, 8);
  remainingWeeks -= buildWeeks;

  // Base phase (gets remaining time)
  const baseWeeks = Math.max(requirements.baseMin, remainingWeeks);

  // Validate peak phase not too long
  if (peakWeeks > 6) {
    console.warn(`Peak phase ${peakWeeks} weeks exceeds 6-week maximum. Risk of burnout.`);
  }

  // Create phase objects
  const phases: ProgramPhase[] = [];
  let currentWeek = 1;

  // Base Phase
  phases.push({
    phase: 'BASE',
    startWeek: currentWeek,
    endWeek: currentWeek + baseWeeks - 1,
    durationWeeks: baseWeeks,
    volumeRange: {
      min: input.currentVolume,
      max: input.currentVolume * (1 + baseWeeks * getProgressionRate(athleteLevel))
    },
    intensityDistribution: { easy: 85, moderate: 10, hard: 5 },
    qualitySessionsPerWeek: 1,
    longRunTarget: 90,  // minutes
    description: 'Build aerobic foundation with easy volume'
  });
  currentWeek += baseWeeks;

  // Build Phase
  const buildMaxVolume = phases[0].volumeRange.max * 1.15;
  phases.push({
    phase: 'BUILD',
    startWeek: currentWeek,
    endWeek: currentWeek + buildWeeks - 1,
    durationWeeks: buildWeeks,
    volumeRange: {
      min: phases[0].volumeRange.max,
      max: buildMaxVolume
    },
    intensityDistribution: { easy: 70, moderate: 20, hard: 10 },
    qualitySessionsPerWeek: 2,
    longRunTarget: 120,
    description: 'Add race-specific workouts and threshold training'
  });
  currentWeek += buildWeeks;

  // Peak Phase
  const peakMaxVolume = buildMaxVolume * 0.95;  // Slight volume reduction
  phases.push({
    phase: 'PEAK',
    startWeek: currentWeek,
    endWeek: currentWeek + peakWeeks - 1,
    durationWeeks: peakWeeks,
    volumeRange: {
      min: buildMaxVolume * 0.85,
      max: peakMaxVolume
    },
    intensityDistribution: { easy: 50, moderate: 30, hard: 20 },
    qualitySessionsPerWeek: 2,
    longRunTarget: goalDistance === 'MARATHON' ? 180 : 120,
    description: 'Maximum intensity with race-specific workouts'
  });
  currentWeek += peakWeeks;

  // Taper Phase
  phases.push({
    phase: 'TAPER',
    startWeek: currentWeek,
    endWeek: currentWeek + taperWeeks - 1,
    durationWeeks: taperWeeks,
    volumeRange: {
      min: peakMaxVolume * 0.3,   // 70% reduction by final week
      max: peakMaxVolume * 0.75   // 25% reduction in week 1
    },
    intensityDistribution: { easy: 60, moderate: 25, hard: 15 },
    qualitySessionsPerWeek: 1,
    longRunTarget: 60,
    description: 'Reduce volume, maintain intensity for supercompensation'
  });

  return phases;
}

/**
 * Get phase duration requirements by athlete level
 */
interface PhaseDurationRequirements {
  baseMin: number;
  baseMax: number;
  buildMin: number;
  buildMax: number;
  peakMin: number;
  peakMax: number;
}

function getPhaseDurationRequirements(
  level: AthleteLevel,
  distance: GoalDistance
): PhaseDurationRequirements {
  const requirements: Record<AthleteLevel, PhaseDurationRequirements> = {
    BEGINNER: {
      baseMin: 12,
      baseMax: 24,
      buildMin: 6,
      buildMax: 8,
      peakMin: 3,
      peakMax: 4
    },
    RECREATIONAL: {
      baseMin: 8,
      baseMax: 16,
      buildMin: 6,
      buildMax: 8,
      peakMin: 3,
      peakMax: distance === 'MARATHON' ? 6 : 4
    },
    ADVANCED: {
      baseMin: 4,
      baseMax: 12,
      buildMin: 6,
      buildMax: 8,
      peakMin: 3,
      peakMax: distance === 'MARATHON' ? 6 : 4
    },
    ELITE: {
      baseMin: 4,
      baseMax: 8,
      buildMin: 6,
      buildMax: 8,
      peekMin: 3,
      peakMax: distance === 'MARATHON' ? 6 : 4
    }
  };

  return requirements[level];
}

/**
 * Get taper duration by race distance
 */
function getTaperDuration(distance: GoalDistance): number {
  const taperWeeks: Record<GoalDistance, number> = {
    '5K': 1,
    '10K': 1.5,  // 10 days
    'HALF_MARATHON': 2,
    'MARATHON': 3,
    'ULTRAMARATHON': 2,
    'GENERAL_FITNESS': 0
  };

  return Math.ceil(taperWeeks[distance]);
}

/**
 * Get weekly progression rate by athlete level
 */
function getProgressionRate(level: AthleteLevel): number {
  const rates: Record<AthleteLevel, number> = {
    BEGINNER: 0.175,    // 17.5% per week
    RECREATIONAL: 0.125, // 12.5%
    ADVANCED: 0.075,    // 7.5%
    ELITE: 0.075        // 7.5%
  };

  return rates[level];
}

/**
 * Validate phase structure
 */
export function validatePhases(phases: ProgramPhase[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check phase order
  const expectedOrder: TrainingPhase[] = ['BASE', 'BUILD', 'PEAK', 'TAPER'];
  const actualOrder = phases.map(p => p.phase);

  for (let i = 0; i < expectedOrder.length; i++) {
    if (actualOrder[i] !== expectedOrder[i]) {
      errors.push(`Phase ${i + 1} should be ${expectedOrder[i]}, found ${actualOrder[i]}`);
    }
  }

  // Check week continuity
  for (let i = 1; i < phases.length; i++) {
    if (phases[i].startWeek !== phases[i - 1].endWeek + 1) {
      errors.push(`Gap in weeks between ${phases[i - 1].phase} and ${phases[i].phase}`);
    }
  }

  // Check peak duration
  const peakPhase = phases.find(p => p.phase === 'PEAK');
  if (peakPhase && peakPhase.durationWeeks > 6) {
    errors.push(`Peak phase ${peakPhase.durationWeeks} weeks exceeds 6-week maximum (burnout risk)`);
  }

  // Check volume progression
  for (let i = 1; i < phases.length - 1; i++) {  // Exclude taper
    if (phases[i].volumeRange.max < phases[i - 1].volumeRange.max) {
      errors.push(`Volume should increase from ${phases[i - 1].phase} to ${phases[i].phase}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Task 7.3: Target Time Estimation

**File:** `lib/training-engine/program-generator/target-time.ts`

**Reference:** Program Generation Research, Section 6

```typescript
/**
 * Target Time Estimation Module
 *
 * Methods:
 * 1. VDOT (Jack Daniels) - from recent race
 * 2. Riegel Formula - distance-based prediction
 * 3. LT2 Ratio - from physiological testing
 * 4. Target only - conservative estimation
 *
 * @module target-time
 */

import { GoalDistance, AthleteLevel } from '../methodologies/types';
import { TargetTimeEstimation } from './types';

/**
 * Estimate target time from multiple methods
 *
 * Priority:
 * 1. Recent race performance + VDOT
 * 2. LT2 testing + ratio method
 * 3. Target time only (requires validation)
 *
 * @param params - Estimation parameters
 * @returns Time estimation with confidence
 */
export interface TimeEstimationParams {
  goalDistance: GoalDistance;
  targetTime?: number;          // seconds
  previousBestTime?: number;
  previousBestDistance?: GoalDistance;
  lt2Pace?: number;             // sec/km
  athleteLevel: AthleteLevel;
}

export function estimateTargetTime(params: TimeEstimationParams): TargetTimeEstimation {
  const { goalDistance, targetTime, previousBestTime, previousBestDistance, lt2Pace } = params;

  // Method 1: VDOT from recent race
  if (previousBestTime && previousBestDistance) {
    const vdot = calculateVDOT(previousBestTime, previousBestDistance);
    const predictedTime = predictTimeFromVDOT(vdot, goalDistance);

    return {
      method: 'VDOT',
      confidence: 'HIGH',
      predictedTime,
      confidenceInterval: {
        min: predictedTime * 0.98,
        max: predictedTime * 1.02
      },
      trainingPaces: calculateTrainingPaces(vdot, goalDistance),
      requiresValidation: false
    };
  }

  // Method 2: Riegel formula from recent race
  if (previousBestTime && previousBestDistance) {
    const predictedTime = riegelFormula(
      previousBestTime,
      getDistanceInMeters(previousBestDistance),
      getDistanceInMeters(goalDistance),
      params.athleteLevel
    );

    return {
      method: 'RIEGEL',
      confidence: 'MEDIUM',
      predictedTime,
      confidenceInterval: {
        min: predictedTime * 0.95,
        max: predictedTime * 1.05
      },
      trainingPaces: calculatePacesFromTime(predictedTime, goalDistance),
      requiresValidation: false
    };
  }

  // Method 3: LT2 ratio
  if (lt2Pace) {
    const predictedTime = predictTimeFromLT2(lt2Pace, goalDistance, params.athleteLevel);

    return {
      method: 'LT2_RATIO',
      confidence: 'HIGH',
      predictedTime,
      confidenceInterval: {
        min: predictedTime * 0.97,
        max: predictedTime * 1.03
      },
      trainingPaces: calculatePacesFromLT2(lt2Pace),
      requiresValidation: false
    };
  }

  // Method 4: Target time only (requires validation)
  if (targetTime) {
    return {
      method: 'TARGET_ONLY',
      confidence: 'UNVALIDATED',
      predictedTime: targetTime,
      confidenceInterval: {
        min: targetTime * 0.85,
        max: targetTime * 1.15
      },
      trainingPaces: calculatePacesFromTime(targetTime, goalDistance),
      requiresValidation: true,
      validationTest: '30MIN_TT',
      validationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)  // 2 weeks
    };
  }

  throw new Error('Insufficient data for time estimation');
}

/**
 * Calculate VDOT from race performance
 *
 * Simplified VDOT formula based on race time and distance
 */
function calculateVDOT(timeSeconds: number, distance: GoalDistance): number {
  const distanceMeters = getDistanceInMeters(distance);
  const velocityMPerMin = distanceMeters / (timeSeconds / 60);

  // Jack Daniels VDOT formula (simplified)
  const percentVO2 = 0.8 + 0.1894393 * Math.exp(-0.012778 * (timeSeconds / 60)) +
                     0.2989558 * Math.exp(-0.1932605 * (timeSeconds / 60));

  const vdot = (-4.60 + 0.182258 * velocityMPerMin +
                0.000104 * velocityMPerMin * velocityMPerMin) / percentVO2;

  return Math.round(vdot * 10) / 10;
}

/**
 * Predict race time from VDOT
 */
function predictTimeFromVDOT(vdot: number, distance: GoalDistance): number {
  // VDOT race pace tables (simplified)
  const distanceMeters = getDistanceInMeters(distance);

  // Calculate velocity in m/min from VDOT
  // This is inverse of VDOT formula (approximated)
  const velocity = 29.54 + 5.000663 * vdot - 0.007546 * vdot * vdot;

  // Time = distance / velocity
  const timeMinutes = distanceMeters / velocity;

  return Math.round(timeMinutes * 60);  // Convert to seconds
}

/**
 * Riegel formula for distance-based prediction
 *
 * Time2 = Time1 × (Distance2 / Distance1)^FatigueFactor
 */
function riegelFormula(
  time1: number,
  distance1: number,
  distance2: number,
  level: AthleteLevel
): number {
  // Fatigue factor by athlete level
  const fatigueFactor: Record<AthleteLevel, number> = {
    BEGINNER: 1.08,
    RECREATIONAL: 1.07,
    ADVANCED: 1.06,
    ELITE: 1.05
  };

  const factor = fatigueFactor[level];
  const ratio = Math.pow(distance2 / distance1, factor);

  return Math.round(time1 * ratio);
}

/**
 * Predict race time from LT2 pace
 */
function predictTimeFromLT2(
  lt2PaceSecPerKm: number,
  distance: GoalDistance,
  level: AthleteLevel
): number {
  // Race pace as % of LT2 pace by distance and level
  const racePaceRatios: Record<GoalDistance, Record<AthleteLevel, number>> = {
    '5K': {
      BEGINNER: 1.05,
      RECREATIONAL: 1.07,
      ADVANCED: 1.08,
      ELITE: 1.10
    },
    '10K': {
      BEGINNER: 1.00,
      RECREATIONAL: 1.02,
      ADVANCED: 1.03,
      ELITE: 1.05
    },
    'HALF_MARATHON': {
      BEGINNER: 0.98,
      RECREATIONAL: 1.00,
      ADVANCED: 1.00,
      ELITE: 1.00
    },
    'MARATHON': {
      BEGINNER: 0.83,
      RECREATIONAL: 0.85,
      ADVANCED: 0.88,
      ELITE: 0.88
    },
    'ULTRAMARATHON': {
      BEGINNER: 0.70,
      RECREATIONAL: 0.75,
      ADVANCED: 0.78,
      ELITE: 0.80
    },
    'GENERAL_FITNESS': {
      BEGINNER: 1.00,
      RECREATIONAL: 1.00,
      ADVANCED: 1.00,
      ELITE: 1.00
    }
  };

  const ratio = racePaceRatios[distance][level];
  const racePace = lt2PaceSecPerKm / ratio;
  const distanceKm = getDistanceInMeters(distance) / 1000;

  return Math.round(racePace * distanceKm);
}

/**
 * Calculate training paces from VDOT
 */
function calculateTrainingPaces(vdot: number, distance: GoalDistance) {
  // VDOT training pace tables (simplified percentages of VDOT pace)
  const basePace = 29.54 + 5.000663 * vdot - 0.007546 * vdot * vdot;  // m/min
  const baseSecPerKm = (1000 / basePace) * 60;

  return {
    easy: { min: baseSecPerKm * 1.30, max: baseSecPerKm * 1.20 },
    tempo: { min: baseSecPerKm * 1.10, max: baseSecPerKm * 1.05 },
    threshold: { min: baseSecPerKm * 1.02, max: baseSecPerKm * 0.98 },
    vo2max: { min: baseSecPerKm * 0.95, max: baseSecPerKm * 0.90 }
  };
}

/**
 * Calculate training paces from LT2 pace
 */
function calculatePacesFromLT2(lt2PaceSecPerKm: number) {
  return {
    easy: { min: lt2PaceSecPerKm * 1.40, max: lt2PaceSecPerKm * 1.20 },
    tempo: { min: lt2PaceSecPerKm * 1.10, max: lt2PaceSecPerKm * 1.05 },
    threshold: { min: lt2PaceSecPerKm * 1.02, max: lt2PaceSecPerKm * 0.98 },
    vo2max: { min: lt2PaceSecPerKm * 0.95, max: lt2PaceSecPerKm * 0.90 }
  };
}

/**
 * Calculate paces from target time (conservative)
 */
function calculatePacesFromTime(targetTime: number, distance: GoalDistance) {
  const distanceKm = getDistanceInMeters(distance) / 1000;
  const targetPace = targetTime / distanceKm;

  // Estimate LT2 from race pace (inverse of prediction)
  const estimatedLT2 = targetPace * 1.15;  // Conservative estimate

  return calculatePacesFromLT2(estimatedLT2);
}

/**
 * Get distance in meters
 */
function getDistanceInMeters(distance: GoalDistance): number {
  const distances: Record<GoalDistance, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF_MARATHON': 21097.5,
    'MARATHON': 42195,
    'ULTRAMARATHON': 50000,
    'GENERAL_FITNESS': 10000
  };

  return distances[distance];
}
```

---

## Task 7.4: Progressive Overload Calculator

**File:** `lib/training-engine/program-generator/progression.ts`

**Reference:** Program Generation Research, Section 4

```typescript
/**
 * Progressive Overload Calculator
 *
 * Implements 3-week up, 1-week down model:
 * - Week 1: Base volume
 * - Week 2: Base × (1 + rate)
 * - Week 3: Base × (1 + rate)²
 * - Week 4: Deload to base
 * - New cycle: Base × (1 + rate × 0.5)
 *
 * @module progression
 */

import { AthleteLevel, TrainingPhase } from '../methodologies/types';
import { ProgressionRule } from './types';

/**
 * Get progression rules by athlete level
 */
export function getProgressionRules(level: AthleteLevel): ProgressionRule {
  const rules: Record<AthleteLevel, ProgressionRule> = {
    BEGINNER: {
      athleteLevel: 'BEGINNER',
      weeklyIncreasePercent: 17.5,
      maxWeeklyIncreaseKm: 8,
      progressionWeeks: 3,
      deloadReductionPercent: 45
    },
    RECREATIONAL: {
      athleteLevel: 'RECREATIONAL',
      weeklyIncreasePercent: 12.5,
      maxWeeklyIncreaseKm: 10,
      progressionWeeks: 3,
      deloadReductionPercent: 35
    },
    ADVANCED: {
      athleteLevel: 'ADVANCED',
      weeklyIncreasePercent: 7.5,
      maxWeeklyIncreaseKm: 12,
      progressionWeeks: 3,
      deloadReductionPercent: 25
    },
    ELITE: {
      athleteLevel: 'ELITE',
      weeklyIncreasePercent: 7.5,
      maxWeeklyIncreaseKm: 15,
      progressionWeeks: 3,
      deloadReductionPercent: 20
    }
  };

  return rules[level];
}

/**
 * Calculate weekly volumes for a phase
 *
 * Implements 3-up, 1-down progression model
 */
export function calculateWeeklyVolumes(
  startVolume: number,
  endVolume: number,
  weeksInPhase: number,
  phase: TrainingPhase,
  rules: ProgressionRule
): number[] {
  const volumes: number[] = [];
  const rate = rules.weeklyIncreasePercent / 100;

  let currentBase = startVolume;
  let weekInCycle = 1;

  for (let week = 0; week < weeksInPhase; week++) {
    if (phase === 'TAPER') {
      // Taper: progressive reduction
      const taperWeek = week + 1;
      const totalTaperWeeks = weeksInPhase;
      const reductionPercent = (taperWeek / totalTaperWeeks) * 70;  // Up to 70% reduction
      volumes.push(Math.round(startVolume * (1 - reductionPercent / 100)));
    } else {
      // Normal progression
      if (weekInCycle <= rules.progressionWeeks) {
        // Build weeks
        const multiplier = Math.pow(1 + rate, weekInCycle - 1);
        let volume = currentBase * multiplier;

        // Apply maximum weekly increase cap
        if (week > 0) {
          const previousVolume = volumes[week - 1];
          const increase = volume - previousVolume;
          if (increase > rules.maxWeeklyIncreaseKm) {
            volume = previousVolume + rules.maxWeeklyIncreaseKm;
          }
        }

        // Don't exceed end volume
        volume = Math.min(volume, endVolume);

        volumes.push(Math.round(volume));
        weekInCycle++;
      } else {
        // Deload week
        volumes.push(Math.round(currentBase));

        // Update base for next cycle
        currentBase = currentBase * (1 + rate * 0.5);
        weekInCycle = 1;
      }
    }
  }

  return volumes;
}

/**
 * Calculate ACWR (Acute:Chronic Workload Ratio)
 *
 * Uses EWMA (Exponentially Weighted Moving Average) method
 */
export function calculateACWR(
  recentWeeklyLoads: number[],  // Last 7+ weeks of TSS
  currentWeekPlanned: number
): number {
  if (recentWeeklyLoads.length < 4) {
    return 1.0;  // Not enough history
  }

  // EWMA decay constants
  const acuteDecay = Math.exp(-1 / 7);    // 7-day half-life
  const chronicDecay = Math.exp(-1 / 28); // 28-day half-life

  // Calculate acute load (last 7 days)
  let acuteLoad = currentWeekPlanned;
  for (let i = 0; i < Math.min(7, recentWeeklyLoads.length); i++) {
    acuteLoad += recentWeeklyLoads[i] * Math.pow(acuteDecay, i + 1);
  }
  acuteLoad /= (1 - Math.pow(acuteDecay, Math.min(7, recentWeeklyLoads.length) + 1)) / (1 - acuteDecay);

  // Calculate chronic load (last 28 days)
  let chronicLoad = 0;
  for (let i = 0; i < Math.min(28, recentWeeklyLoads.length); i++) {
    chronicLoad += (i === 0 ? currentWeekPlanned : recentWeeklyLoads[i - 1]) *
                   Math.pow(chronicDecay, i);
  }
  chronicLoad /= (1 - Math.pow(chronicDecay, Math.min(28, recentWeeklyLoads.length))) / (1 - chronicDecay);

  // ACWR = Acute / Chronic
  return Math.round((acuteLoad / chronicLoad) * 100) / 100;
}

/**
 * Validate weekly progression
 *
 * Checks for unsafe volume increases
 */
export function validateProgression(
  volumes: number[],
  rules: ProgressionRule
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  for (let i = 1; i < volumes.length; i++) {
    const increase = volumes[i] - volumes[i - 1];
    const increasePercent = (increase / volumes[i - 1]) * 100;

    // Check percentage increase
    if (increasePercent > rules.weeklyIncreasePercent * 1.5) {
      warnings.push(
        `Week ${i + 1}: ${increasePercent.toFixed(1)}% increase exceeds safe limit ` +
        `(${(rules.weeklyIncreasePercent * 1.5).toFixed(1)}%)`
      );
    }

    // Check absolute increase
    if (increase > rules.maxWeeklyIncreaseKm * 1.2) {
      warnings.push(
        `Week ${i + 1}: +${increase.toFixed(1)}km exceeds safe limit ` +
        `(${rules.maxWeeklyIncreaseKm}km)`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}
```

---

## Task 7.5: Deload Scheduling

**File:** `lib/training-engine/program-generator/deload.ts`

**Reference:** Program Generation Research, Section 5

```typescript
/**
 * Deload Scheduling System
 *
 * Implements automatic recovery weeks:
 * - Every 3-4 weeks (standard)
 * - Triggered by ACWR >1.3
 * - Triggered by fatigue markers
 *
 * @module deload
 */

import { AthleteLevel, TrainingPhase } from '../methodologies/types';
import { DeloadConfig, TrainingWeek } from './types';

/**
 * Determine if week should be a deload
 */
export function shouldDeload(
  weekNumber: number,
  phase: TrainingPhase,
  consecutiveWeeksSinceDeload: number,
  acwr: number,
  fatigueScore?: number
): boolean {
  // Automatic deload triggers
  if (acwr > 1.3) {
    return true;  // Critical injury risk
  }

  if (fatigueScore && fatigueScore > 75) {
    return true;  // High fatigue
  }

  // Phase-specific frequency
  const deloadFrequency = phase === 'PEAK' ? 3 : 4;

  if (consecutiveWeeksSinceDeload >= deloadFrequency) {
    return true;  // Scheduled deload
  }

  // Taper phase doesn't deload (it IS the deload)
  if (phase === 'TAPER') {
    return false;
  }

  return false;
}

/**
 * Get deload configuration by athlete level and phase
 */
export function getDeloadConfig(
  level: AthleteLevel,
  phase: TrainingPhase,
  fatigueScore?: number
): DeloadConfig {
  // Base reduction by level
  const baseReduction: Record<AthleteLevel, number> = {
    BEGINNER: 45,
    RECREATIONAL: 35,
    ADVANCED: 25,
    ELITE: 20
  };

  let reduction = baseReduction[level];

  // Adjust for fatigue
  if (fatigueScore) {
    if (fatigueScore > 80) {
      reduction += 10;  // High fatigue - more recovery
    } else if (fatigueScore < 60) {
      reduction -= 5;   // Low fatigue - less reduction needed
    }
  }

  // Intensity management
  let intensityReduction: 'NONE' | 'MODERATE' | 'FULL' = 'NONE';
  let eliminateQuality = false;

  if (fatigueScore && fatigueScore > 75) {
    intensityReduction = 'FULL';
    eliminateQuality = true;
  } else if (phase === 'PEAK') {
    intensityReduction = 'MODERATE';
    eliminateQuality = false;  // Maintain some quality
  }

  return {
    frequencyWeeks: phase === 'PEAK' ? 3 : 4,
    volumeReductionPercent: Math.min(50, Math.max(15, reduction)),
    intensityReduction,
    eliminateQuality
  };
}

/**
 * Apply deload to training week
 */
export function applyDeload(
  normalWeek: TrainingWeek,
  config: DeloadConfig
): TrainingWeek {
  const deloadWeek: TrainingWeek = {
    ...normalWeek,
    isDeload: true,
    progressionNote: `Deload week: ${config.volumeReductionPercent}% volume reduction for recovery`
  };

  // Reduce volume
  const volumeMultiplier = 1 - (config.volumeReductionPercent / 100);
  deloadWeek.plannedVolume = Math.round(normalWeek.plannedVolume * volumeMultiplier);
  deloadWeek.plannedTimeMinutes = Math.round(normalWeek.plannedTimeMinutes * volumeMultiplier);
  deloadWeek.plannedTSS = Math.round(normalWeek.plannedTSS * volumeMultiplier);

  // Modify workouts
  deloadWeek.days = normalWeek.days.map(day => {
    if (!day.workout) return day;

    const workout = { ...day.workout };

    if (config.eliminateQuality) {
      // Replace quality sessions with easy runs
      if (workout.type !== 'EASY_RUN' && workout.type !== 'RECOVERY_RUN' && workout.type !== 'REST') {
        return {
          ...day,
          workout: {
            ...workout,
            type: 'EASY_RUN',
            name: 'Easy Recovery Run',
            totalDuration: Math.round(workout.totalDuration * 0.6),
            totalDistance: Math.round(workout.totalDistance * 0.6),
            estimatedTSS: Math.round(workout.estimatedTSS * 0.5)
          }
        };
      }
    } else if (config.intensityReduction === 'MODERATE') {
      // Reduce quality volume but maintain intensity
      if (workout.type === 'THRESHOLD_INTERVALS' || workout.type === 'VO2MAX_INTERVALS') {
        workout.mainSet = workout.mainSet.map(segment => ({
          ...segment,
          repetitions: Math.max(1, Math.round(segment.repetitions * 0.75))
        }));
        workout.totalDuration = Math.round(workout.totalDuration * 0.75);
        workout.totalDistance = Math.round(workout.totalDistance * 0.75);
        workout.estimatedTSS = Math.round(workout.estimatedTSS * 0.75);
      }
    }

    // Reduce all workout durations
    workout.totalDuration = Math.round(workout.totalDuration * volumeMultiplier);
    workout.totalDistance = Math.round(workout.totalDistance * volumeMultiplier);
    workout.estimatedTSS = Math.round(workout.estimatedTSS * volumeMultiplier);

    return { ...day, workout };
  });

  return deloadWeek;
}

/**
 * Validate recovery after deload
 *
 * Check if markers indicate adequate recovery
 */
export interface RecoveryMarkers {
  restingHR?: number;
  baselineRestingHR?: number;
  hrv?: number;
  baselineHRV?: number;
  sleepQuality?: number;      // 1-10 scale
  muscleSoreness?: number;    // 1-10 scale
  motivation?: number;        // 1-10 scale
  perceivedEnergy?: number;   // 1-10 scale
}

export function validateRecovery(markers: RecoveryMarkers): {
  recovered: boolean;
  markersPassed: number;
  totalMarkers: number;
  needsExtension: boolean;
} {
  let passed = 0;
  let total = 0;

  // Check resting HR
  if (markers.restingHR && markers.baselineRestingHR) {
    total++;
    if (Math.abs(markers.restingHR - markers.baselineRestingHR) <= 2) {
      passed++;
    }
  }

  // Check HRV
  if (markers.hrv && markers.baselineHRV) {
    total++;
    const hrvPercent = (markers.hrv / markers.baselineHRV) * 100;
    if (hrvPercent >= 95) {
      passed++;
    }
  }

  // Check sleep quality
  if (markers.sleepQuality) {
    total++;
    if (markers.sleepQuality >= 7) {
      passed++;
    }
  }

  // Check muscle soreness
  if (markers.muscleSoreness) {
    total++;
    if (markers.muscleSoreness <= 2) {
      passed++;
    }
  }

  // Check motivation
  if (markers.motivation) {
    total++;
    if (markers.motivation >= 7) {
      passed++;
    }
  }

  // Check perceived energy
  if (markers.perceivedEnergy) {
    total++;
    if (markers.perceivedEnergy >= 7) {
      passed++;
    }
  }

  // Need to pass 6 of 7 criteria (or proportionally if fewer markers available)
  const requiredPassRate = 6 / 7;  // 85.7%
  const actualPassRate = total > 0 ? passed / total : 0;

  return {
    recovered: actualPassRate >= requiredPassRate && passed >= 4,  // Min 4 passed
    markersPassed: passed,
    totalMarkers: total,
    needsExtension: actualPassRate < 0.5  // Less than 50% - needs more time
  };
}
```

---

## Task 7.6: Weekly Builder (Simplified Overview)

**File:** `lib/training-engine/program-generator/weekly-builder.ts`

```typescript
/**
 * Weekly Training Builder
 *
 * Generates day-by-day training schedules based on:
 * - Phase requirements
 * - Methodology
 * - Athlete availability
 * - Progressive overload
 *
 * @module weekly-builder
 */

import { TrainingWeek, TrainingDay, Workout, ProgramInput } from './types';
import { MethodologyType, TrainingPhase } from '../methodologies/types';

/**
 * Build a training week
 *
 * Core logic:
 * 1. Determine quality sessions for week
 * 2. Place long run (Saturday/Sunday)
 * 3. Place quality sessions on specified days
 * 4. Fill remaining days with easy runs
 * 5. Add rest days
 */
export function buildTrainingWeek(
  weekNumber: number,
  phase: TrainingPhase,
  plannedVolume: number,
  input: ProgramInput,
  methodology: MethodologyType
): TrainingWeek {
  // Implementation would generate full week structure
  // See workout-templates.ts for workout generation

  const days: TrainingDay[] = [];
  const startDate = new Date(input.raceDate);
  startDate.setDate(startDate.getDate() - (totalWeeks - weekNumber) * 7);

  // Placeholder - full implementation would:
  // 1. Select workout types based on phase and methodology
  // 2. Calculate workout paces from LT1/LT2
  // 3. Distribute volume across days
  // 4. Apply ACWR constraints
  // 5. Place rest days strategically

  return {
    weekNumber,
    startDate,
    phase,
    plannedVolume,
    plannedTimeMinutes: 0,  // Calculate from workouts
    plannedTSS: 0,          // Calculate from workouts
    acwr: 1.0,              // Calculate from history
    isDeload: false,
    isRaceWeek: false,
    isTaper: phase === 'TAPER',
    days
  };
}
```

---

## Task 7.7: Workout Templates Library

**File:** `lib/training-engine/program-generator/workout-templates.ts`

```typescript
/**
 * Workout Templates Library
 *
 * 20+ workout templates with intensity prescriptions
 *
 * @module workout-templates
 */

import { Workout, WorkoutType, WorkoutSegment } from './types';

/**
 * Easy Run Template
 */
export function createEasyRun(
  duration: number,
  easyPace: { min: number; max: number },
  lt1HR: number
): Workout {
  return {
    id: crypto.randomUUID(),
    type: 'EASY_RUN',
    name: 'Easy Run',
    description: 'Conversational pace, below LT1',
    primaryZone: 2,
    targetPaceRange: easyPace,
    targetHR: lt1HR,
    warmupMinutes: 0,
    cooldownMinutes: 0,
    mainSet: [{
      type: 'WORK',
      repetitions: 1,
      duration,
      pace: (easyPace.min + easyPace.max) / 2,
      intensity: 'Zone 2 - Easy, conversational',
      restDuration: 0,
      restType: 'COMPLETE'
    }],
    totalDuration: duration,
    totalDistance: (duration * 60) / ((easyPace.min + easyPace.max) / 2),
    estimatedTSS: duration * 0.6  // ~60 TSS per hour for easy running
  };
}

/**
 * Threshold Intervals Template
 */
export function createThresholdIntervals(
  intervals: number,
  durationMinutes: number,
  lt2Pace: number,
  lt2HR: number
): Workout {
  const restSeconds = durationMinutes <= 5 ? 60 : 90;

  return {
    id: crypto.randomUUID(),
    type: 'THRESHOLD_INTERVALS',
    name: `${intervals} × ${durationMinutes} min Threshold`,
    description: `${intervals} repetitions at LT2 pace with ${restSeconds}s recovery`,
    primaryZone: 4,
    targetPace: lt2Pace,
    targetHR: lt2HR,
    warmupMinutes: 15,
    cooldownMinutes: 10,
    mainSet: [
      {
        type: 'WARMUP',
        repetitions: 1,
        duration: 15,
        intensity: 'Easy pace',
        restDuration: 0,
        restType: 'COMPLETE'
      },
      {
        type: 'WORK',
        repetitions: intervals,
        duration: durationMinutes,
        pace: lt2Pace,
        intensity: 'Zone 4 - At LT2, steady state',
        restDuration: restSeconds,
        restType: 'ACTIVE'
      },
      {
        type: 'COOLDOWN',
        repetitions: 1,
        duration: 10,
        intensity: 'Easy pace',
        restDuration: 0,
        restType: 'COMPLETE'
      }
    ],
    totalDuration: 15 + (durationMinutes * intervals) + ((intervals - 1) * restSeconds / 60) + 10,
    totalDistance: 0,  // Calculate from pace
    estimatedTSS: (durationMinutes * intervals) * 1.33  // ~80 TSS per hour at threshold
  };
}

/**
 * VO2max Intervals (Norwegian 4×4)
 */
export function createVO2maxIntervals(
  vo2maxPace: number,
  maxHR: number
): Workout {
  return {
    id: crypto.randomUUID(),
    type: 'VO2MAX_INTERVALS',
    name: 'Norwegian 4×4',
    description: '4 × 4 minutes at 90-95% max HR',
    primaryZone: 5,
    targetPace: vo2maxPace,
    targetHR: Math.round(maxHR * 0.925),  // 92.5% max HR
    warmupMinutes: 10,
    cooldownMinutes: 10,
    mainSet: [
      {
        type: 'WARMUP',
        repetitions: 1,
        duration: 10,
        intensity: 'Easy pace',
        restDuration: 0,
        restType: 'COMPLETE'
      },
      {
        type: 'WORK',
        repetitions: 4,
        duration: 4,
        pace: vo2maxPace,
        intensity: 'Zone 5 - 90-95% max HR, hard effort',
        restDuration: 180,  // 3 minutes
        restType: 'ACTIVE'
      },
      {
        type: 'COOLDOWN',
        repetitions: 1,
        duration: 10,
        intensity: 'Easy pace',
        restDuration: 0,
        restType: 'COMPLETE'
      }
    ],
    totalDuration: 45,
    totalDistance: 0,  // Calculate from pace
    estimatedTSS: 100  // High TSS for VO2max work
  };
}

/**
 * Long Run Template
 */
export function createLongRun(
  duration: number,
  easyPace: { min: number; max: number },
  phase: string
): Workout {
  const avgPace = (easyPace.min + easyPace.max) / 2;

  return {
    id: crypto.randomUUID(),
    type: 'LONG_RUN',
    name: 'Long Run',
    description: phase === 'PEAK' ?
      'Long run with progression' :
      'Steady long run at easy pace',
    primaryZone: 2,
    targetPaceRange: easyPace,
    warmupMinutes: 0,
    cooldownMinutes: 0,
    mainSet: [{
      type: 'WORK',
      repetitions: 1,
      duration,
      pace: avgPace,
      intensity: 'Zone 2 - Conversational pace',
      restDuration: 0,
      restType: 'COMPLETE'
    }],
    totalDuration: duration,
    totalDistance: (duration * 60) / avgPace,
    estimatedTSS: duration * 0.65  // Slightly higher TSS for long duration
  };
}

// Additional templates would include:
// - createTempoRun
// - createProgressionRun
// - createFartlek
// - createHillRepeats
// - createRacePaceIntervals
// - createRecoveryRun
// - createStrides
```

---

## Task 7.8: Validation System

**File:** `lib/training-engine/program-generator/validation.ts`

```typescript
/**
 * Program Validation System
 *
 * 15+ validation rules to ensure safe, effective programs
 *
 * @module validation
 */

import { TrainingProgram, ValidationResult, ValidationError, ValidationCheck } from './types';
import { ProgressionRule } from './types';

/**
 * Validate complete training program
 *
 * Checks:
 * 1. Volume progression safety
 * 2. ACWR limits
 * 3. Phase structure
 * 4. Recovery adequacy
 * 5. Intensity distribution
 * 6. Quality session spacing
 * 7. Long run limits
 * 8. Deload frequency
 *
 * @param program - Generated program
 * @returns Validation result
 */
export function validateProgram(program: TrainingProgram): ValidationResult {
  const errors: ValidationError[] = [];
  const checks: ValidationCheck[] = [];

  // Check 1: Volume Progression Safety
  const volumeCheck = validateVolumeProgression(program);
  checks.push(volumeCheck);
  if (!volumeCheck.passed) {
    errors.push({
      code: 'UNSAFE_VOLUME_PROGRESSION',
      message: 'Weekly volume increases exceed safe limits',
      severity: 'ERROR'
    });
  }

  // Check 2: ACWR Limits
  const acwrCheck = validateACWR(program);
  checks.push(acwrCheck);
  if (!acwrCheck.passed) {
    errors.push({
      code: 'ACWR_EXCESSIVE',
      message: 'Projected ACWR exceeds 1.3 (injury risk)',
      severity: 'ERROR'
    });
  }

  // Check 3: Phase Duration
  const phaseCheck = validatePhaseDurations(program);
  checks.push(phaseCheck);
  if (!phaseCheck.passed) {
    errors.push({
      code: 'INVALID_PHASE_DURATION',
      message: 'Phase durations outside recommended ranges',
      severity: 'WARNING'
    });
  }

  // Check 4: Recovery Days
  const recoveryCheck = validateRecoveryDays(program);
  checks.push(recoveryCheck);
  if (!recoveryCheck.passed) {
    errors.push({
      code: 'INSUFFICIENT_RECOVERY',
      message: 'Insufficient rest days or recovery between quality sessions',
      severity: 'ERROR'
    });
  }

  // Check 5: Long Run Limits
  const longRunCheck = validateLongRuns(program);
  checks.push(longRunCheck);
  if (!longRunCheck.passed) {
    errors.push({
      code: 'LONG_RUN_EXCESSIVE',
      message: 'Long run exceeds 35% of weekly volume or 3 hours',
      severity: 'WARNING'
    });
  }

  // Check 6: Deload Frequency
  const deloadCheck = validateDeloadFrequency(program);
  checks.push(deloadCheck);
  if (!deloadCheck.passed) {
    errors.push({
      code: 'DELOAD_MISSING',
      message: 'No deload weeks scheduled for 5+ consecutive weeks',
      severity: 'WARNING'
    });
  }

  // Check 7: Quality Session Spacing
  const qualityCheck = validateQualitySpacing(program);
  checks.push(qualityCheck);
  if (!qualityCheck.passed) {
    errors.push({
      code: 'QUALITY_TOO_CLOSE',
      message: 'Quality sessions scheduled back-to-back',
      severity: 'ERROR'
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'ERROR').length === 0,
    errors,
    warnings: errors.filter(e => e.severity === 'WARNING').map(e => ({
      code: e.code,
      message: e.message,
      recommendation: getRecommendation(e.code)
    })),
    checks
  };
}

/**
 * Validate volume progression
 */
function validateVolumeProgression(program: TrainingProgram): ValidationCheck {
  let passed = true;
  const violations: string[] = [];

  for (let i = 1; i < program.weeks.length; i++) {
    const previous = program.weeks[i - 1];
    const current = program.weeks[i];

    // Skip deload weeks and taper
    if (current.isDeload || current.isTaper) continue;

    const increase = current.plannedVolume - previous.plannedVolume;
    const increasePercent = (increase / previous.plannedVolume) * 100;

    // Check if increase exceeds 25% (very unsafe)
    if (increasePercent > 25) {
      passed = false;
      violations.push(`Week ${i + 1}: +${increasePercent.toFixed(1)}%`);
    }
  }

  return {
    name: 'Volume Progression Safety',
    passed,
    value: violations.length === 0 ? 'All increases safe' : violations.join(', '),
    threshold: '<25% per week'
  };
}

/**
 * Validate ACWR stays below 1.3
 */
function validateACWR(program: TrainingProgram): ValidationCheck {
  const maxACWR = Math.max(...program.weeks.map(w => w.acwr));

  return {
    name: 'ACWR Limits',
    passed: maxACWR <= 1.3,
    value: maxACWR.toFixed(2),
    threshold: '≤1.3'
  };
}

/**
 * Validate phase durations
 */
function validatePhaseDurations(program: TrainingProgram): ValidationCheck {
  const peakPhase = program.phases.find(p => p.phase === 'PEAK');

  if (peakPhase && peakPhase.durationWeeks > 6) {
    return {
      name: 'Phase Duration',
      passed: false,
      value: `Peak: ${peakPhase.durationWeeks} weeks`,
      threshold: 'Peak ≤6 weeks'
    };
  }

  return {
    name: 'Phase Duration',
    passed: true,
    value: 'All phases within limits'
  };
}

/**
 * Validate recovery days
 */
function validateRecoveryDays(program: TrainingProgram): ValidationCheck {
  // Check for back-to-back hard days
  for (const week of program.weeks) {
    let consecutiveHard = 0;

    for (const day of week.days) {
      if (!day.workout || day.isRestDay) {
        consecutiveHard = 0;
        continue;
      }

      const isHard = day.workout.type === 'THRESHOLD_INTERVALS' ||
                     day.workout.type === 'VO2MAX_INTERVALS' ||
                     day.workout.type === 'RACE_PACE_INTERVALS' ||
                     day.workout.type === 'LONG_RUN';

      if (isHard) {
        consecutiveHard++;
        if (consecutiveHard > 2) {
          return {
            name: 'Recovery Adequacy',
            passed: false,
            value: `Week ${week.weekNumber}: 3+ consecutive hard days`,
            threshold: 'Max 2 consecutive hard days'
          };
        }
      } else {
        consecutiveHard = 0;
      }
    }
  }

  return {
    name: 'Recovery Adequacy',
    passed: true,
    value: 'Adequate recovery between quality sessions'
  };
}

/**
 * Validate long runs
 */
function validateLongRuns(program: TrainingProgram): ValidationCheck {
  for (const week of program.weeks) {
    const longRun = week.days.find(d => d.workout?.type === 'LONG_RUN');
    if (!longRun || !longRun.workout) continue;

    const longRunPercent = (longRun.workout.totalDistance / week.plannedVolume) * 100;

    if (longRunPercent > 35) {
      return {
        name: 'Long Run Limits',
        passed: false,
        value: `Week ${week.weekNumber}: ${longRunPercent.toFixed(1)}% of weekly volume`,
        threshold: '≤35%'
      };
    }

    if (longRun.workout.totalDuration > 180) {
      return {
        name: 'Long Run Limits',
        passed: false,
        value: `Week ${week.weekNumber}: ${longRun.workout.totalDuration} minutes`,
        threshold: '≤180 minutes'
      };
    }
  }

  return {
    name: 'Long Run Limits',
    passed: true,
    value: 'All long runs within safe limits'
  };
}

/**
 * Validate deload frequency
 */
function validateDeloadFrequency(program: TrainingProgram): ValidationCheck {
  let weeksSinceDeload = 0;
  let maxConsecutive = 0;

  for (const week of program.weeks) {
    if (week.isDeload || week.isTaper) {
      maxConsecutive = Math.max(maxConsecutive, weeksSinceDeload);
      weeksSinceDeload = 0;
    } else {
      weeksSinceDeload++;
    }
  }

  return {
    name: 'Deload Frequency',
    passed: maxConsecutive <= 4,
    value: `Max ${maxConsecutive} consecutive weeks`,
    threshold: '≤4 weeks between deloads'
  };
}

/**
 * Validate quality session spacing
 */
function validateQualitySpacing(program: TrainingProgram): ValidationCheck {
  for (const week of program.weeks) {
    for (let i = 1; i < week.days.length; i++) {
      const yesterday = week.days[i - 1];
      const today = week.days[i];

      if (!yesterday.workout || !today.workout) continue;

      const yesterdayHard = yesterday.workout.type === 'THRESHOLD_INTERVALS' ||
                            yesterday.workout.type === 'VO2MAX_INTERVALS' ||
                            yesterday.workout.type === 'RACE_PACE_INTERVALS';

      const todayHard = today.workout.type === 'THRESHOLD_INTERVALS' ||
                        today.workout.type === 'VO2MAX_INTERVALS' ||
                        today.workout.type === 'RACE_PACE_INTERVALS';

      if (yesterdayHard && todayHard) {
        return {
          name: 'Quality Session Spacing',
          passed: false,
          value: `Week ${week.weekNumber}: Back-to-back quality sessions`,
          threshold: 'Minimum 48 hours between quality'
        };
      }
    }
  }

  return {
    name: 'Quality Session Spacing',
    passed: true,
    value: 'Adequate spacing between quality sessions'
  };
}

/**
 * Get recommendation for error code
 */
function getRecommendation(code: string): string {
  const recommendations: Record<string, string> = {
    'UNSAFE_VOLUME_PROGRESSION': 'Reduce weekly volume increases to <15% per week',
    'ACWR_EXCESSIVE': 'Add deload week or reduce planned volume',
    'INVALID_PHASE_DURATION': 'Adjust phase lengths or extend total program duration',
    'INSUFFICIENT_RECOVERY': 'Add rest days or space quality sessions 48+ hours apart',
    'LONG_RUN_EXCESSIVE': 'Cap long run at 35% of weekly volume or 3 hours maximum',
    'DELOAD_MISSING': 'Schedule deload week every 3-4 weeks',
    'QUALITY_TOO_CLOSE': 'Place easy day or rest day between quality sessions'
  };

  return recommendations[code] || 'Review program structure and adjust as needed';
}
```

---

## Task 7.9: Benchmark Field-Test Scheduler

**File:** `lib/training-engine/program-generator/field-test-schedule.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 14.2 (Implementation Pipeline Step 9)

```typescript
/**
 * Field-Test Scheduler
 *
 * Generates a benchmark calendar (30-min TT, 20-min TT, HR drift, race validations)
 * aligned with methodology requirements and target-time validation deadlines.
 */

export interface FieldTestSchedule {
  weekNumber: number;
  date: Date;
  test: 'THIRTY_MIN_TT' | 'TWENTY_MIN_TT' | 'HR_DRIFT' | 'RACE_VALIDATION' | 'REST';
  purpose: string;
  critical: boolean;
  followUpAction?: string;
}

export function scheduleFieldTests(
  program: TrainingProgram,
  methodology: MethodologyType,
  validationNeeds: ValidationWarning[]
): FieldTestSchedule[] {
  // Map validation deadlines to actual program weeks
  // Ensure ≥14 days between critical tests and avoid deload/taper conflicts
  // Insert Norwegian-specific HR drift checks and target-time validation cadence
  return [];
}
```

#### Acceptance Criteria
- [ ] Scheduler covers required validation checkpoints (target-time-only athletes, improvement goals, Norwegian HR drift)
- [ ] Enforces safe spacing between critical tests and respects deload/taper weeks
- [ ] Produces follow-up actions when tests fall outside expectations
- [ ] Exposed via API for coach dashboards and athlete calendars
- [ ] Unit tests cover multiple methodologies and race timelines

---

### Task 7.10: Program Report Compiler

**File:** `lib/training-engine/program-generator/report.ts`

**Reference:** SKILL_ENHANCED_PART2.md, Section 14.2 (Implementation Pipeline Step 10)

```typescript
/**
 * Program Report Compiler
 *
 * Aggregates thresholds, zones, methodology summary, multi-race plan,
 * field-test schedule, race-day protocols, and outstanding warnings into
 * a single exportable report for coach/athlete consumption.
 */

export interface ProgramReport {
  thresholds: ThresholdSummary;
  zones: TrainingZones;
  methodology: MethodologySummary;
  multiRacePlan?: SeasonPlan;
  weeklyOverview: WeeklySummary[];
  raceProtocols: RaceDayProtocol[];
  fieldTestSchedule: FieldTestSchedule[];
  warnings: string[];
}

export function compileProgramReport(
  program: TrainingProgram,
  data: {
    thresholds: ThresholdSummary;
    zones: TrainingZones;
    methodology: MethodologySummary;
    multiRacePlan?: SeasonPlan;
    raceProtocols: RaceDayProtocol[];
    fieldTestSchedule: FieldTestSchedule[];
    warnings: string[];
  }
): ProgramReport {
  return {
    thresholds: data.thresholds,
    zones: data.zones,
    methodology: data.methodology,
    multiRacePlan: data.multiRacePlan,
    weeklyOverview: summariseWeeks(program.weeks),
    raceProtocols: data.raceProtocols,
    fieldTestSchedule: data.fieldTestSchedule,
    warnings: data.warnings
  };
}
```

#### Acceptance Criteria
- [ ] Report includes every element referenced in the implementation pipeline (thresholds, zones, methodology, season plan, field-test schedule, race protocols, warnings)
- [ ] Supports export as JSON/PDF for Phase 10/11 UI consumption
- [ ] Allows coach annotations and athlete-facing notes
- [ ] Integration tests ensure regeneration updates the report consistently
- [ ] Surfaces outstanding validation warnings prominently

---

## Acceptance Criteria

- [ ] Program generation creates complete week-by-week plans
- [ ] Periodization engine calculates phase durations correctly
- [ ] Progressive overload follows 3-up, 1-down model
- [ ] Deload weeks scheduled every 3-4 weeks
- [ ] Target time estimation works with all 4 methods
- [ ] ACWR calculated using EWMA method
- [ ] Validation system catches unsafe programs
- [ ] Field-test scheduler produces actionable benchmark calendar tied to validation rules
- [ ] Program report compiler aggregates thresholds, methodology, race plan, field tests, and warnings for downstream consumers

### Next Steps for Implementation
- [ ] Implement `lib/training-engine/program-generator/field-test-schedule.ts` with scheduling logic tied to validation warnings and methodology requirements
- [ ] Implement `lib/training-engine/program-generator/report.ts` to assemble the compiled report consumed by UI/API layers
- [ ] Update program generation pipeline to call `scheduleFieldTests` and `compileProgramReport`, returning both structures in API responses
- [ ] Extend unit/integration tests to cover the scheduler and report compiler modules

---

## Future Enhancements

### Distance Calculation from Pace + Duration

**Priority:** Medium | **Effort:** 2-3 hours | **Impact:** Improved weekly volume tracking

**Problem:**
Currently, workouts without explicit `distance` field (e.g., zone-based runs with only duration and pace targets) don't contribute to weekly km totals. This underestimates actual training volume for advanced runners who track weekly mileage as a key load indicator.

**Example:**
- Workout: "Lugnt löppass" - 40 min @ 7:11 min/km pace (no distance field set)
- Current behavior: Weekly total shows 0 km from this workout
- Expected: ~5.57 km should be calculated and included in totals

**Solution:**
Add auto-calculation logic to workout generation that computes distance when:
1. Workout has `duration` (minutes) and `pace` (min/km) but no `distance`
2. Formula: `distance (km) = duration (min) / pace (min/km)`

**Implementation:**

```typescript
// lib/training-engine/program-generator/workout-templates.ts

/**
 * Calculate distance from pace and duration if not explicitly set
 */
function calculateImplicitDistance(workout: Workout): number {
  // If distance already set, use it
  if (workout.totalDistance && workout.totalDistance > 0) {
    return workout.totalDistance;
  }

  // If no pace target, can't calculate
  if (!workout.targetPace && !workout.targetPaceRange) {
    return 0;
  }

  // Calculate from target pace
  const avgPace = workout.targetPaceRange
    ? (workout.targetPaceRange.min + workout.targetPaceRange.max) / 2
    : workout.targetPace!;

  const durationMinutes = workout.totalDuration;
  const distanceKm = durationMinutes / avgPace;

  return Math.round(distanceKm * 100) / 100; // Round to 2 decimals
}

/**
 * Apply implicit distance calculation to all workouts in a week
 */
export function finalizeWeeklyWorkouts(week: TrainingWeek): TrainingWeek {
  week.days.forEach(day => {
    if (day.workout) {
      const calculatedDistance = calculateImplicitDistance(day.workout);
      if (calculatedDistance > 0 && day.workout.totalDistance === 0) {
        day.workout.totalDistance = calculatedDistance;
      }
    }
  });

  // Recalculate weekly volume with implicit distances
  week.plannedVolume = week.days.reduce((sum, day) =>
    sum + (day.workout?.totalDistance || 0), 0
  );

  return week;
}
```

**Acceptance Criteria:**
- [ ] Workouts with duration + pace but no distance automatically calculate distance
- [ ] Calculation formula: `distance = duration / pace`
- [ ] Applied during program generation, not retroactively
- [ ] Weekly totals include both explicit and calculated distances
- [ ] UI displays distinction between explicit vs calculated (optional enhancement)

**Related Future Enhancements:**
- Post-workout logging with actual distance/pace (see Phase 11)
- Toggle to show "planned volume" vs "estimated volume" in athlete dashboard
- Comparison of planned vs actual weekly volume in analytics

---

## Related Phases

**Depends on:**
- [Phase 2: Calculations](./PHASE_02_CALCULATIONS.md) - Uses LT1/LT2, zone calculations
- [Phase 6: Methodologies](./PHASE_06_METHODOLOGIES.md) - Implements methodology-specific programs

**Required by:**
- [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md) - Modifies generated workouts
- [Phase 10: UI Coach Portal](./PHASE_10_UI_COACH.md) - Program builder interface
- [Phase 11: UI Athlete Portal](./PHASE_11_UI_ATHLETE.md) - Program viewing

---

**Next Phase:** [Phase 8: Workout Modification](./PHASE_08_WORKOUT_MODIFICATION.md)
