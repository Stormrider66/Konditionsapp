// lib/program-generator/generators/triathlon-generator.ts
// Triathlon program generator (Swim/Bike/Run)

import { Client, Test, CreateTrainingProgramDTO } from '@/types'
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
  console.log('[Triathlon Generator] Starting program generation')
  console.log(`  Goal: ${params.goal}`)
  console.log(`  FTP: ${params.ftp || 'Not provided'}`)
  console.log(`  CSS: ${params.css || 'Not provided'}`)
  console.log(`  VDOT: ${params.vdot || 'Not provided'}`)
  console.log(`  Weekly Hours: ${params.weeklyHours || 8}`)

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
    // Custom or unsupported goal - create empty structure
    return createEmptyTriathlonProgram(params, client, test, startDate, endDate)
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

/**
 * Create empty triathlon program structure
 */
function createEmptyTriathlonProgram(
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

  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: getTriathlonPhase(i + 1, params.durationWeeks),
    volume: 0,
    focus: getTriathlonFocus(params.goal, i + 1, params.durationWeeks),
    days: Array.from({ length: 7 }).map((_, j) => ({
      dayNumber: j + 1,
      notes: '',
      workouts: [],
    })),
  }))

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: test?.id || undefined,
    name: `Triathlon - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Triathlonprogram för ${goalDistances[params.goal] || 'anpassad distans'}`,
    weeks,
  }
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
