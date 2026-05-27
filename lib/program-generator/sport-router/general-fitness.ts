import type { Client, CreateTrainingProgramDTO } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import {
  getGeneralFitnessProgram,
  getProgramDescription,
  type FitnessGoal,
  type FitnessLevel,
} from '../templates/general-fitness'
import type { SportProgramParams } from './types'


/**
 * Generate General Fitness program from templates
 */
export function generateGeneralFitnessProgram(
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
  const locale = params.locale === 'sv' ? 'sv' : 'en'

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, durationWeeks)

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${locale === 'sv' ? programDesc.titleSv : programDesc.title} - ${client.name}`,
    goalType: 'fitness',
    startDate,
    endDate,
    notes: params.notes || (locale === 'sv' ? programDesc.descriptionSv : programDesc.description),
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
export function mapGoalToFitnessGoal(goal: string): FitnessGoal {
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
 * Map fitness workout types
 */
export function mapFitnessWorkoutType(type: string): 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING' | 'SWIMMING' | 'HYROX' | 'TRIATHLON' | 'OTHER' {
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
export function mapIntensity(intensity: string): 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX' {
  const intensityMap: Record<string, 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL'> = {
    low: 'EASY',
    moderate: 'MODERATE',
    high: 'THRESHOLD',
    very_high: 'INTERVAL',
  }
  return intensityMap[intensity] || 'MODERATE'
}
