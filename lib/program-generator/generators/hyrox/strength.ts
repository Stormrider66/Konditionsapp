import type { CreateTrainingProgramDTO, CreateWorkoutDTO, CreateWorkoutSegmentDTO, PeriodPhase } from '@/types'
import type { StrengthPhase } from '@prisma/client'
import {
  generateHyroxStrengthSession,
  calculateWorkingWeight,
  type StrengthPRs,
  type HyroxStation,
} from '../../templates/hyrox-strength'
import { getStrengthPhaseName, type AppLocale } from './mappers'

/**
 * Map the running-plan phase to an appropriate strength phase.
 *   BASE      → AA (first half) → Max Strength (second half)
 *   BUILD     → Max Strength
 *   PEAK      → Power (first ~3 weeks) → Maintenance
 *   TAPER     → Taper
 *   RECOVERY  → AA
 */
export function mapRunningPhaseToStrengthPhase(
  phase: PeriodPhase,
  weekInPhase: number,
  totalWeeksInPhase: number
): StrengthPhase {
  switch (phase) {
    case 'BASE':
      return weekInPhase <= totalWeeksInPhase / 2 ? 'ANATOMICAL_ADAPTATION' : 'MAXIMUM_STRENGTH'
    case 'BUILD':
      return 'MAXIMUM_STRENGTH'
    case 'PEAK':
      return weekInPhase <= 3 ? 'POWER' : 'MAINTENANCE'
    case 'TAPER':
      return 'TAPER'
    case 'RECOVERY':
      return 'ANATOMICAL_ADAPTATION'
    default:
      return 'MAINTENANCE'
  }
}

/**
 * Build a `CreateWorkoutDTO` for a HYROX strength session: warmup
 * + main lifts with %1RM + optional finisher. Instructions are rendered
 * as a human-readable Swedish string; segments track the main lifts.
 */
export function createHyroxStrengthWorkout(
  strengthPhase: StrengthPhase,
  sessionType: 'lower' | 'upper' | 'full_body' | 'power' | 'station_specific',
  strengthPRs: StrengthPRs,
  weakStations?: HyroxStation[],
  locale: AppLocale = 'en'
): CreateWorkoutDTO {
  const session = generateHyroxStrengthSession(strengthPhase, sessionType, strengthPRs, weakStations)

  const instructions: string[] = []

  instructions.push(`=== ${t(locale, 'WARM-UP', 'UPPVÄRMNING')} ===`)
  instructions.push(`${locale === 'sv' ? session.warmup.generalCardio.exerciseSv : session.warmup.generalCardio.exercise} - ${session.warmup.generalCardio.durationMinutes} min`)
  instructions.push('')
  instructions.push(t(locale, 'Activation exercises:', 'Aktiveringsövningar:'))
  for (const activation of session.warmup.activation) {
    instructions.push(`• ${locale === 'sv' ? activation.exerciseSv : activation.exercise}: ${activation.sets}×${activation.reps}`)
  }

  if (session.warmup.rampUpSets && session.warmup.rampUpSets.length > 0) {
    instructions.push('')
    instructions.push(t(locale, 'Warm-up sets (for the main lift):', 'Uppvärmningsset (för huvudövningen):'))
    for (const rampUp of session.warmup.rampUpSets) {
      instructions.push(`• ${rampUp.reps} reps @ ${rampUp.percentOf1RM}%`)
    }
  }

  instructions.push('')
  instructions.push(`=== ${t(locale, 'MAIN SESSION', 'HUVUDPASS')} ===`)

  for (const exercise of session.mainWorkout) {
    const workingWeight = exercise.percentOf1RM
      ? calculateWorkingWeight(exercise.id, exercise.percentOf1RM, strengthPRs)
      : null

    const repStr = typeof exercise.reps === 'number' ? exercise.reps : exercise.reps
    const restStr = exercise.restSeconds >= 60
      ? `${Math.round(exercise.restSeconds / 60)} min`
      : `${exercise.restSeconds}s`

    let exerciseLine = `${locale === 'sv' ? exercise.nameSv : exercise.name}: ${exercise.sets}×${repStr}`
    if (exercise.percentOf1RM && workingWeight) {
      exerciseLine += ` @ ${exercise.percentOf1RM}% (${workingWeight}kg)`
    } else if (exercise.percentOf1RM) {
      exerciseLine += ` @ ${exercise.percentOf1RM}%`
    }
    exerciseLine += ` - ${t(locale, 'Rest', 'Vila')} ${restStr}`
    if (exercise.tempo) exerciseLine += ` [Tempo: ${exercise.tempo}]`

    instructions.push(`• ${exerciseLine}`)
    const notes = locale === 'sv' ? exercise.notesSv : exercise.notes
    if (notes) instructions.push(`  → ${notes}`)
  }

  if (session.finisher) {
    instructions.push('')
    instructions.push(`=== ${t(locale, 'FINISHER', 'AVSLUTNING')}: ${locale === 'sv' ? session.finisher.nameSv : session.finisher.name} ===`)
    instructions.push(`Format: ${session.finisher.format}`)
    for (const ex of session.finisher.exercises) {
      instructions.push(`• ${locale === 'sv' ? ex.exerciseSv : ex.exercise}: ${ex.reps}`)
    }
  }

  const segments: CreateWorkoutSegmentDTO[] = session.mainWorkout.map((exercise, index) => ({
    order: index + 1,
    type: 'work',
    description: locale === 'sv' ? exercise.nameSv : exercise.name,
    duration: Math.round(
      (exercise.sets * (typeof exercise.reps === 'number' ? exercise.reps * 3 : 30)
        + exercise.restSeconds * (exercise.sets - 1)) / 60
    ),
  }))

  return {
    type: 'STRENGTH',
    name: locale === 'sv' ? session.nameSv : session.name,
    description: `${getStrengthPhaseName(strengthPhase, locale)} - ${t(locale, 'HYROX strength session', 'HYROX styrkepass')}`,
    intensity:
      strengthPhase === 'ANATOMICAL_ADAPTATION' ? 'MODERATE'
        : strengthPhase === 'MAXIMUM_STRENGTH' ? 'THRESHOLD'
          : strengthPhase === 'POWER' ? 'INTERVAL'
            : 'MODERATE',
    duration: session.durationMinutes,
    instructions: instructions.join('\n'),
    segments,
  }
}

