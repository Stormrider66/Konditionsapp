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

import { StrengthPhase, StrengthExercise } from './types';

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
 * Get exercises for specific strength phase
 */
function getExercisesForPhase(phase: StrengthPhase, athleteLevel: string): StrengthExercise[] {
  switch (phase) {
    case 'ANATOMICAL_ADAPTATION':
      return getAnatomicalAdaptationExercises();
    case 'MAXIMUM_STRENGTH':
      return getMaximumStrengthExercises();
    case 'POWER':
      return getPowerPhaseExercises();
    case 'MAINTENANCE':
      return getMaintenanceExercises();
    default:
      return getAnatomicalAdaptationExercises();
  }
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

/**
 * Phase 4: Maintenance (8-12 weeks during competition)
 * Goal: Preserve strength gains with minimal fatigue
 */
function getMaintenanceExercises(): StrengthExercise[] {
  return [
    {
      name: 'Back Squat',
      tier: 'TIER1_BILATERAL',
      primaryMuscles: ['Quadriceps', 'Glutes', 'Core'],
      runningTransfer: 'Maintain force production capacity',
      sets: 2,
      reps: '4-6',
      load: '85-90% 1RM',
      rest: 180,
      frequency: '1x weekly',
      progressionMethod: 'LOAD',
      progressionCriteria: 'Maintain load, no progression needed',
      regressionProtocol: 'Reduce if interfering with running',
      contraindications: ['Knee injury', 'Back injury'],
      formCues: ['Chest up', 'Drive through heels', 'Full depth'],
      commonMistakes: ['Excessive volume', 'Training to failure']
    },
    {
      name: 'Trap Bar Deadlift',
      tier: 'TIER1_BILATERAL',
      primaryMuscles: ['Glutes', 'Hamstrings', 'Quadriceps'],
      runningTransfer: 'Posterior chain maintenance',
      sets: 2,
      reps: '5-6',
      load: '80-85% 1RM',
      rest: 180,
      frequency: '1x weekly',
      progressionMethod: 'LOAD',
      progressionCriteria: 'Maintain strength, no progression',
      regressionProtocol: 'Reduce volume if fatigued',
      contraindications: ['Lower back pain'],
      formCues: ['Neutral spine', 'Drive through heels', 'Full hip extension'],
      commonMistakes: ['Too much volume', 'Excessive frequency']
    }
  ];
}

/**
 * Get training schedule for strength phase
 */
function getScheduleForPhase(phase: StrengthPhase, runningPhase: string): StrengthSchedule {
  const baseSchedules = {
    'ANATOMICAL_ADAPTATION': {
      frequency: 3,
      duration: 45,
      timing: ['After easy runs', 'Separate days from hard running'],
      weeklySetVolume: { legs: 9, core: 9, upper: 6 },
      deloadFrequency: 4
    },
    'MAXIMUM_STRENGTH': {
      frequency: 2,
      duration: 60,
      timing: ['Same day as hard running (6+ hours apart)', 'Separate days'],
      weeklySetVolume: { legs: 14, core: 6, upper: 4 },
      deloadFrequency: 4
    },
    'POWER': {
      frequency: 2,
      duration: 50,
      timing: ['Same day as speed work (morning strength, evening running)'],
      weeklySetVolume: { legs: 12, core: 6, upper: 4 },
      deloadFrequency: 3
    },
    'MAINTENANCE': {
      frequency: 1,
      duration: 40,
      timing: ['Day after hard running workout', 'Never before key workouts'],
      weeklySetVolume: { legs: 6, core: 3, upper: 2 },
      deloadFrequency: 0 // No deloads during maintenance
    }
  };

  return baseSchedules[phase];
}

/**
 * Get progression plan for strength phase
 */
function getProgressionPlan(phase: StrengthPhase, weeksInPhase: number): ProgressionPlan {
  const progressionPlans = {
    'ANATOMICAL_ADAPTATION': {
      method: 'Double progression (reps first, then load)',
      loadIncrease: 'Increase load 5-10% when completing 3×15',
      deloadProtocol: '50% volume reduction every 4th week',
      plateauHandling: 'Focus on form quality, not load progression',
      testingSchedule: 'No 1RM testing during this phase'
    },
    'MAXIMUM_STRENGTH': {
      method: 'Linear progression',
      loadIncrease: '2.5-5% when completing all sets at RPE <8',
      deloadProtocol: '40% volume reduction every 4th week',
      plateauHandling: 'Reduce load 10%, rebuild with better form',
      testingSchedule: '1RM test every 6-8 weeks'
    },
    'POWER': {
      method: 'Undulating periodization (vary load session to session)',
      loadIncrease: 'Increase load when jump height/power maintained',
      deloadProtocol: '50% volume reduction every 3rd week',
      plateauHandling: 'Focus on explosive intent, not load',
      testingSchedule: 'Vertical jump test monthly'
    },
    'MAINTENANCE': {
      method: 'Maintenance (no progression)',
      loadIncrease: 'Maintain load from maximum strength phase',
      deloadProtocol: 'No formal deloads - adjust based on running fatigue',
      plateauHandling: 'Reduce frequency if interfering with running',
      testingSchedule: 'No testing during competition phase'
    }
  };

  return progressionPlans[phase];
}
