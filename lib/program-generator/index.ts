// lib/program-generator/index.ts
// Main program generation orchestrator

import {
  Test,
  Client,
  TrainingZone,
  PeriodPhase,
  CreateTrainingProgramDTO,
  CreateTrainingWeekDTO,
  CreateTrainingDayDTO,
  CreateWorkoutDTO,
} from '@/types'
import {
  calculatePhases,
  calculateWeeklyVolumeProgression,
  applyRecoveryWeeks,
  calculateTrainingDaysPerWeek,
  getPhaseFocus,
  getLongRunDay,
  getLongRunPercentage,
} from './periodization'
import {
  calculateZonePaces,
  calculateZonePowers,
  ZonePaces,
  ZonePowers,
  getGoalPace,
} from './zone-calculator'
import {
  buildLongRun,
  buildTempoRun,
  buildIntervals,
  buildEasyRun,
  buildStrengthWorkout,
  buildCoreWorkout,
  buildPlyometricWorkout,
  buildRecoveryWorkout,
} from './workout-builder'

export interface ProgramGenerationParams {
  testId: string
  clientId: string
  coachId: string
  goalType: 'marathon' | 'half-marathon' | '10k' | '5k' | 'fitness' | 'cycling' | 'skiing' | 'custom'
  targetRaceDate?: Date
  durationWeeks: number
  trainingDaysPerWeek: number
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  currentWeeklyVolume?: number // km or hours
  notes?: string
}

/**
 * Main program generation function
 * Creates a complete training program from test results
 */
export async function generateBaseProgram(
  test: Test,
  client: Client,
  params: ProgramGenerationParams
): Promise<CreateTrainingProgramDTO> {
  // Validate inputs
  if (!test.trainingZones || test.trainingZones.length === 0) {
    throw new Error('Test must have training zones calculated')
  }

  // Calculate periodization
  const phases = calculatePhases(params.durationWeeks)

  // Determine volume based on experience and goal
  const { baseVolume, peakVolume } = calculateVolumeTargets(
    params.experienceLevel,
    params.goalType,
    params.currentWeeklyVolume
  )

  const volumeProgression = calculateWeeklyVolumeProgression(
    params.durationWeeks,
    baseVolume,
    peakVolume
  )

  // Get training paces/powers from test zones
  const zones = test.testType === 'CYCLING'
    ? calculateZonePowers(test.trainingZones)
    : calculateZonePaces(test.trainingZones)

  // Generate program name
  const programName = generateProgramName(params.goalType, params.durationWeeks)

  // Generate all weeks
  const weeks: CreateTrainingWeekDTO[] = []

  for (let weekNum = 0; weekNum < params.durationWeeks; weekNum++) {
    const weekData = volumeProgression[weekNum]

    // Apply recovery weeks (every 4th week)
    const adjustedVolume = applyRecoveryWeeks(
      weekData.week,
      weekData.volumePercentage
    )

    // Calculate training days for this phase
    const trainingDays = calculateTrainingDaysPerWeek(
      params.experienceLevel,
      weekData.phase,
      params.trainingDaysPerWeek
    )

    // Build the week
    const week = buildWeek(
      weekNum + 1,
      weekData.phase,
      adjustedVolume,
      trainingDays,
      zones as any,
      test.trainingZones,
      params.experienceLevel,
      params.goalType,
      weekData.focus
    )

    weeks.push(week)
  }

  // Calculate program dates
  const startDate = new Date()
  const endDate = params.targetRaceDate || new Date(
    startDate.getTime() + params.durationWeeks * 7 * 24 * 60 * 60 * 1000
  )

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: programName,
    goalType: params.goalType,
    startDate,
    endDate,
    notes: params.notes,
    weeks,
  }
}

/**
 * Build a single training week
 */
function buildWeek(
  weekNumber: number,
  phase: PeriodPhase,
  volumePercentage: number,
  trainingDays: number,
  zones: ZonePaces | ZonePowers,
  trainingZones: TrainingZone[],
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  focus: string
): CreateTrainingWeekDTO {
  const days: CreateTrainingDayDTO[] = []

  // Determine workout distribution based on phase and volume
  const workoutPlan = determineWorkoutDistribution(
    phase,
    trainingDays,
    experienceLevel,
    goalType,
    volumePercentage
  )

  // Build each training day
  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const dayWorkouts = workoutPlan.filter(w => w.dayOfWeek === dayNum)

    if (dayWorkouts.length > 0) {
      days.push({
        dayOfWeek: dayNum,
        workouts: dayWorkouts.map(w =>
          createWorkout(w.type, w.params, zones, trainingZones, phase)
        ),
        notes: dayNum === 7 ? 'Viktig nyckelpass denna vecka' : undefined,
      })
    } else {
      // Rest day
      days.push({
        dayOfWeek: dayNum,
        workouts: [],
        notes: 'Vilodag',
      })
    }
  }

  return {
    weekNumber,
    startDate: new Date(), // Will be set properly by API
    phase,
    volume: volumePercentage,
    focus,
    days,
  }
}

