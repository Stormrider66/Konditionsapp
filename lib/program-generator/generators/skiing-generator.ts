// lib/program-generator/generators/skiing-generator.ts
// Skiing program generator using pace-based templates

import { Client, Test, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { get8WeekThresholdBuilder, get12WeekPrepBuilder, get16WeekVasaloppetPrep, SkiingTemplateWorkout } from '../templates/skiing'
import { mapSkiingWorkoutToDTO } from '../workout-mapper'
import { logger } from '@/lib/logger'

export interface SkiingProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date
  technique?: 'classic' | 'skating' | 'both'
  weeklyHours?: number
  includeStrength?: boolean
  strengthSessionsPerWeek?: number
}

/**
 * Generate a skiing training program
 */
export async function generateSkiingProgram(
  params: SkiingProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  logger.debug('Starting skiing program generation', {
    goal: params.goal,
    technique: params.technique || 'both',
    weeklyHours: params.weeklyHours || 8,
  })

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  // Select template based on goal
  let templateWeeks
  if (params.goal === 'threshold-builder') {
    templateWeeks = get8WeekThresholdBuilder(
      (params.weeklyHours || 8) as 6 | 8 | 10 | 12
    )
  } else if (params.goal === 'prep-phase') {
    templateWeeks = get12WeekPrepBuilder(
      (params.weeklyHours || 10) as 6 | 8 | 10 | 12 | 15
    )
  } else if (params.goal === 'vasaloppet') {
    templateWeeks = get16WeekVasaloppetPrep(
      (params.weeklyHours || 12) as 8 | 10 | 12 | 15
    )
  } else {
    return createFallbackSkiingProgram(params, client, test, startDate, endDate)
  }

  // Map template weeks to program structure
  const weeks = templateWeeks.map((week, index) => ({
    weekNumber: week.week,
    startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
    phase: week.phase,
    volume: 0, // Skiing doesn't use TSS, use hours instead
    focus: week.focus,
    days: createDaysFromWorkouts(week.keyWorkouts, params.sessionsPerWeek),
  }))

  const goalLabels: Record<string, string> = {
    'threshold-builder': 'Threshold builder',
    'prep-phase': 'Preparation',
    'vasaloppet': 'Vasaloppet',
    'custom': 'Custom',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: test?.id || undefined,
    name: `${goalLabels[params.goal] || 'Skiing program'} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Skiing program for ${params.technique === 'classic' ? 'classic technique' : params.technique === 'skating' ? 'skating' : 'both techniques'}`,
    weeks,
  }
}

/**
 * Create days from key workouts using the workout mapper
 */
function createDaysFromWorkouts(
  keyWorkouts: SkiingTemplateWorkout[],
  sessionsPerWeek: number
) {
  const days = []

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const workoutIndex = dayNum - 1
    const hasWorkout = workoutIndex < Math.min(keyWorkouts.length, sessionsPerWeek)
    const workout = hasWorkout ? keyWorkouts[workoutIndex] : null

    days.push({
      dayNumber: dayNum,
      notes: hasWorkout ? '' : 'Rest day',
      workouts: workout
        ? [mapSkiingWorkoutToDTO(workout)]
        : [],
    })
  }

  return days
}

