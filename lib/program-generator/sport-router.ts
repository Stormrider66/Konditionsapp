// lib/program-generator/sport-router.ts
// Sport router - routes program generation to sport-specific generators

import { SportType } from '@prisma/client'
import { Client, Test, CreateTrainingProgramDTO } from '@/types'
import { generateBaseProgram, ProgramGenerationParams } from './index'
import { generateCyclingProgram, CyclingProgramParams } from './generators/cycling-generator'
import { generateSkiingProgram, SkiingProgramParams } from './generators/skiing-generator'
import { generateSwimmingProgram, SwimmingProgramParams } from './generators/swimming-generator'
import { generateTriathlonProgram, TriathlonProgramParams } from './generators/triathlon-generator'
import { generateHyroxProgram, HyroxProgramParams } from './generators/hyrox-generator'
import { generateStrengthProgram, StrengthProgramParams } from './generators/strength-generator'
import {
  getGeneralFitnessProgram,
  getProgramDescription,
  type FitnessGoal,
  type FitnessLevel,
} from './templates/general-fitness'

export type DataSourceType = 'TEST' | 'PROFILE' | 'MANUAL'

export interface SportProgramParams {
  // Common fields
  clientId: string
  coachId: string
  sport: SportType
  goal: string
  dataSource: DataSourceType
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date

  // Test-based
  testId?: string

  // Manual values
  manualFtp?: number
  manualCss?: string
  manualVdot?: number

  // Sport-specific
  methodology?: string
  weeklyHours?: number
  bikeType?: string
  technique?: string
  poolLength?: string

  // Strength integration
  includeStrength?: boolean
  strengthSessionsPerWeek?: number

  // General Fitness specific
  fitnessGoal?: FitnessGoal
  fitnessLevel?: FitnessLevel
  hasGymAccess?: boolean
  preferredActivities?: string[]
}

/**
 * Main sport router - routes to appropriate generator based on sport type
 */
export async function generateSportProgram(
  params: SportProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  console.log('=====================================')
  console.log(`SPORT ROUTER: Generating ${params.sport} program`)
  console.log(`Goal: ${params.goal}`)
  console.log(`Data Source: ${params.dataSource}`)
  console.log('=====================================\n')

  switch (params.sport) {
    case 'RUNNING':
      return generateRunningProgram(params, client, test)

    case 'CYCLING':
      return generateCyclingProgram({
        ...params,
        ftp: params.manualFtp,
        weeklyHours: params.weeklyHours || 8,
        bikeType: params.bikeType as any,
      } as CyclingProgramParams, client)

    case 'SKIING':
      return generateSkiingProgram({
        ...params,
        technique: params.technique as any,
      } as SkiingProgramParams, client, test)

    case 'SWIMMING':
      return generateSwimmingProgram({
        ...params,
        css: params.manualCss,
        poolLength: params.poolLength as any,
      } as SwimmingProgramParams, client)

    case 'TRIATHLON':
      return generateTriathlonProgram({
        ...params,
        ftp: params.manualFtp,
        css: params.manualCss,
        vdot: params.manualVdot,
      } as TriathlonProgramParams, client, test)

    case 'HYROX':
      return generateHyroxProgram({
        ...params,
      } as HyroxProgramParams, client)

    case 'STRENGTH':
      return generateStrengthProgram({
        ...params,
      } as StrengthProgramParams, client)

    case 'GENERAL_FITNESS':
      return generateGeneralFitnessProgram(params, client)

    default:
      throw new Error(`Unsupported sport type: ${params.sport}`)
  }
}

/**
 * Generate running program using existing generator
 */
async function generateRunningProgram(
  params: SportProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  // Map goal to legacy goalType
  const goalTypeMap: Record<string, ProgramGenerationParams['goalType']> = {
    'marathon': 'marathon',
    'half-marathon': 'half-marathon',
    '10k': '10k',
    '5k': '5k',
    'custom': 'custom',
  }

  const runningParams: ProgramGenerationParams = {
    testId: params.testId || '',
    clientId: params.clientId,
    coachId: params.coachId,
    goalType: goalTypeMap[params.goal] || 'fitness',
    durationWeeks: params.durationWeeks,
    trainingDaysPerWeek: params.sessionsPerWeek,
    experienceLevel: 'intermediate',
    targetRaceDate: params.targetRaceDate,
    notes: params.notes,
    methodology: params.methodology as any,
    strengthSessionsPerWeek: params.includeStrength ? (params.strengthSessionsPerWeek || 2) : 0,
  }

  if (!test && params.dataSource === 'TEST') {
    throw new Error('Test required for test-based running program')
  }

  // For MANUAL or PROFILE data source without test, create custom program
  if (!test) {
    return createCustomRunningProgram(params, client)
  }

  return generateBaseProgram(test, client, runningParams)
}