/**
 * Determine workout distribution for a week
 */
interface WorkoutSlot {
  dayOfWeek: number
  type: string
  params: any
}

function determineWorkoutDistribution(
  phase: PeriodPhase,
  trainingDays: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  volumePercentage: number
): WorkoutSlot[] {
  const workouts: WorkoutSlot[] = []

  // Recovery weeks get easier workouts
  const isRecoveryWeek = volumePercentage < 80

  switch (phase) {
    case 'BASE':
      // Base phase: mostly easy runs, one long run, some strength
      if (trainingDays >= 3) {
        workouts.push({ dayOfWeek: 2, type: 'easy', params: { duration: 45 } })
        workouts.push({ dayOfWeek: 4, type: 'easy', params: { duration: 40 } })
        workouts.push({ dayOfWeek: 7, type: 'long', params: { distance: 15 } })
      }
      if (trainingDays >= 4) {
        workouts.push({ dayOfWeek: 5, type: 'strength', params: { focus: 'full' } })
      }
      if (trainingDays >= 5) {
        workouts.push({ dayOfWeek: 1, type: 'easy', params: { duration: 30 } })
      }
      if (trainingDays >= 6) {
        workouts.push({ dayOfWeek: 3, type: 'core', params: {} })
      }
      break

    case 'BUILD':
      // Build phase: add tempo runs and intervals
      if (trainingDays >= 3) {
        workouts.push({ dayOfWeek: 2, type: 'easy', params: { duration: 40 } })
        workouts.push({
          dayOfWeek: 4,
          type: isRecoveryWeek ? 'easy' : 'tempo',
          params: { duration: 25 }
        })
        workouts.push({ dayOfWeek: 7, type: 'long', params: { distance: 18 } })
      }
      if (trainingDays >= 4) {
        workouts.push({ dayOfWeek: 5, type: 'strength', params: { focus: 'lower' } })
      }
      if (trainingDays >= 5) {
        workouts.push({
          dayOfWeek: 1,
          type: isRecoveryWeek ? 'easy' : 'intervals',
          params: { reps: 5, work: 4, rest: 2, zone: 4 }
        })
      }
      if (trainingDays >= 6) {
        workouts.push({ dayOfWeek: 3, type: 'core', params: {} })
      }
      break

    case 'PEAK':
      // Peak phase: race-specific intensity
      if (trainingDays >= 3) {
        workouts.push({ dayOfWeek: 2, type: 'easy', params: { duration: 45 } })
        workouts.push({
          dayOfWeek: 4,
          type: 'intervals',
          params: { reps: 6, work: 5, rest: 2, zone: 5 }
        })
        workouts.push({ dayOfWeek: 7, type: 'long', params: { distance: 20 } })
      }
      if (trainingDays >= 4) {
        workouts.push({
          dayOfWeek: 1,
          type: 'tempo',
          params: { duration: 30 }
        })
      }
      if (trainingDays >= 5) {
        workouts.push({ dayOfWeek: 5, type: 'strength', params: { focus: 'lower' } })
      }
      if (trainingDays >= 6) {
        workouts.push({ dayOfWeek: 3, type: 'plyometric', params: {} })
      }
      break

    case 'TAPER':
      // Taper phase: reduce volume, maintain intensity
      if (trainingDays >= 2) {
        workouts.push({ dayOfWeek: 2, type: 'easy', params: { duration: 30 } })
        workouts.push({
          dayOfWeek: 4,
          type: 'intervals',
          params: { reps: 4, work: 3, rest: 3, zone: 5 }
        })
      }
      if (trainingDays >= 3) {
        workouts.push({ dayOfWeek: 6, type: 'easy', params: { duration: 40 } })
      }
      if (trainingDays >= 4) {
        workouts.push({ dayOfWeek: 1, type: 'recovery', params: {} })
      }
      break

    case 'RECOVERY':
      // Recovery phase: all easy
      if (trainingDays >= 2) {
        workouts.push({ dayOfWeek: 2, type: 'recovery', params: {} })
        workouts.push({ dayOfWeek: 5, type: 'easy', params: { duration: 30 } })
      }
      if (trainingDays >= 3) {
        workouts.push({ dayOfWeek: 3, type: 'core', params: {} })
      }
      break

    case 'TRANSITION':
      // Off-season: variety and fun
      if (trainingDays >= 3) {
        workouts.push({ dayOfWeek: 2, type: 'easy', params: { duration: 40 } })
        workouts.push({ dayOfWeek: 4, type: 'strength', params: { focus: 'full' } })
        workouts.push({ dayOfWeek: 7, type: 'easy', params: { duration: 50 } })
      }
      break
  }

  return workouts
}

