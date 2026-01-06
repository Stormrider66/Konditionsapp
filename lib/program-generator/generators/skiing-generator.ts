// lib/program-generator/generators/skiing-generator.ts
// Skiing program generator using pace-based templates

import { Client, Test, CreateTrainingProgramDTO } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { get8WeekThresholdBuilder, get12WeekPrepBuilder, get16WeekVasaloppetPrep, SkiingTemplateWorkout } from '../templates/skiing'
import { mapSkiingWorkoutToDTO } from '../workout-mapper'

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
  console.log('[Skiing Generator] Starting program generation')
  console.log(`  Goal: ${params.goal}`)
  console.log(`  Technique: ${params.technique || 'both'}`)
  console.log(`  Weekly Hours: ${params.weeklyHours || 8}`)

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
    // Custom or unsupported goal - create empty structure
    return createEmptySkiingProgram(params, client, test, startDate, endDate)
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
    'threshold-builder': 'Tröskelbyggare',
    'prep-phase': 'Förberedelse',
    'vasaloppet': 'Vasaloppet',
    'custom': 'Anpassad',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: test?.id || undefined,
    name: `${goalLabels[params.goal] || 'Skidprogram'} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Skidprogram för ${params.technique === 'classic' ? 'klassisk teknik' : params.technique === 'skating' ? 'skating' : 'båda tekniker'}`,
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
      notes: hasWorkout ? '' : 'Vilodag',
      workouts: workout
        ? [mapSkiingWorkoutToDTO(workout)]
        : [],
    })
  }

  return days
}

/**
 * Create empty skiing program structure
 */
function createEmptySkiingProgram(
  params: SkiingProgramParams,
  client: Client,
  test: Test | undefined,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: i < 4 ? 'BASE' as const : i < params.durationWeeks - 2 ? 'BUILD' as const : 'PEAK' as const,
    volume: 0,
    focus: getSkiingFocus(i + 1, params.durationWeeks),
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
    name: `Skidprogram - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Skidprogram för ${params.technique === 'classic' ? 'klassisk teknik' : params.technique === 'skating' ? 'skating' : 'båda tekniker'}`,
    weeks,
  }
}

function getSkiingFocus(weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks
  if (progress < 0.25) return 'Grunduthållighet'
  if (progress < 0.5) return 'Teknikfokus'
  if (progress < 0.75) return 'Intensitetsbyggnad'
  return 'Toppform'
}