/**
 * Generate custom running program without test data
 */
function createCustomRunningProgram(
  params: SportProgramParams,
  client: Client
): CreateTrainingProgramDTO {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + params.durationWeeks * 7)

  const goalLabels: Record<string, string> = {
    'marathon': 'Marathon',
    'half-marathon': 'Halvmaraton',
    '10k': '10K',
    '5k': '5K',
    'custom': 'Anpassad',
  }

  const goalLabel = goalLabels[params.goal] || params.goal

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabel} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Löpprogram för ${goalLabel.toLowerCase()}`,
    weeks: createEmptyWeeks(params.durationWeeks, startDate),
  }
}

/**
 * Generate General Fitness program from templates
 */
function generateGeneralFitnessProgram(
  params: SportProgramParams,
  client: Client
): CreateTrainingProgramDTO {
  const fitnessGoal = (params.fitnessGoal || mapGoalToFitnessGoal(params.goal)) as FitnessGoal
  const fitnessLevel = (params.fitnessLevel || 'moderately_active') as FitnessLevel

  const fitnessWeeks = getGeneralFitnessProgram(
    fitnessGoal,
    fitnessLevel,
    Math.min(6, Math.max(3, params.sessionsPerWeek)) as 3 | 4 | 5 | 6,
    {
      hasGymAccess: params.hasGymAccess || false,
      preferredActivities: params.preferredActivities || [],
    }
  )

  const programDesc = getProgramDescription(fitnessGoal)
  const durationWeeks = fitnessWeeks.length

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + durationWeeks * 7)

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${programDesc.titleSv} - ${client.name}`,
    goalType: 'fitness',
    startDate,
    endDate,
    notes: params.notes || programDesc.descriptionSv,
    weeks: fitnessWeeks.map((week, weekIndex) => ({
      weekNumber: week.week,
      startDate: new Date(startDate.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000),
      phase: week.phase,
      volume: 0,
      focus: week.focus,
      days: Array.from({ length: 7 }).map((_, dayIndex) => {
        const workout = week.workouts[dayIndex % week.workouts.length]
        const hasWorkout = dayIndex < week.workouts.length

        return {
          dayNumber: dayIndex + 1,
          notes: hasWorkout ? week.tips[dayIndex % week.tips.length] || '' : '',
          workouts: hasWorkout && workout
            ? [
                {
                  type: mapFitnessWorkoutType(workout.type),
                  name: workout.name,
                  intensity: mapIntensity(workout.intensity),
                  duration: workout.duration,
                  distance: undefined,
                  instructions: workout.description,
                  segments: [],
                },
              ]
            : [],
        }
      }),
    })),
  }
}

/**
 * Map goal string to FitnessGoal
 */
function mapGoalToFitnessGoal(goal: string): FitnessGoal {
  const mapping: Record<string, FitnessGoal> = {
    'weight_loss': 'weight_loss',
    'strength': 'strength',
    'endurance': 'endurance',
    'flexibility': 'flexibility',
    'stress_relief': 'stress_relief',
    'general_health': 'general_health',
  }
  return mapping[goal] || 'general_health'
}

/**
 * Create empty weeks structure for custom programs
 */
function createEmptyWeeks(durationWeeks: number, startDate: Date) {
  return Array.from({ length: durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: i < 3 ? 'BASE' as const : i < durationWeeks - 2 ? 'BUILD' as const : 'PEAK' as const,
    volume: 0,
    focus: 'General',
    days: Array.from({ length: 7 }).map((_, j) => ({
      dayNumber: j + 1,
      notes: '',
      workouts: [],
    })),
  }))
}

/**
 * Map fitness workout types
 */
function mapFitnessWorkoutType(type: string): 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING' | 'SWIMMING' | 'HYROX' | 'TRIATHLON' | 'OTHER' {
  const typeMap: Record<string, 'RUNNING' | 'STRENGTH' | 'CORE' | 'RECOVERY' | 'OTHER'> = {
    cardio: 'RUNNING',
    strength: 'STRENGTH',
    hiit: 'RUNNING',
    mobility: 'RECOVERY',
    yoga: 'RECOVERY',
    'active-rest': 'RECOVERY',
    circuit: 'STRENGTH',
    core: 'CORE',
  }
  return typeMap[type] || 'OTHER'
}

/**
 * Map intensity levels
 */
function mapIntensity(intensity: string): 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX' {
  const intensityMap: Record<string, 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL'> = {
    low: 'EASY',
    moderate: 'MODERATE',
    high: 'THRESHOLD',
    very_high: 'INTERVAL',
  }
  return intensityMap[intensity] || 'MODERATE'
}