/**
 * Create a workout from type and parameters
 */
function createWorkout(
  type: string,
  params: any,
  zones: ZonePaces | ZonePowers,
  trainingZones: TrainingZone[],
  phase: PeriodPhase
): CreateWorkoutDTO {
  switch (type) {
    case 'long':
      return buildLongRun(params.distance, zones as ZonePaces, trainingZones)

    case 'tempo':
      return buildTempoRun(params.duration, zones as ZonePaces, trainingZones)

    case 'intervals':
      return buildIntervals(
        params.reps,
        params.work,
        params.rest,
        params.zone,
        zones as ZonePaces,
        trainingZones
      )

    case 'easy':
      return buildEasyRun(params.duration, zones as ZonePaces, trainingZones)

    case 'strength':
      // In production, fetch actual exercise IDs from database
      const strengthExercises = getDefaultExercises('strength', params.focus)
      return buildStrengthWorkout(phase, params.focus, strengthExercises)

    case 'core':
      const coreExercises = getDefaultExercises('core')
      return buildCoreWorkout(coreExercises)

    case 'plyometric':
      const plyoExercises = getDefaultExercises('plyometric')
      return buildPlyometricWorkout(plyoExercises)

    case 'recovery':
      return buildRecoveryWorkout()

    default:
      return buildEasyRun(30, zones as ZonePaces, trainingZones)
  }
}

/**
 * Get default exercise IDs
 * In production, these should be fetched from the database
 */
function getDefaultExercises(category: string, focus?: string): string[] {
  // Placeholder - in real implementation, query Exercise table
  // For now, return empty array (exercises will need to be added manually)
  return []
}

/**
 * Calculate volume targets based on experience and goal
 */
function calculateVolumeTargets(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  currentVolume?: number
): { baseVolume: number; peakVolume: number } {
  // Base volumes (km per week for running)
  const baseVolumes = {
    beginner: { base: 20, peak: 40 },
    intermediate: { base: 35, peak: 65 },
    advanced: { base: 50, peak: 90 },
  }

  // Adjust for goal type
  const multipliers = {
    'marathon': 1.2,
    'half-marathon': 1.0,
    '10k': 0.8,
    '5k': 0.7,
    'fitness': 0.6,
    'cycling': 1.5, // Hours instead of km
    'skiing': 1.0,
    'custom': 1.0,
  }

  const base = baseVolumes[experienceLevel]
  const multiplier = multipliers[goalType as keyof typeof multipliers] || 1.0

  // Use current volume if provided, otherwise use default
  const actualBase = currentVolume
    ? Math.min(currentVolume, base.base * multiplier)
    : base.base * multiplier

  return {
    baseVolume: actualBase,
    peakVolume: base.peak * multiplier,
  }
}

/**
 * Generate program name
 */
function generateProgramName(goalType: string, weeks: number): string {
  const goalNames: Record<string, string> = {
    'marathon': 'Maratonprogram',
    'half-marathon': 'Halvmaratonprogram',
    '10k': '10K-program',
    '5k': '5K-program',
    'fitness': 'Konditionsprogram',
    'cycling': 'Cykelprogram',
    'skiing': 'Skidprogram',
    'custom': 'Träningsprogram',
  }

  const name = goalNames[goalType] || 'Träningsprogram'
  return `${name} (${weeks} veckor)`
}

/**
 * Validate program parameters
 */
export function validateProgramParams(params: ProgramGenerationParams): string[] {
  const errors: string[] = []

  if (params.durationWeeks < 4) {
    errors.push('Program måste vara minst 4 veckor')
  }

  if (params.durationWeeks > 52) {
    errors.push('Program kan inte vara längre än 52 veckor')
  }

  if (params.trainingDaysPerWeek < 2) {
    errors.push('Minst 2 träningsdagar per vecka krävs')
  }

  if (params.trainingDaysPerWeek > 7) {
    errors.push('Max 7 träningsdagar per vecka')
  }

  if (params.targetRaceDate && params.targetRaceDate < new Date()) {
    errors.push('Tävlingsdatum kan inte vara i det förflutna')
  }

  return errors
}
