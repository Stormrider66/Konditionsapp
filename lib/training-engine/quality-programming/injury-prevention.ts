/**
 * Injury Prevention Exercise Library
 *
 * Evidence-based exercises targeting the most common running injury sites:
 * - Copenhagen planks: 41% groin injury reduction
 * - Nordic hamstring curls: 51% hamstring injury reduction
 * - Single-leg calf raises: Achilles injury prevention
 * - Hip strengthening: IT band and patellofemoral pain prevention
 */

import { StrengthExercise, QualitySession } from './types';

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
