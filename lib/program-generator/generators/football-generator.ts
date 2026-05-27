import type { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, PeriodPhase, WorkoutIntensity } from '@/types'
import { getProgramEndDate, getProgramStartDate } from '../date-utils'
import type { SportProgramParams } from '../sport-router/types'
import {
  type FootballPosition,
  type SeasonPhase,
} from '@/lib/training-engine/football'
import { logger } from '@/lib/logger'
import { buildFootballPlanningContext, type FootballPlanningContext } from '../team-sports/planning-context'
import { buildFootballPlanningMetadata } from '../team-sports/planning-metadata'

const DAY_MS = 24 * 60 * 60 * 1000
type AppLocale = 'en' | 'sv'

export async function generateFootballProgram(
  params: SportProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  const locale: AppLocale = params.locale === 'sv' ? 'sv' : 'en'
  const planning = buildFootballPlanningContext({ ...params, locale })
  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  logger.debug('Starting football program generation', {
    goal: params.goal,
    position: planning.position,
    phase: planning.phase,
    sessionsPerWeek: planning.sessionsPerWeek,
  })

  const weeks = Array.from({ length: params.durationWeeks }).map((_, index) => {
    const weekNumber = index + 1
    const periodPhase = getProgramPhase(weekNumber, params.durationWeeks)
    const intensityFactor = getWeekIntensityFactor(weekNumber, params.durationWeeks, params.goal)
    const days = buildFootballWeek({
      goal: params.goal,
      phase: planning.phase,
      position: planning.position,
      sessionsPerWeek: planning.sessionsPerWeek,
      matchesPerWeek: planning.matchesPerWeek,
      profile: planning.profile,
      phaseTraining: planning.phaseTraining,
      prevention: planning.prevention,
      intensityFactor: intensityFactor * planning.loadGuidance.intensityMultiplier,
      loadNotes: planning.loadGuidance.notes,
      locale,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * DAY_MS),
      phase: periodPhase,
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: `${planning.phaseTraining.primaryGoals[0] || t(locale, 'Football', 'Fotboll')} - ${planning.profile.primaryConditioningFocus[0] || planning.position}`,
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: `${footballGoalLabel(params.goal, locale)} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || [
      planning.profile.description,
      t(locale, 'The program follows the match-week rhythm and includes position-specific injury prevention.', 'Programmet följer matchveckans rytm och inkluderar positionsspecifik skadeprevention.'),
      ...planning.loadGuidance.notes,
    ].join(' '),
    planningMetadata: buildFootballPlanningMetadata(planning),
    weeks,
  }
}

function buildFootballWeek(input: {
  goal: string
  phase: SeasonPhase
  position: FootballPosition
  sessionsPerWeek: number
  matchesPerWeek: number
  profile: FootballPlanningContext['profile']
  phaseTraining: FootballPlanningContext['phaseTraining']
  prevention: FootballPlanningContext['prevention']
  intensityFactor: number
  loadNotes: string[]
  locale: AppLocale
}): CreateTrainingDayDTO[] {
  const hasMatch = input.phase === 'in_season' || input.phase === 'playoffs' || input.matchesPerWeek > 0
  const days: CreateTrainingDayDTO[] = Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: '',
    workouts: [],
  }))

  if (hasMatch) {
    days[0] = withWorkout(1, recoveryWorkout(t(input.locale, 'MD+1 recovery', 'MD+1 återhämtning'), t(input.locale, 'Easy bike/jog, mobility, and post-match reset.', 'Lätt cykel/jogg, mobilitet och återställning efter match.')))
    days[1] = withWorkout(2, strengthWorkout(t(input.locale, 'MD+2 strength/prehab', 'MD+2 styrka/prehab'), input.profile.primaryStrengthFocus, input.prevention, 'MODERATE', input.locale))
    days[2] = withWorkout(3, footballConditioningWorkout(input.position, input.goal, input.intensityFactor, input.locale, input.loadNotes))
    days[3] = withWorkout(4, tacticalWorkout(t(input.locale, 'MD-3 football-specific training', 'MD-3 fotbollsspecifik träning'), input.phaseTraining.conditioningFocus.type.join(', ')))
    days[4] = withWorkout(5, activationWorkout(t(input.locale, 'MD-2 reduced volume', 'MD-2 reducerad volym'), t(input.locale, 'Short technical work, mobility, and low total load.', 'Kort teknik, rörlighet och låg total belastning.')))
    days[5] = withWorkout(6, activationWorkout(t(input.locale, 'MD-1 activation', 'MD-1 aktivering'), t(input.locale, 'FIFA 11+, light accelerations, and tactical preparation.', 'FIFA 11+, lätta accelerationer och taktisk förberedelse.')))
    days[6] = withWorkout(7, matchWorkout(t(input.locale, 'Match', 'Match'), input.position, input.locale))
    return trimToSessions(days, input.sessionsPerWeek, [7, 6, 1, 3, 2, 5, 4], input.locale)
  }

  days[0] = withWorkout(1, strengthWorkout(t(input.locale, 'Maximum strength and robustness', 'Maxstyrka och robusthet'), input.profile.primaryStrengthFocus, input.prevention, 'THRESHOLD', input.locale))
  days[1] = withWorkout(2, footballConditioningWorkout(input.position, input.goal, input.intensityFactor, input.locale, input.loadNotes))
  days[2] = withWorkout(3, recoveryWorkout(t(input.locale, 'Mobility and recovery', 'Rörlighet och återhämtning'), t(input.locale, 'Mobility, FIFA 11+, and an easy aerobic flush.', 'Mobilitet, FIFA 11+ och lätt aerob flush.')))
  days[3] = withWorkout(4, speedPowerWorkout(input.position, input.locale))
  days[4] = withWorkout(5, tacticalWorkout('Small-sided games', t(input.locale, 'Football-specific conditioning, changes of direction, and ball tempo.', 'Fotbollsspecifik kondition, riktningsförändringar och bolltempo.')))
  days[5] = withWorkout(6, strengthWorkout(t(input.locale, 'Unilateral strength/prehab', 'Unilateral styrka/prehab'), input.profile.primaryStrengthFocus, input.prevention, 'MODERATE', input.locale))

  return trimToSessions(days, input.sessionsPerWeek, [1, 2, 4, 5, 6, 3], input.locale)
}

function withWorkout(dayNumber: number, workout: CreateWorkoutDTO): CreateTrainingDayDTO {
  return { dayNumber, notes: '', workouts: [workout] }
}

function trimToSessions(days: CreateTrainingDayDTO[], sessionsPerWeek: number, priorityDays: number[], locale: AppLocale): CreateTrainingDayDTO[] {
  const keep = new Set(priorityDays.slice(0, sessionsPerWeek))
  return days.map((day) => keep.has(day.dayNumber) ? day : { ...day, notes: t(locale, 'Rest day', 'Vilodag'), workouts: [] })
}

function footballConditioningWorkout(position: FootballPosition, goal: string, factor: number, locale: AppLocale, loadNotes: string[] = []): CreateWorkoutDTO {
  const duration = Math.round((goal === 'speed-power' ? 45 : 55) * factor)
  const focus = position === 'forward'
    ? t(locale, 'Repeated sprint ability and acceleration', 'Repeated sprint ability och acceleration')
    : position === 'midfielder'
      ? t(locale, 'High-intensity intervals and fast recovery', 'Högintensiva intervaller och snabb återhämtning')
      : position === 'goalkeeper'
        ? t(locale, 'Short explosive movements and reaction', 'Korta explosiva förflyttningar och reaktion')
        : t(locale, 'Acceleration/deceleration and duel preparation', 'Acceleration/deceleration och duellförberedelse')

  return {
    type: 'RUNNING',
    name: t(locale, 'Football-specific conditioning', 'Fotbollsspecifik kondition'),
    intensity: 'INTERVAL',
    duration,
    instructions: [`${focus}. ${t(locale, 'Keep total volume controlled and finish with a cooldown.', 'Håll total volym kontrollerad och avsluta med nedvarvning.')}`, ...loadNotes].join(' '),
    segments: [
      { order: 1, type: 'warmup', duration: 12, zone: 1, description: t(locale, 'FIFA 11+ and dynamic warm-up', 'FIFA 11+ och dynamisk uppvärmning') },
      { order: 2, type: 'interval', duration: Math.max(15, duration - 22), zone: 4, description: focus },
      { order: 3, type: 'cooldown', duration: 10, zone: 1, description: t(locale, 'Easy jog and mobility', 'Lätt jogg och rörlighet') },
    ],
  }
}

function strengthWorkout(
  name: string,
  focusAreas: string[],
  prevention: FootballPlanningContext['prevention'],
  intensity: WorkoutIntensity,
  locale: AppLocale
): CreateWorkoutDTO {
  const mainFocus = focusAreas.slice(0, 3).join(', ')
  const prehab = prevention.slice(0, 3).map((exercise) => `${exercise.name} (${exercise.sets || ''}x${exercise.reps || exercise.frequency || ''})`).join(', ')
  return {
    type: 'STRENGTH',
    name,
    intensity,
    duration: 45,
    instructions: `${t(locale, 'Focus', 'Fokus')}: ${mainFocus}. ${t(locale, 'Injury prevention', 'Skadeprevention')}: ${prehab}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: t(locale, 'Dynamic warm-up and activation', 'Dynamisk uppvärmning och aktivering') },
      { order: 2, type: 'exercise', duration: 25, description: mainFocus || t(locale, 'Full-body strength', 'Helkroppsstyrka') },
      { order: 3, type: 'exercise', duration: 10, description: prehab || 'FIFA 11+ prevention' },
    ],
  }
}

