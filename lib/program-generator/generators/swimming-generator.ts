// lib/program-generator/generators/swimming-generator.ts
// Swimming program generator using CSS-based zones

import { logger } from '@/lib/logger'
import { Client, CreateTrainingProgramDTO } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { get8WeekCssBuilder, get12WeekDistanceProgram, get8WeekSprintProgram, getOpenWaterPrep, SwimmingTemplateWorkout } from '../templates/swimming'
import { mapSwimmingWorkoutToDTO } from '../workout-mapper'

export interface SwimmingProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date
  css?: string  // Critical Swim Speed (MM:SS per 100m)
  weeklyDistance?: number // meters
  targetEvent?: number // event distance in meters (50, 100, 200, 1500, etc.)
  poolLength?: '25' | '50'
  includeStrength?: boolean
  strengthSessionsPerWeek?: number
}

/**
 * Parse CSS string (MM:SS) to seconds per 100m
 */
function parseCssToSeconds(css: string): number | undefined {
  if (!css) return undefined
  const parts = css.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  return undefined
}

/**
 * Generate a swimming training program
 */
export async function generateSwimmingProgram(
  params: SwimmingProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  logger.debug('Starting swimming program generation', {
    goal: params.goal,
    css: params.css || 'Not provided',
    poolLength: `${params.poolLength || '25'}m`,
    weeklyDistance: `${params.weeklyDistance || 15000}m`,
  })

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  const cssSeconds = params.css ? parseCssToSeconds(params.css) : undefined

  // Select template based on goal
  let templateWeeks
  if (params.goal === 'css-builder') {
    templateWeeks = get8WeekCssBuilder(
      cssSeconds || 90, // Default 1:30/100m
      (params.weeklyDistance || 15000) as 10000 | 15000 | 20000 | 25000
    )
  } else if (params.goal === 'distance') {
    templateWeeks = get12WeekDistanceProgram(
      (params.targetEvent || 1500) as 1500 | 3000 | 5000,
      (params.weeklyDistance || 20000) as 15000 | 20000 | 25000 | 30000
    )
  } else if (params.goal === 'sprint') {
    templateWeeks = get8WeekSprintProgram(
      (params.targetEvent || 100) as 50 | 100 | 200,
      (params.weeklyDistance || 15000) as 10000 | 15000 | 20000
    )
  } else if (params.goal === 'open-water') {
    templateWeeks = getOpenWaterPrep(
      (params.targetEvent ? params.targetEvent / 1000 : 3) as 1.5 | 3 | 5 | 10,
      (params.weeklyDistance || 20000) as 15000 | 20000 | 25000 | 30000
    )
  } else {
    // Custom or unsupported goal - create empty structure
    return createEmptySwimmingProgram(params, client, startDate, endDate)
  }

  // Map template weeks to program structure
  const weeks = templateWeeks.map((week, index) => ({
    weekNumber: week.week,
    startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
    phase: week.phase,
    volume: week.weeklyDistance,
    focus: week.focus,
    days: createDaysFromWorkouts(week.keyWorkouts, params.sessionsPerWeek, cssSeconds),
  }))

  const goalLabels: Record<string, string> = {
    'css-builder': 'CSS-förbättrare',
    'sprint': 'Sprint',
    'distance': 'Distans',
    'open-water': 'Öppet vatten',
    'custom': 'Anpassad',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabels[params.goal] || 'Simprogram'} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `CSS-baserat simprogram${params.css ? ` (CSS: ${params.css}/100m)` : ''}`,
    weeks,
  }
}

/**
 * Create days from key workouts using the workout mapper
 */
function createDaysFromWorkouts(
  keyWorkouts: SwimmingTemplateWorkout[],
  sessionsPerWeek: number,
  cssSeconds?: number
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
        ? [mapSwimmingWorkoutToDTO(workout, cssSeconds)]
        : [],
    })
  }

  return days
}

/**
 * Create empty swimming program structure
 */
function createEmptySwimmingProgram(
  params: SwimmingProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: i < 3 ? 'BASE' as const : i < params.durationWeeks - 2 ? 'BUILD' as const : 'PEAK' as const,
    volume: 0,
    focus: getSwimmingFocus(params.goal, i + 1, params.durationWeeks),
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
    name: `Simprogram - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `CSS-baserat simprogram${params.css ? ` (CSS: ${params.css}/100m)` : ''}`,
    weeks,
  }
}

function getSwimmingFocus(goal: string, weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks
  if (goal === 'sprint') {
    if (progress < 0.3) return 'Teknik och aerob grund'
    if (progress < 0.6) return 'Fartlek och hastighetsarbete'
    return 'Maximal hastighet och tävlingsförberedelse'
  }
  if (goal === 'distance' || goal === 'open-water') {
    if (progress < 0.3) return 'Aerob bas och teknik'
    if (progress < 0.6) return 'Tröskelarbete'
    return 'Distansspecifikt arbete'
  }
  return 'Allmän träning'
}
