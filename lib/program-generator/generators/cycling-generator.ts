// lib/program-generator/generators/cycling-generator.ts
// Cycling program generator using FTP-based templates

import { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { get8WeekFtpBuilder, get12WeekBaseBuilder, getGranFondoPrep, CyclingTemplateWorkout } from '../templates/cycling'
import { mapCyclingWorkoutToDTO } from '../workout-mapper'
import { logger } from '@/lib/logger'

export interface CyclingProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date
  ftp?: number
  weeklyHours?: number
  bikeType?: 'road' | 'mtb' | 'gravel' | 'indoor'
  includeStrength?: boolean
  strengthSessionsPerWeek?: number
}

/**
 * Generate a cycling training program
 */
export async function generateCyclingProgram(
  params: CyclingProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  logger.debug('Starting cycling program generation', {
    goal: params.goal,
    ftp: params.ftp || 'Not provided',
    weeklyHours: params.weeklyHours || 8,
  })

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  // Select template based on goal
  let templateWeeks
  if (params.goal === 'ftp-builder' && params.ftp) {
    templateWeeks = get8WeekFtpBuilder(
      params.ftp,
      (params.weeklyHours || 8) as 6 | 8 | 10 | 12
    )
  } else if (params.goal === 'base-builder') {
    templateWeeks = get12WeekBaseBuilder(
      (params.weeklyHours || 10) as 6 | 8 | 10 | 12 | 15
    )
  } else if (params.goal === 'gran-fondo') {
    templateWeeks = getGranFondoPrep(
      150 as 100 | 150 | 200, // Default to 150km distance
      (params.weeklyHours || 10) as 8 | 10 | 12 | 15
    )
  } else {
    return createFallbackCyclingProgram(params, client, startDate, endDate)
  }

  // Map template weeks to program structure
  const weeks = templateWeeks.map((week, index) => ({
    weekNumber: week.week,
    startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
    phase: week.phase,
    volume: week.weeklyTss,
    focus: week.focus,
    days: createDaysFromWorkouts(week.keyWorkouts, params.sessionsPerWeek, params.ftp),
  }))

  const goalLabels: Record<string, string> = {
    'ftp-builder': 'FTP Builder',
    'base-builder': 'Basbyggare',
    'gran-fondo': 'Gran Fondo',
    'custom': 'Anpassad',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabels[params.goal] || 'Cykelprogram'} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `FTP-baserat cykelprogram (${params.ftp ? params.ftp + 'W' : 'anpassat'})`,
    weeks,
  }
}

/**
 * Create days from key workouts using the workout mapper
 */
function createDaysFromWorkouts(
  keyWorkouts: CyclingTemplateWorkout[],
  sessionsPerWeek: number,
  ftp?: number
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
        ? [mapCyclingWorkoutToDTO(workout, ftp)]
        : [],
    })
  }

  return days
}

/**
 * Create useful fallback cycling structure for custom/unsupported goals.
 */
