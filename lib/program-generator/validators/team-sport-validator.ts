import type { CreateTrainingProgramDTO, CreateWorkoutDTO } from '@/types'
import type { SportType } from '@prisma/client'

export interface TeamSportValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateTeamSportProgram(
  program: CreateTrainingProgramDTO,
  sport: SportType,
  settings?: Record<string, unknown> | null
): TeamSportValidationResult {
  if (sport === 'TEAM_FOOTBALL') {
    return validateFootballProgram(program)
  }

  if (sport === 'TEAM_ICE_HOCKEY') {
    return validateHockeyProgram(program, settings)
  }

  return { valid: true, errors: [], warnings: [] }
}

function validateFootballProgram(program: CreateTrainingProgramDTO): TeamSportValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const week of program.weeks ?? []) {
    const workoutsByDay = new Map(week.days.map((day) => [day.dayNumber, day.workouts]))
    const workouts = week.days.flatMap((day) => day.workouts)
    const hasMatch = workouts.some(isMatchWorkout)

    if (!hasMatch) continue

    if (!workouts.some((workout) => workout.name.includes('MD+1'))) {
      warnings.push(`Week ${week.weekNumber}: football match week is missing MD+1 recovery.`)
    }

    if (!workouts.some((workout) => workout.name.includes('MD-1'))) {
      warnings.push(`Week ${week.weekNumber}: football match week is missing MD-1 activation.`)
    }

    if (!workouts.some((workout) => workout.instructions?.includes('FIFA 11+') || workout.segments.some((segment) => segment.description?.includes('FIFA 11+')))) {
      warnings.push(`Week ${week.weekNumber}: football week should include FIFA 11+ or equivalent injury prevention.`)
    }

    for (const day of week.days) {
      if (!day.workouts.some(isMatchWorkout)) continue
      const previousDayWorkouts = workoutsByDay.get(day.dayNumber - 1) ?? []
      if (previousDayWorkouts.some(isHeavyNonMatchWorkout)) {
        errors.push(`Week ${week.weekNumber}: heavy workout scheduled the day before match day.`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateHockeyProgram(
  program: CreateTrainingProgramDTO,
  settings?: Record<string, unknown> | null
): TeamSportValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const position = typeof settings?.position === 'string' ? settings.position : null
  const matchesThisWeek = typeof settings?.matchesThisWeek === 'number' ? settings.matchesThisWeek : 0

  for (const week of program.weeks ?? []) {
    const workouts = week.days.flatMap((day) => day.workouts)
    const text = workouts.map((workout) => `${workout.name} ${workout.instructions ?? ''} ${workout.segments.map((segment) => segment.description ?? '').join(' ')}`).join(' ')

    if (position === 'goalie') {
      if (!/höft|Höft|reaktion|Reaktion/.test(text)) {
        warnings.push(`Week ${week.weekNumber}: goalie plan should include hip mobility and reaction work.`)
      }
    }

    if (matchesThisWeek >= 3) {
      const extraHardConditioning = workouts.some((workout) =>
        !isMatchWorkout(workout)
        && (workout.type === 'RUNNING' || workout.type === 'CYCLING' || workout.type === 'OTHER')
        && (workout.intensity === 'INTERVAL' || workout.intensity === 'MAX')
      )
      if (extraHardConditioning) {
        errors.push(`Week ${week.weekNumber}: hockey 3-game week includes extra hard conditioning.`)
      }
    }

    if (!/Copenhagen|ljumske|adduktor|höft|Höft|Frog|Butterfly/.test(text)) {
      warnings.push(`Week ${week.weekNumber}: hockey week should include hip/groin injury prevention.`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

function isMatchWorkout(workout: CreateWorkoutDTO): boolean {
  return /match/i.test(workout.name)
}

function isHeavyNonMatchWorkout(workout: CreateWorkoutDTO): boolean {
  if (isMatchWorkout(workout)) return false
  if (workout.type === 'STRENGTH') return true
  return workout.intensity === 'THRESHOLD' || workout.intensity === 'INTERVAL' || workout.intensity === 'MAX'
}
