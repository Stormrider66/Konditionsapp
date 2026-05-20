import type { CreateTrainingProgramDTO, CreateWorkoutDTO } from '@/types'

export type ProgramQualityValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    weeks: number
    activeWeeks: number
    workouts: number
    averageWorkoutsPerWeek: number
  }
}

export type ProgramQualityValidationOptions = {
  sport: string
  expectedSessionsPerWeek?: number
}

export function validateGeneratedProgramQuality(
  program: CreateTrainingProgramDTO,
  options: ProgramQualityValidationOptions
): ProgramQualityValidationResult {
  const weeks = program.weeks || []
  const errors: string[] = []
  const warnings: string[] = []

  if (weeks.length === 0) {
    errors.push('Programmet saknar veckor.')
  }

  const allWorkouts = weeks.flatMap((week) => week.days.flatMap((day) => day.workouts))
  const activeWeeks = weeks.filter((week) => week.days.some((day) => day.workouts.length > 0))
  const emptyWeeks = weeks.filter((week) => !week.days.some((day) => day.workouts.length > 0))
  const weeksWithoutSevenDays = weeks.filter((week) => week.days.length < 7)

  if (allWorkouts.length === 0) {
    errors.push('Programmet innehåller inga träningspass.')
  }

  if (emptyWeeks.length > 0) {
    errors.push(`Programmet har tomma veckor: ${emptyWeeks.map((week) => week.weekNumber).slice(0, 5).join(', ')}.`)
  }

  if (weeksWithoutSevenDays.length > 0) {
    errors.push(`Programmet har veckor med färre än sju dagar: ${weeksWithoutSevenDays.map((week) => week.weekNumber).slice(0, 5).join(', ')}.`)
  }

  const incompleteWorkouts = allWorkouts.filter((workout) => !isUsefulWorkout(workout))
  if (incompleteWorkouts.length > 0) {
    errors.push(`Programmet har pass utan tillräckligt träningsinnehåll: ${incompleteWorkouts.slice(0, 3).map((workout) => workout.name || 'Namnlöst pass').join(', ')}.`)
  }

  const averageWorkoutsPerWeek = weeks.length > 0 ? allWorkouts.length / weeks.length : 0
  const expectedSessions = Math.max(1, Math.min(7, options.expectedSessionsPerWeek || 3))
  if (weeks.length > 0 && averageWorkoutsPerWeek < Math.max(1, expectedSessions * 0.5)) {
    warnings.push(`${options.sport} genererade färre pass per vecka än förväntat (${averageWorkoutsPerWeek.toFixed(1)} av ${expectedSessions}).`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      weeks: weeks.length,
      activeWeeks: activeWeeks.length,
      workouts: allWorkouts.length,
      averageWorkoutsPerWeek,
    },
  }
}

function isUsefulWorkout(workout: CreateWorkoutDTO): boolean {
  const hasName = typeof workout.name === 'string' && workout.name.trim().length >= 3
  const hasType = Boolean(workout.type)
  const hasIntensity = Boolean(workout.intensity)
  const hasLoad = (workout.duration || 0) > 0 ||
    (workout.distance || 0) > 0 ||
    workout.segments.some((segment) =>
      (segment.duration || 0) > 0 ||
      (segment.distance || 0) > 0 ||
      (segment.reps || 0) > 0 ||
      Boolean(segment.repsCount) ||
      Boolean(segment.description)
    )
  const hasCoachingContent = Boolean(workout.instructions?.trim()) ||
    Boolean(workout.description?.trim()) ||
    workout.segments.some((segment) => Boolean(segment.description?.trim()) || Boolean(segment.notes?.trim()))

  return hasName && hasType && hasIntensity && hasLoad && hasCoachingContent
}