function createFallbackCyclingProgram(
  params: CyclingProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNumber = i + 1
    const days = createFallbackCyclingDays({
      weekNumber,
      totalWeeks: params.durationWeeks,
      sessionsPerWeek: params.sessionsPerWeek,
      goal: params.goal,
      ftp: params.ftp,
      weeklyHours: params.weeklyHours || 8,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: getCyclingPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: getCyclingFocus(params.goal, weekNumber, params.durationWeeks),
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `Cykelprogram - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || 'Anpassat cykelprogram med progressiv distans, tröskelarbete, återhämtning och cykelspecifik kadens/teknik.',
    weeks,
  }
}

function createFallbackCyclingDays(input: {
  weekNumber: number
  totalWeeks: number
  sessionsPerWeek: number
  goal: string
  ftp?: number
  weeklyHours: number
}): CreateTrainingDayDTO[] {
  const sessions = Math.min(7, Math.max(1, input.sessionsPerWeek))
  const loadFactor = getCyclingLoadFactor(input.weekNumber, input.totalWeeks)
  const longRideBase = input.goal === 'gran-fondo' ? 150 : input.weeklyHours >= 10 ? 120 : 90
  const qualityName = input.goal === 'ftp-builder' ? 'FTP-tröskelintervaller' : 'Sweet spot / tempo'
  const qualityZone = input.goal === 'ftp-builder' ? 4 : 3

  const planned = [
    {
      day: 2,
      workout: cyclingWorkout({
        name: qualityName,
        intensity: qualityZone === 4 ? 'THRESHOLD' : 'MODERATE',
        duration: Math.round((qualityZone === 4 ? 60 : 70) * loadFactor),
        zone: qualityZone,
        ftp: input.ftp,
        instructions: qualityZone === 4
          ? 'Arbeta kontrollerat nära tröskel. Avsluta med känslan att ett intervall till hade varit möjligt.'
          : 'Stabil sweet spot/tempo-belastning med jämn kadens och låg teknisk kostnad.',
      }),
    },
    {
      day: 6,
      workout: cyclingWorkout({
        name: input.goal === 'gran-fondo' ? 'Långtur med jämn belastning' : 'Aerob långtur',
        intensity: 'EASY',
        duration: Math.round(longRideBase * loadFactor),
        zone: 2,
        ftp: input.ftp,
        instructions: 'Håll zon 2, öva energiintag och håll trycket jämnt över hela passet.',
      }),
    },
    {
      day: 4,
      workout: cyclingWorkout({
        name: 'Uthållighet och kadens',
        intensity: 'EASY',
        duration: Math.round(60 * loadFactor),
        zone: 2,
        ftp: input.ftp,
        instructions: 'Aerob distans med 5 x 3 minuter högre kadens utan att driva upp intensiteten.',
      }),
    },
    {
      day: 1,
      workout: cyclingWorkout({
        name: 'Återhämtningsspin',
        intensity: 'RECOVERY',
        duration: 35,
        zone: 1,
        ftp: input.ftp,
        instructions: 'Mycket lätt rull med fokus på cirkulation, rörlighet och lågt muskulärt tryck.',
      }),
    },
    {
      day: 5,
      workout: cyclingWorkout({
        name: 'VO2 / backintervaller',
        intensity: 'INTERVAL',
        duration: Math.round(55 * loadFactor),
        zone: 5,
        ftp: input.ftp,
        instructions: 'Korta hårda drag med god teknik. Hög kvalitet, full kontroll på sista repetitionen.',
      }),
    },
    {
      day: 3,
      workout: cyclingWorkout({
        name: 'Teknik och enbensdrill',
        intensity: 'EASY',
        duration: 45,
        zone: 2,
        ftp: input.ftp,
        instructions: 'Lätt distans med teknikblock: rundtramp, position, kurvtagning eller trainer-kadens.',
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

function cyclingWorkout(input: {
  name: string
  intensity: WorkoutIntensity
  duration: number
  zone: number
  ftp?: number
  instructions: string
}): CreateWorkoutDTO {
  const mainDuration = Math.max(15, input.duration - 20)
  return {
    type: input.intensity === 'RECOVERY' ? 'RECOVERY' : 'CYCLING',
    name: input.name,
    intensity: input.intensity,
    duration: input.duration,
    instructions: input.instructions,
    segments: [
      { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Lätt uppvärmning med progressiv kadens' },
      {
        order: 2,
        type: 'work',
        duration: mainDuration,
        zone: input.zone,
        power: input.ftp ? Math.round(input.ftp * getPowerZonePercentage(input.zone)) : undefined,
        description: input.instructions,
      },
      { order: 3, type: 'cooldown', duration: 10, zone: 1, description: 'Lätt nedvarvning' },
    ],
  }
}

function getPowerZonePercentage(zone: number): number {
  const percentages: Record<number, number> = {
    1: 0.50,
    2: 0.65,
    3: 0.82,
    4: 0.95,
    5: 1.10,
    6: 1.30,
    7: 1.50,
  }
  return percentages[zone] || 0.75
}

function getCyclingPhase(weekNumber: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 'TAPER'
  if (progress > 0.7) return 'PEAK'
  if (progress > 0.35) return 'BUILD'
  return 'BASE'
}

function getCyclingFocus(goal: string, weekNumber: number, totalWeeks: number): string {
  const phase = getCyclingPhase(weekNumber, totalWeeks)
  if (goal === 'gran-fondo') return phase === 'BASE' ? 'Aerob bas och teknik' : phase === 'BUILD' ? 'Långtur och tempo' : 'Distansspecifik uthållighet'
  if (goal === 'ftp-builder') return phase === 'BASE' ? 'Sweet spot-bas' : phase === 'BUILD' ? 'Tröskelprogression' : 'FTP-kvalitet'
  return phase === 'BASE' ? 'Aerob grund' : phase === 'BUILD' ? 'Blandad kvalitet' : phase === 'TAPER' ? 'Fräschhet' : 'Specifik cykelkapacitet'
}

function getCyclingLoadFactor(weekNumber: number, totalWeeks: number): number {
  if (weekNumber % 4 === 0 && weekNumber < totalWeeks) return 0.75
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 0.65
  if (progress > 0.7) return 1.05
  return 0.9 + progress * 0.25
}