function speedPowerWorkout(position: FootballPosition, locale: AppLocale): CreateWorkoutDTO {
  return {
    type: 'PLYOMETRIC',
    name: t(locale, 'Speed and power', 'Snabbhet och power'),
    intensity: 'INTERVAL',
    duration: position === 'goalkeeper' ? 35 : 45,
    instructions: position === 'goalkeeper'
      ? t(locale, 'Lateral explosiveness, reaction, and jumping power with long recoveries.', 'Lateral explosivitet, reaktion och hoppkraft med långa vilor.')
      : t(locale, 'Acceleration, max-speed exposure, and jumping power with full recovery.', 'Acceleration, maxfartsexponering och hoppkraft med full återhämtning.'),
    segments: [
      { order: 1, type: 'warmup', duration: 12, description: t(locale, 'Running drills, mobility, and progressive strides', 'Löpdrills, rörlighet och progressiva stegringar') },
      { order: 2, type: 'work', duration: 23, description: t(locale, 'Short sprints/jumps, full recovery between reps', 'Korta sprintar/hopp, full vila mellan reps') },
      { order: 3, type: 'cooldown', duration: 10, description: t(locale, 'Cooldown and mobility', 'Nedvarvning och rörlighet') },
    ],
  }
}

function tacticalWorkout(name: string, instructions: string): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'MODERATE',
    duration: 60,
    instructions,
    segments: [{ order: 1, type: 'work', duration: 60, description: instructions }],
  }
}