/**
 * Inject strength workouts into existing program weeks, with phase-aware
 * session-type selection and day-spread that avoids back-to-back hard
 * running days. Mutates `weeks` in place (matches historical behavior).
 */
export function addStrengthWorkoutsToProgram(
  weeks: NonNullable<CreateTrainingProgramDTO['weeks']>,
  strengthSessionsPerWeek: number,
  strengthPRs: StrengthPRs,
  weakStations?: string[],
  locale: AppLocale = 'en'
): void {
  if (strengthSessionsPerWeek < 1 || !weeks || weeks.length === 0) return

  const typedWeakStations = (weakStations || []) as HyroxStation[]

  let currentRunningPhase: PeriodPhase = 'BASE'
  let weeksInPhase = 0
  let totalWeeksInPhase = 4

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex]

    if (week.phase !== currentRunningPhase) {
      currentRunningPhase = week.phase as PeriodPhase
      weeksInPhase = 0
      totalWeeksInPhase = weeks.filter((w) => w.phase === currentRunningPhase).length
    }
    weeksInPhase++

    const strengthPhase = mapRunningPhaseToStrengthPhase(
      currentRunningPhase,
      weeksInPhase,
      totalWeeksInPhase
    )

    const strengthDays = findStrengthTrainingDays(week.days, strengthSessionsPerWeek)

    for (let i = 0; i < strengthDays.length && i < strengthSessionsPerWeek; i++) {
      const dayIndex = strengthDays[i]
      const day = week.days[dayIndex]

      let sessionType: 'lower' | 'upper' | 'full_body' | 'power' | 'station_specific'
      if (strengthSessionsPerWeek === 1) {
        sessionType = 'full_body'
      } else if (strengthPhase === 'POWER') {
        sessionType = i === 0 ? 'power' : 'station_specific'
      } else if (strengthPhase === 'TAPER') {
        sessionType = 'full_body'
      } else {
        sessionType = i === 0 ? 'lower' : i === 1 ? 'upper' : 'station_specific'
      }

      const strengthWorkout = createHyroxStrengthWorkout(
        strengthPhase,
        sessionType,
        strengthPRs,
        typedWeakStations,
        locale
      )

      day.workouts.push(strengthWorkout)
    }
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Pick `sessionsNeeded` days that aren't a hard-running day nor the day
 * after one, preferring a spread across the week.
 */
function findStrengthTrainingDays(
  days: NonNullable<NonNullable<CreateTrainingProgramDTO['weeks']>[0]['days']>,
  sessionsNeeded: number
): number[] {
  const suitableDays: number[] = []
  const hardRunningDays = new Set<number>()

  days.forEach((day, index) => {
    const hasHardRunning = day.workouts.some(
      (w) =>
        w.type === 'RUNNING' &&
        (w.intensity === 'THRESHOLD' || w.intensity === 'INTERVAL' || w.intensity === 'MAX' ||
          (w.duration && w.duration >= 70))
    )
    if (hasHardRunning) hardRunningDays.add(index)
  })

  for (let i = 0; i < days.length; i++) {
    const dayBefore = i > 0 ? i - 1 : 6
    const isHardDay = hardRunningDays.has(i)
    const isDayAfterHard = hardRunningDays.has(dayBefore)
    if (!isHardDay && !isDayAfterHard) suitableDays.push(i)
  }

  if (suitableDays.length < sessionsNeeded) {
    for (let i = 0; i < days.length; i++) {
      if (!suitableDays.includes(i) && !hardRunningDays.has(i)) suitableDays.push(i)
    }
  }

  const spreadDays: number[] = []
  if (sessionsNeeded === 1) {
    // Single session: prefer Tuesday (1) or Thursday (3).
    const preferred = [1, 3, 5, 2, 4, 0, 6]
    for (const pref of preferred) {
      if (suitableDays.includes(pref)) {
        spreadDays.push(pref)
        break
      }
    }
  } else if (sessionsNeeded === 2) {
    // Two sessions: prefer Tue/Fri or Mon/Thu.
    const pairs = [[1, 4], [0, 3], [2, 5]]
    for (const pair of pairs) {
      if (pair.every((d) => suitableDays.includes(d))) {
        spreadDays.push(...pair)
        break
      }
    }
    if (spreadDays.length === 0) spreadDays.push(...suitableDays.slice(0, 2))
  } else {
    // Three sessions: prefer Mon/Wed/Fri or Tue/Thu/Sat.
    const triples = [[0, 2, 4], [1, 3, 5]]
    for (const triple of triples) {
      if (triple.every((d) => suitableDays.includes(d))) {
        spreadDays.push(...triple)
        break
      }
    }
    if (spreadDays.length === 0) spreadDays.push(...suitableDays.slice(0, 3))
  }

  return spreadDays.sort((a, b) => a - b)
}
