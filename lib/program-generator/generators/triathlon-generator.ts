// lib/program-generator/generators/triathlon-generator.ts
// Triathlon program generator (Swim/Bike/Run)

import { logger } from '@/lib/logger'
import { Client, Test, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity, WorkoutType } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { getSprintTriathlonPlan, getOlympicTriathlonPlan, getHalfIronmanPlan, TriathlonTemplateWorkout } from '../templates/triathlon'
import { mapTriathlonWorkoutToDTO } from '../workout-mapper'

export interface TriathlonProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date
  weeklyHours?: number
  ftp?: number
  css?: string
  vdot?: number
  includeStrength?: boolean
  strengthSessionsPerWeek?: number
}

/**
 * Generate a triathlon training program
 */
export async function generateTriathlonProgram(
  params: TriathlonProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  logger.debug('Starting triathlon program generation', {
    goal: params.goal,
    ftp: params.ftp || 'Not provided',
    css: params.css || 'Not provided',
    vdot: params.vdot || 'Not provided',
    weeklyHours: params.weeklyHours || 8,
  })

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  // Select template based on goal
  let templateWeeks
  if (params.goal === 'sprint') {
    templateWeeks = getSprintTriathlonPlan(
      (params.weeklyHours || 8) as 6 | 8 | 10 | 12
    )
  } else if (params.goal === 'olympic') {
    templateWeeks = getOlympicTriathlonPlan(
      (params.weeklyHours || 10) as 8 | 10 | 12 | 15
    )
  } else if (params.goal === 'half-ironman') {
    templateWeeks = getHalfIronmanPlan(
      (params.weeklyHours || 12) as 10 | 12 | 15 | 18
    )
  } else {
    return createFallbackTriathlonProgram(params, client, test, startDate, endDate)
  }

  // Map template weeks to program structure
  const weeks = templateWeeks.map((week, index) => ({
    weekNumber: week.week,
    startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
    phase: week.phase,
    volume: 0,
    focus: week.focus,
    days: createDaysFromWorkouts(week.keyWorkouts, params.sessionsPerWeek),
  }))

  const goalLabels: Record<string, string> = {
    'sprint': 'Sprint Triathlon',
    'olympic': 'Olympic Triathlon',
    'half-ironman': '70.3',
    'ironman': 'Ironman',
    'custom': 'Anpassad',
  }

  const goalDistances: Record<string, string> = {
    'sprint': '750m / 20km / 5km',
    'olympic': '1.5km / 40km / 10km',
    'half-ironman': '1.9km / 90km / 21km',
    'ironman': '3.8km / 180km / 42km',
    'custom': 'Anpassad distans',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: test?.id || undefined,
    name: `${goalLabels[params.goal] || 'Triathlon'} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Triathlonprogram för ${goalDistances[params.goal] || 'anpassad distans'}`,
    weeks,
  }
}

/**
 * Create days from key workouts using the workout mapper
 */
function createDaysFromWorkouts(
  keyWorkouts: TriathlonTemplateWorkout[],
  sessionsPerWeek: number
) {
  const days = []

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const workoutIndex = dayNum - 1
    const hasWorkout = workoutIndex < Math.min(keyWorkouts.length, sessionsPerWeek)
    const workout = hasWorkout ? keyWorkouts[workoutIndex] : null

    days.push({
      dayNumber: dayNum,
      notes: hasWorkout ? '' : 'Vilodag',
      workouts: workout
        ? [mapTriathlonWorkoutToDTO(workout)]
        : [],
    })
  }

  return days
}

