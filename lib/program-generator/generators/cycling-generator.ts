// lib/program-generator/generators/cycling-generator.ts
// Cycling program generator using FTP-based templates

import { Client, CreateTrainingProgramDTO } from '@/types'
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
    // Custom or unsupported goal - create empty structure
    return createEmptyCyclingProgram(params, client, startDate, endDate)
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
 * Map power zone to intensity level
 */
function mapPowerZoneToIntensity(zone: number): string {
  const zoneMap: Record<number, string> = {
    1: 'RECOVERY',
    2: 'EASY',
    3: 'MODERATE',
    4: 'THRESHOLD',
    5: 'INTERVAL',
    6: 'VO2MAX',
    7: 'SPRINT',
  }
  return zoneMap[zone] || 'MODERATE'
}

/**
 * Create empty cycling program structure
 */
function createEmptyCyclingProgram(
  params: CyclingProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: i < 3 ? 'BASE' as const : i < params.durationWeeks - 2 ? 'BUILD' as const : 'PEAK' as const,
    volume: 0,
    focus: 'General',
    days: Array.from({ length: 7 }).map((_, j) => ({
      dayNumber: j + 1,
      notes: '',
      workouts: [],
    })),
  }))

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `Cykelprogram - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || 'Anpassat cykelprogram',
    weeks,
  }
}
