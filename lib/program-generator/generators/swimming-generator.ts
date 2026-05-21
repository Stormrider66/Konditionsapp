// lib/program-generator/generators/swimming-generator.ts
// Swimming program generator using CSS-based zones

import { logger } from '@/lib/logger'
import { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity } from '@/types'
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

function formatCssPace(cssSeconds: number, zone: number): string {
  const zoneMultipliers: Record<number, number> = {
    1: 1.15,
    2: 1.07,
    3: 1,
    4: 0.95,
    5: 0.88,
  }
  const adjustedSeconds = Math.round(cssSeconds * (zoneMultipliers[zone] || 1))
  const minutes = Math.floor(adjustedSeconds / 60)
  const seconds = adjustedSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}/100m`
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
    return createFallbackSwimmingProgram(params, client, startDate, endDate, cssSeconds)
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
    'css-builder': 'CSS builder',
    'sprint': 'Sprint',
    'distance': 'Distance',
    'open-water': 'Open water',
    'custom': 'Custom',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabels[params.goal] || 'Swimming program'} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `CSS-based swimming program${params.css ? ` (CSS: ${params.css}/100m)` : ''}`,
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
      notes: hasWorkout ? '' : 'Rest day',
      workouts: workout
        ? [mapSwimmingWorkoutToDTO(workout, cssSeconds)]
        : [],
    })
  }

  return days
}

function createFallbackSwimmingProgram(
  params: SwimmingProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date,
  cssSeconds?: number
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNumber = i + 1
    const days = createFallbackSwimmingDays({
      weekNumber,
      totalWeeks: params.durationWeeks,
      sessionsPerWeek: params.sessionsPerWeek,
      goal: params.goal,
      cssSeconds,
      targetEvent: params.targetEvent,
      weeklyDistance: params.weeklyDistance || 15000,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: getSwimmingPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.distance || 0), 0), 0),
      focus: getSwimmingFocus(params.goal, weekNumber, params.durationWeeks),
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `Swimming program - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Swimming program with technique, aerobic volume, CSS/threshold work, and goal-specific pace${params.css ? ` (CSS: ${params.css}/100m)` : ''}.`,
    weeks,
  }
}

function createFallbackSwimmingDays(input: {
  weekNumber: number
  totalWeeks: number
  sessionsPerWeek: number
  goal: string
  cssSeconds?: number
  targetEvent?: number
  weeklyDistance: number
}): CreateTrainingDayDTO[] {
  const sessions = Math.min(7, Math.max(1, input.sessionsPerWeek))
  const loadFactor = getSwimmingLoadFactor(input.weekNumber, input.totalWeeks)
  const targetEvent = input.targetEvent || (input.goal === 'sprint' ? 100 : input.goal === 'open-water' ? 3000 : 1500)
  const baseDistance = Math.max(1200, Math.round((input.weeklyDistance / Math.max(3, sessions)) * loadFactor))

  const planned = [
    {
      day: 2,
      workout: swimmingWorkout({
        name: 'Technique and body position',
        intensity: 'EASY',
        duration: 45,
        distance: Math.round(baseDistance * 0.8),
        zone: 2,
        cssSeconds: input.cssSeconds,
        instructions: 'Focus on catch, rotation, breathing, and efficient stroke rate. Let technique guide the pace.',
      }),
    },
    {
      day: 4,
      workout: swimmingWorkout({
        name: input.goal === 'sprint' ? 'Sprint speed and start power' : 'CSS / threshold set',
        intensity: input.goal === 'sprint' ? 'INTERVAL' : 'THRESHOLD',
        duration: input.goal === 'sprint' ? 45 : 55,
        distance: Math.round(baseDistance * (input.goal === 'sprint' ? 0.75 : 1)),
        zone: input.goal === 'sprint' ? 5 : 3,
        cssSeconds: input.cssSeconds,
        instructions: input.goal === 'sprint'
          ? `Short fast repetitions at ${targetEvent}m pace with long rest and clean technique.`
          : 'Threshold-near repetitions around CSS. Even splits, controlled breathing, and a technical finish.',
      }),
    },
    {
      day: 6,
      workout: swimmingWorkout({
        name: input.goal === 'open-water' ? 'Open-water simulation' : 'Aerobic distance swim',
        intensity: 'EASY',
        duration: 60,
        distance: Math.round(baseDistance * (input.goal === 'open-water' ? 1.35 : 1.15)),
        zone: 2,
        cssSeconds: input.cssSeconds,
        instructions: input.goal === 'open-water'
          ? 'Longer continuous blocks, sighting every 6-10 strokes, and steady rhythm in traffic.'
          : 'Steady aerobic swimming with a negative split in the final third.',
      }),
    },
    {
      day: 1,
      workout: swimmingWorkout({
        name: 'Recovery and mobility in the water',
        intensity: 'RECOVERY',
        duration: 35,
        distance: Math.round(baseDistance * 0.55),
        zone: 1,
        cssSeconds: input.cssSeconds,
        instructions: 'Easy swimming, drills, and mobility. Do not chase split times.',
      }),
    },
    {
      day: 5,
      workout: swimmingWorkout({
        name: 'VO2 and speed endurance',
        intensity: 'INTERVAL',
        duration: 50,
        distance: Math.round(baseDistance * 0.9),
        zone: 4,
        cssSeconds: input.cssSeconds,
        instructions: 'Shorter hard repetitions faster than CSS while maintaining alignment and strong push-off technique.',
      }),
    },
    {
      day: 3,
      workout: swimmingWorkout({
        name: 'Pull / strength in the water',
        intensity: 'MODERATE',
        duration: 45,
        distance: Math.round(baseDistance * 0.8),
        zone: 3,
        cssSeconds: input.cssSeconds,
        instructions: 'Paddles, pull buoy, or controlled resistance. Focus on a powerful catch without shoulder stress.',
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

function swimmingWorkout(input: {
  name: string
  intensity: WorkoutIntensity
  duration: number
  distance: number
  zone: number
  cssSeconds?: number
  instructions: string
}): CreateWorkoutDTO {
  return {
    type: input.intensity === 'RECOVERY' ? 'RECOVERY' : 'SWIMMING',
    name: input.name,
    intensity: input.intensity,
    duration: input.duration,
    distance: input.distance,
    instructions: input.cssSeconds ? `${input.instructions} Target pace: ${formatCssPace(input.cssSeconds, input.zone)}.` : input.instructions,
    segments: [
      { order: 1, type: 'warmup', duration: 10, distance: Math.round(input.distance * 0.2), zone: 1, description: 'Easy swim-in and technique drill' },
      { order: 2, type: 'work', duration: Math.max(15, input.duration - 20), distance: Math.round(input.distance * 0.65), zone: input.zone, pace: input.cssSeconds ? formatCssPace(input.cssSeconds, input.zone) : undefined, description: input.instructions },
      { order: 3, type: 'cooldown', duration: 10, distance: Math.round(input.distance * 0.15), zone: 1, description: 'Swim-down' },
    ],
  }
}

function getSwimmingPhase(weekNumber: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 'TAPER'
  if (progress > 0.72) return 'PEAK'
  if (progress > 0.35) return 'BUILD'
  return 'BASE'
}

function getSwimmingLoadFactor(weekNumber: number, totalWeeks: number): number {
  if (weekNumber % 4 === 0 && weekNumber < totalWeeks) return 0.75
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 0.65
  return 0.9 + progress * 0.2
}

function getSwimmingFocus(goal: string, weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks
  if (goal === 'sprint') {
    if (progress < 0.3) return 'Technique and aerobic base'
    if (progress < 0.6) return 'Speed play and speed work'
    return 'Maximal speed and race preparation'
  }
  if (goal === 'distance' || goal === 'open-water') {
    if (progress < 0.3) return 'Aerobic base and technique'
    if (progress < 0.6) return 'Threshold work'
    return 'Distance-specific work'
  }
  return 'General training'
}