function createFallbackTriathlonProgram(
  params: TriathlonProgramParams,
  client: Client,
  test: Test | undefined,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const goalDistances: Record<string, string> = {
    'sprint': '750m / 20km / 5km',
    'olympic': '1.5km / 40km / 10km',
    'half-ironman': '1.9km / 90km / 21km',
    'ironman': '3.8km / 180km / 42km',
    'custom': 'Anpassad distans',
  }

  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNumber = i + 1
    const days = createFallbackTriathlonDays({
      weekNumber,
      totalWeeks: params.durationWeeks,
      sessionsPerWeek: params.sessionsPerWeek,
      goal: params.goal,
      weeklyHours: params.weeklyHours || 8,
      includeStrength: params.includeStrength !== false,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: getTriathlonPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: getTriathlonFocus(params.goal, weekNumber, params.durationWeeks),
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: test?.id || undefined,
    name: `Triathlon - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Triathlonprogram för ${goalDistances[params.goal] || 'anpassad distans'} med sim/cykel/löp, brick-pass och progressiv tävlingsförberedelse.`,
    weeks,
  }
}

function createFallbackTriathlonDays(input: {
  weekNumber: number
  totalWeeks: number
  sessionsPerWeek: number
  goal: string
  weeklyHours: number
  includeStrength: boolean
}): CreateTrainingDayDTO[] {
  const sessions = Math.min(7, Math.max(3, input.sessionsPerWeek))
  const loadFactor = getTriathlonLoadFactor(input.weekNumber, input.totalWeeks)
  const longBikeDuration = input.goal === 'ironman' ? 210 : input.goal === 'half-ironman' ? 160 : input.goal === 'olympic' ? 110 : 80
  const longRunDuration = input.goal === 'ironman' ? 110 : input.goal === 'half-ironman' ? 85 : input.goal === 'olympic' ? 60 : 45

  const planned = [
    {
      day: 1,
      workout: triathlonWorkout({
        type: 'SWIMMING',
        name: 'Simteknik och aerob bas',
        intensity: 'EASY',
        duration: Math.round(45 * loadFactor),
        distance: 1800,
        instructions: 'Teknikdrillar, lugn aerob simning och jämn rytm. Fokus på effektivitet före fart.',
      }),
    },
    {
      day: 2,
      workout: triathlonWorkout({
        type: 'CYCLING',
        name: 'Cykel tröskel / tempo',
        intensity: 'THRESHOLD',
        duration: Math.round(65 * loadFactor),
        instructions: 'Kontrollerade block i tempo/tröskel. Håll aeroposition och jämnt tryck.',
      }),
    },
    {
      day: 4,
      workout: triathlonWorkout({
        type: 'RUNNING',
        name: 'Löpning fartuthållighet',
        intensity: 'MODERATE',
        duration: Math.round(50 * loadFactor),
        distance: Math.round(9000 * loadFactor),
        instructions: 'Progressiv löpning från lätt till kontrollerat målfartsliknande arbete.',
      }),
    },
    {
      day: 6,
      workout: triathlonWorkout({
        type: 'TRIATHLON',
        name: 'Brick: cykel till löp',
        intensity: 'MODERATE',
        duration: Math.round((longBikeDuration * 0.65 + 20) * loadFactor),
        instructions: 'Cykla jämnt i aerob/tempozon och spring direkt 15-25 minuter kontrollerat. Öva övergång och energi.',
        segments: [
          { order: 1, type: 'warmup', duration: 10, description: 'Lätt cykeluppvärmning' },
          { order: 2, type: 'work', duration: Math.round(longBikeDuration * 0.65 * loadFactor), description: 'Cykelblock med jämn belastning' },
          { order: 3, type: 'work', duration: 20, description: 'Direkt övergång till lugn/steady löpning' },
          { order: 4, type: 'cooldown', duration: 8, description: 'Nedvarvning och rörlighet' },
        ],
      }),
    },
    {
      day: 7,
      workout: triathlonWorkout({
        type: 'CYCLING',
        name: 'Lång cykel',
        intensity: 'EASY',
        duration: Math.round(longBikeDuration * loadFactor),
        instructions: 'Aerob distans med tävlingsnära energiintag och jämn intensitet.',
      }),
    },
    {
      day: 5,
      workout: triathlonWorkout({
        type: 'SWIMMING',
        name: 'CSS / fartkontroll',
        intensity: 'THRESHOLD',
        duration: 50,
        distance: 2200,
        instructions: 'Repetitioner runt CSS eller RPE 7/10. Jämna tider med tekniskt avslut.',
      }),
    },
    {
      day: 3,
      workout: input.includeStrength
        ? triathlonStrengthWorkout()
        : triathlonWorkout({
            type: 'RUNNING',
            name: 'Lång löpning',
            intensity: 'EASY',
            duration: Math.round(longRunDuration * loadFactor),
            distance: Math.round(longRunDuration * 150 * loadFactor),
            instructions: 'Lugn aerob löpning. Håll kadens, hållning och låg muskulär stress.',
          }),
    },
  ]

  const keep = new Map(planned.slice(0, sessions).map((item) => [item.day, item.workout]))
  return Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: keep.has(index + 1) ? '' : 'Vilodag',
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function triathlonWorkout(input: {
  type: WorkoutType
  name: string
  intensity: WorkoutIntensity
  duration: number
  distance?: number
  instructions: string
  segments?: CreateWorkoutDTO['segments']
}): CreateWorkoutDTO {
  return {
    type: input.type,
    name: input.name,
    intensity: input.intensity,
    duration: input.duration,
    distance: input.distance,
    instructions: input.instructions,
    segments: input.segments || [
      { order: 1, type: 'warmup', duration: 10, description: 'Lugn uppvärmning och teknikförberedelse' },
      { order: 2, type: 'work', duration: Math.max(15, input.duration - 20), distance: input.distance, description: input.instructions },
      { order: 3, type: 'cooldown', duration: 10, description: 'Nedvarvning' },
    ],
  }
}

function triathlonStrengthWorkout(): CreateWorkoutDTO {
  return {
    type: 'STRENGTH',
    name: 'Triathlonstyrka och bål',
    intensity: 'MODERATE',
    duration: 45,
    instructions: 'Kort styrkepass som stödjer hållning på cykel, löpekonomi och skadeprevention.',
    segments: [
      { order: 1, type: 'warmup', duration: 8, description: 'Rörlighet höft, bröstrygg och axlar' },
      { order: 2, type: 'exercise', duration: 12, sets: 3, repsCount: '6-8', description: 'Split squat eller step-up' },
      { order: 3, type: 'exercise', duration: 12, sets: 3, repsCount: '8-10', description: 'Rodd + höftdominant styrka' },
      { order: 4, type: 'exercise', duration: 13, sets: 3, repsCount: '30-45 sek', description: 'Bålstabilitet och antirotation' },
    ],
  }
}

function getTriathlonLoadFactor(weekNumber: number, totalWeeks: number): number {
  if (weekNumber % 4 === 0 && weekNumber < totalWeeks) return 0.75
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 0.65
  return 0.88 + progress * 0.25
}

function getTriathlonPhase(weekNum: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNum / totalWeeks
  if (progress < 0.3) return 'BASE'
  if (progress < 0.7) return 'BUILD'
  if (progress < 0.9) return 'PEAK'
  return 'TAPER'
}

function getTriathlonFocus(goal: string, weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks
  const isLongDistance = goal === 'half-ironman' || goal === 'ironman'

  if (progress < 0.25) return 'Teknik och aerob grund'
  if (progress < 0.5) return isLongDistance ? 'Volymbyggnad' : 'Intensitetsbyggnad'
  if (progress < 0.75) return 'Disciplinspecifikt arbete'
  if (progress < 0.9) return 'Brick-sessioner och tävlingsförberedelse'
  return 'Taper och vila'
}
