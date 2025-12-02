// lib/program-generator/generators/hyrox-generator.ts
// HYROX program generator (Functional Fitness Racing)

import { Client, CreateTrainingProgramDTO, PeriodPhase } from '@/types'
import { HYROX_BEGINNER_12_WEEK, HYROX_INTERMEDIATE_16_WEEK, HYROXTemplateWeek } from '../templates/hyrox'
import { mapHyroxWeekToWorkouts } from '../workout-mapper'

export interface HyroxProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  includeStrength?: boolean
  strengthSessionsPerWeek?: number
}

/**
 * Generate a HYROX training program
 */
export async function generateHyroxProgram(
  params: HyroxProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  console.log('[HYROX Generator] Starting program generation')
  console.log(`  Goal: ${params.goal}`)
  console.log(`  Experience Level: ${params.experienceLevel || 'beginner'}`)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + params.durationWeeks * 7)

  // Select template based on goal and experience level
  let template
  if (params.goal === 'beginner' || params.experienceLevel === 'beginner') {
    template = HYROX_BEGINNER_12_WEEK
  } else if (
    params.goal === 'pro' ||
    params.goal === 'age-group' ||
    params.goal === 'intermediate' ||
    params.experienceLevel === 'intermediate' ||
    params.experienceLevel === 'advanced'
  ) {
    // Pro, age-group, intermediate and advanced all use the 16-week template
    template = HYROX_INTERMEDIATE_16_WEEK
  } else if (params.goal === 'custom') {
    // Custom goal - create empty structure for coach to fill
    return createEmptyHyroxProgram(params, client, startDate, endDate)
  } else {
    // Default to intermediate template for any other goal
    template = HYROX_INTERMEDIATE_16_WEEK
  }

  // Map template weeks to program structure
  const weeks = template.weeks.map((week, index) => {
    const workouts = mapHyroxWeekToWorkouts(week)

    // Create days from template days
    const days = week.days.map((day) => ({
      dayNumber: day.dayNumber,
      notes: day.isRestDay ? 'Vilodag' : '',
      workouts: day.isRestDay ? [] : day.workouts.map(w => ({
        type: mapHyroxWorkoutType(w.type),
        name: w.name,
        description: w.description,
        intensity: mapIntensity(w.intensity),
        duration: w.duration,
        instructions: w.structure,
        segments: [],
      })),
    }))

    return {
      weekNumber: week.weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
      phase: mapPhase(week.phase),
      volume: 0,
      focus: week.focus,
      days,
    }
  })

  const goalLabels: Record<string, string> = {
    'beginner': 'Nybörjare',
    'intermediate': 'Mellanliggande',
    'pro': 'Pro Division',
    'age-group': 'Age Group',
    'doubles': 'Doubles',
    'custom': 'Anpassad',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX ${goalLabels[params.goal] || template.name} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || template.description || 'HYROX-träningsprogram med löpning och funktionella stationer',
    weeks,
  }
}

/**
 * Map HYROX workout type to WorkoutType
 */
function mapHyroxWorkoutType(type: string): 'RUNNING' | 'STRENGTH' | 'HYROX' | 'RECOVERY' {
  const mapping: Record<string, 'RUNNING' | 'STRENGTH' | 'HYROX' | 'RECOVERY'> = {
    running: 'RUNNING',
    strength: 'STRENGTH',
    station_practice: 'HYROX',
    hyrox_simulation: 'HYROX',
    interval: 'RUNNING',
    endurance: 'RUNNING',
    recovery: 'RECOVERY',
    mixed: 'HYROX',
  }
  return mapping[type] || 'HYROX'
}

/**
 * Map intensity string to WorkoutIntensity
 */
function mapIntensity(intensity: string): 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX' {
  const mapping: Record<string, 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'> = {
    easy: 'EASY',
    moderate: 'MODERATE',
    hard: 'THRESHOLD',
    race_pace: 'INTERVAL',
  }
  return mapping[intensity] || 'MODERATE'
}

/**
 * Map phase string to PeriodPhase
 */
function mapPhase(phase: string): PeriodPhase {
  const mapping: Record<string, PeriodPhase> = {
    BASE: 'BASE',
    BUILD: 'BUILD',
    PEAK: 'PEAK',
    TAPER: 'TAPER',
    RACE: 'PEAK',
    RECOVERY: 'RECOVERY',
  }
  return mapping[phase] || 'BASE'
}

/**
 * Create empty HYROX program structure
 */
function createEmptyHyroxProgram(
  params: HyroxProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: getHyroxPhase(i + 1, params.durationWeeks),
    volume: 0,
    focus: getHyroxFocus(params.goal, i + 1, params.durationWeeks),
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
    name: `HYROX - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || 'HYROX-träningsprogram med löpning och funktionella stationer',
    weeks,
  }
}

function getHyroxPhase(weekNum: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNum / totalWeeks
  if (progress < 0.3) return 'BASE'
  if (progress < 0.7) return 'BUILD'
  if (progress < 0.9) return 'PEAK'
  return 'TAPER'
}

function getHyroxFocus(goal: string, weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks

  // HYROX-specific focus areas
  if (progress < 0.25) return 'Grundkondition och teknisk inlärning av stationer'
  if (progress < 0.5) return 'Stationsspecifik träning och löpkapacitet'
  if (progress < 0.75) return 'Race-simuleringar och övergångar'
  if (progress < 0.9) return 'Tävlingstempo och finjustering'
  return 'Taper och vila'
}