function createFallbackSkiingProgram(
  params: SkiingProgramParams,
  client: Client,
  test: Test | undefined,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNumber = i + 1
    const days = createFallbackSkiingDays({
      weekNumber,
      totalWeeks: params.durationWeeks,
      sessionsPerWeek: params.sessionsPerWeek,
      goal: params.goal,
      technique: params.technique || 'both',
      weeklyHours: params.weeklyHours || 8,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: getSkiingPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: getSkiingFocus(weekNumber, params.durationWeeks),
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: test?.id || undefined,
    name: `Skiing program - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Skiing program for ${params.technique === 'classic' ? 'classic technique' : params.technique === 'skating' ? 'skating' : 'both techniques'} with technique, threshold work, endurance, and ski-specific strength.`,
    weeks,
  }
}

function createFallbackSkiingDays(input: {
  weekNumber: number
  totalWeeks: number
  sessionsPerWeek: number
  goal: string
  technique: 'classic' | 'skating' | 'both'
  weeklyHours: number
}): CreateTrainingDayDTO[] {
  const sessions = Math.min(7, Math.max(1, input.sessionsPerWeek))
  const loadFactor = getSkiingLoadFactor(input.weekNumber, input.totalWeeks)
  const techniqueLabel = input.technique === 'classic' ? 'classic technique' : input.technique === 'skating' ? 'skating' : 'classic/skating'
  const longDuration = input.goal === 'vasaloppet' ? 150 : input.weeklyHours >= 10 ? 120 : 90

  const planned = [
    {
      day: 2,
      workout: skiingWorkout({
        name: 'Technique and aerobic distance',
        intensity: 'EASY',
        duration: Math.round(65 * loadFactor),
        zone: 2,
        instructions: `Easy skiing focused on ${techniqueLabel}, weight transfer, and relaxed rhythm.`,
      }),
    },
    {
      day: 4,
      workout: skiingWorkout({
        name: input.goal === 'threshold-builder' ? 'Threshold intervals' : 'Double poling / hill strength',
        intensity: input.goal === 'threshold-builder' ? 'THRESHOLD' : 'MODERATE',
        duration: Math.round(60 * loadFactor),
        zone: input.goal === 'threshold-builder' ? 4 : 3,
        instructions: input.goal === 'threshold-builder'
          ? 'Controlled reps just below/at threshold with stable technique all the way.'
          : 'Double poling, diagonal stride, or hill reps with technical quality before maximal speed.',
      }),
    },
    {
      day: 6,
      workout: skiingWorkout({
        name: input.goal === 'vasaloppet' ? 'Vasaloppet-specific long session' : 'Long ski/roller-ski session',
        intensity: 'EASY',
        duration: Math.round(longDuration * loadFactor),
        zone: 2,
        instructions: 'Steady aerobic load. Practice hydration/fueling, pole work, and relaxed posture.',
      }),
    },
    {
      day: 1,
      workout: skiingStrengthWorkout(),
    },
    {
      day: 5,
      workout: skiingWorkout({
        name: 'Surges and economy',
        intensity: 'INTERVAL',
        duration: Math.round(50 * loadFactor),
        zone: 5,
        instructions: 'Short surges with full technique. Keep recovery long enough for high movement quality.',
      }),
    },
    {
      day: 3,
      workout: skiingWorkout({
        name: 'Active recovery',
        intensity: 'RECOVERY',
        duration: 35,
        zone: 1,
        instructions: 'Easy circulation, hip/back mobility, and simple balance/coordination work.',
      }),
    },
  ]

  const keep = new Map(planned.slice(0, sessions).map((item) => [item.day, item.workout]))
  return Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: keep.has(index + 1) ? '' : 'Rest day',
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function skiingWorkout(input: {
  name: string
  intensity: WorkoutIntensity
  duration: number
  zone: number
  instructions: string
}): CreateWorkoutDTO {
  return {
    type: input.intensity === 'RECOVERY' ? 'RECOVERY' : 'SKIING',
    name: input.name,
    intensity: input.intensity,
    duration: input.duration,
    instructions: input.instructions,
    segments: [
      { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Easy warm-up and technique drill' },
      { order: 2, type: 'work', duration: Math.max(15, input.duration - 20), zone: input.zone, description: input.instructions },
      { order: 3, type: 'cooldown', duration: 10, zone: 1, description: 'Cool-down and mobility' },
    ],
  }
}

function skiingStrengthWorkout(): CreateWorkoutDTO {
  return {
    type: 'STRENGTH',
    name: 'Ski strength and core',
    intensity: 'MODERATE',
    duration: 45,
    instructions: 'Ski-specific strength: double-poling muscles, trunk rotation, hip stability, and single-leg strength.',
    segments: [
      { order: 1, type: 'warmup', duration: 8, description: 'Dynamic warm-up for shoulders, hips, and core' },
      { order: 2, type: 'exercise', duration: 14, sets: 3, repsCount: '8-10', description: 'Pull-down/double-poling pull or chin-up variation' },
      { order: 3, type: 'exercise', duration: 12, sets: 3, repsCount: '8/ben', description: 'Step-up eller split squat' },
      { order: 4, type: 'exercise', duration: 11, sets: 3, repsCount: '30-45 sec', description: 'Side plank, dead bug, and anti-rotation' },
    ],
  }
}

function getSkiingPhase(weekNumber: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 'TAPER'
  if (progress > 0.72) return 'PEAK'
  if (progress > 0.35) return 'BUILD'
  return 'BASE'
}

function getSkiingLoadFactor(weekNumber: number, totalWeeks: number): number {
  if (weekNumber % 4 === 0 && weekNumber < totalWeeks) return 0.75
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 0.65
  return 0.9 + progress * 0.25
}

function getSkiingFocus(weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks
  if (progress < 0.25) return 'Base endurance'
  if (progress < 0.5) return 'Technique focus'
  if (progress < 0.75) return 'Intensity build'
  return 'Peak form'
}