function activationWorkout(name: string, instructions: string): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'EASY',
    duration: 30,
    instructions,
    segments: [{ order: 1, type: 'work', duration: 30, description: instructions }],
  }
}

function recoveryWorkout(name: string, instructions: string): CreateWorkoutDTO {
  return {
    type: 'RECOVERY',
    name,
    intensity: 'RECOVERY',
    duration: 30,
    instructions,
    segments: [{ order: 1, type: 'work', duration: 30, zone: 1, description: instructions }],
  }
}

function matchWorkout(name: string, position: FootballPosition, locale: AppLocale): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'MAX',
    duration: position === 'goalkeeper' ? 90 : 75,
    instructions: t(locale, 'Match day. Log minutes, RPE, any GPS load, and pain after the match.', 'Matchdag. Logga minuter, RPE, eventuell GPS-belastning och smärta efter match.'),
    segments: [{ order: 1, type: 'work', duration: 90, description: 'Match' }],
  }
}

function getProgramPhase(week: number, totalWeeks: number): PeriodPhase {
  const progress = week / totalWeeks
  if (week % 4 === 0 && week < totalWeeks) return 'RECOVERY'
  if (progress <= 0.35) return 'BASE'
  if (progress <= 0.75) return 'BUILD'
  if (progress <= 0.9) return 'PEAK'
  return 'TAPER'
}

function getWeekIntensityFactor(week: number, totalWeeks: number, goal: string): number {
  if (goal === 'return-to-play') return Math.min(1, 0.65 + week * 0.08)
  if (week % 4 === 0 && week < totalWeeks) return 0.75
  return 1
}

function footballGoalLabel(goal: string, locale: AppLocale): string {
  const labels: Record<string, { en: string; sv: string }> = {
    'off-season-build': { en: 'Football off-season', sv: 'Fotboll off-season' },
    'pre-season-readiness': { en: 'Football pre-season', sv: 'Fotboll försäsong' },
    'in-season-maintenance': { en: 'Football in-season maintenance', sv: 'Fotboll säsongsunderhåll' },
    'speed-power': { en: 'Football speed & power', sv: 'Fotboll snabbhet & power' },
    'injury-prevention': { en: 'Football injury prevention', sv: 'Fotboll skadeprevention' },
    'return-to-play': { en: 'Football return to play', sv: 'Fotboll return to play' },
    custom: { en: 'Football program', sv: 'Fotbollsprogram' },
  }
  return labels[goal]?.[locale] || t(locale, 'Football program', 'Fotbollsprogram')
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
