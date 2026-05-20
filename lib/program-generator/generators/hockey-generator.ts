import type { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, PeriodPhase, WorkoutIntensity } from '@/types'
import { getProgramEndDate, getProgramStartDate } from '../date-utils'
import type { SportProgramParams } from '../sport-router/types'
import {
  calculateTrainingLoad,
  getInjuryPreventionExercises,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  type HockeyPosition,
  type SeasonPhase,
} from '@/lib/training-engine/hockey'
import { logger } from '@/lib/logger'

type HockeySettings = {
  position?: HockeyPosition
  seasonPhase?: SeasonPhase
  averageIceTimeMinutes?: number | null
  shiftsPerGame?: number | null
  weeklyOffIceSessions?: number
  hasAccessToIce?: boolean
  hasAccessToGym?: boolean
  playStyle?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function generateHockeyProgram(
  params: SportProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  const settings = normalizeHockeySettings(params.hockeySettings)
  const position = settings.position || 'center'
  const phase = settings.seasonPhase || inferSeasonPhase(params.goal)
  const matchesThisWeek = inferMatchesThisWeek(phase, params.goal)
  const profile = getPositionRecommendations(position, 'sv')
  const phaseTraining = getSeasonPhaseTraining(phase, 'sv')
  const prevention = getInjuryPreventionExercises(position, 'sv')
  const load = calculateTrainingLoad(position, phase, matchesThisWeek, 'sv')
  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)
  const requestedSessions = Math.min(7, Math.max(2, settings.weeklyOffIceSessions || params.sessionsPerWeek || 4))

  logger.debug('Starting hockey program generation', {
    goal: params.goal,
    position,
    phase,
    requestedSessions,
    matchesThisWeek,
  })

  const weeks = Array.from({ length: params.durationWeeks }).map((_, index) => {
    const weekNumber = index + 1
    const periodPhase = getProgramPhase(weekNumber, params.durationWeeks)
    const intensityFactor = getWeekIntensityFactor(weekNumber, params.durationWeeks, params.goal)
    const days = buildHockeyWeek({
      goal: params.goal,
      phase,
      position,
      requestedSessions,
      hasIce: settings.hasAccessToIce !== false,
      hasGym: settings.hasAccessToGym !== false,
      matchesThisWeek,
      profile,
      phaseTraining,
      prevention,
      strengthSessions: load.strengthSessions,
      conditioningSessions: load.conditioningSessions,
      intensityFactor,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * DAY_MS),
      phase: periodPhase,
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: `${phaseTraining.primaryGoals[0] || 'Ishockey'} - ${profile.primaryConditioningFocus[0] || position}`,
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: `${hockeyGoalLabel(params.goal)} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `${profile.description} Programmet styrs av säsongsfas, matchbelastning och positionsspecifik skadeprevention.`,
    weeks,
  }
}

function buildHockeyWeek(input: {
  goal: string
  phase: SeasonPhase
  position: HockeyPosition
  requestedSessions: number
  hasIce: boolean
  hasGym: boolean
  matchesThisWeek: number
  profile: ReturnType<typeof getPositionRecommendations>
  phaseTraining: ReturnType<typeof getSeasonPhaseTraining>
  prevention: ReturnType<typeof getInjuryPreventionExercises>
  strengthSessions: number
  conditioningSessions: number
  intensityFactor: number
}): CreateTrainingDayDTO[] {
  const days: CreateTrainingDayDTO[] = Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: '',
    workouts: [],
  }))

  if (input.phase === 'in_season' || input.phase === 'playoffs' || input.matchesThisWeek >= 2) {
    days[0] = withWorkout(1, recoveryWorkout('Återhämtning efter match', 'Lätt cykel/promenad, mobilitet och vätska/nutrition.'))
    days[1] = input.hasGym
      ? withWorkout(2, strengthWorkout('Kort styrka/prehab', input.profile.primaryStrengthFocus, input.prevention, 'MODERATE', input.position))
      : withWorkout(2, mobilityWorkout('Prehab och mobilitet', input.prevention, input.position))
    days[2] = input.hasIce
      ? withWorkout(3, iceWorkout('Is: teknik och matchtempo', input.position, input.intensityFactor))
      : withWorkout(3, conditioningWorkout('Bytesintervaller off-ice', input.position, input.intensityFactor))
    days[4] = withWorkout(5, activationWorkout('Matchförberedande aktivering', input.position))
    days[5] = withWorkout(6, matchWorkout('Match', input.position))
    if (input.matchesThisWeek >= 2) {
      days[6] = withWorkout(7, matchWorkout('Match 2', input.position))
    }
    return trimToSessions(days, Math.max(2, Math.min(input.requestedSessions, input.matchesThisWeek >= 2 ? 5 : 4)), [6, 7, 5, 2, 3, 1])
  }

  days[0] = input.hasGym
    ? withWorkout(1, strengthWorkout('Maxstyrka och acceleration', input.profile.primaryStrengthFocus, input.prevention, 'THRESHOLD', input.position))
    : withWorkout(1, mobilityWorkout('Prehab och mobilitet', input.prevention, input.position))
  days[1] = withWorkout(2, conditioningWorkout('Hockeyspecifik kondition', input.position, input.intensityFactor))
  days[2] = withWorkout(3, recoveryWorkout('Aktiv återhämtning', 'Lätt aerob aktivitet och rörlighet.'))
  days[3] = withWorkout(4, powerWorkout(input.position))
  days[4] = input.hasIce
    ? withWorkout(5, iceWorkout('Is: skills och hög fart', input.position, input.intensityFactor))
    : withWorkout(5, conditioningWorkout('Agility och riktningsförändringar', input.position, input.intensityFactor))
  days[5] = input.hasGym
    ? withWorkout(6, strengthWorkout('Unilateral styrka/prehab', input.profile.primaryStrengthFocus, input.prevention, 'MODERATE', input.position))
    : withWorkout(6, mobilityWorkout('Rörlighet och bål', input.prevention, input.position))

  return trimToSessions(days, input.requestedSessions, [1, 2, 4, 5, 6, 3])
}

function withWorkout(dayNumber: number, workout: CreateWorkoutDTO): CreateTrainingDayDTO {
  return { dayNumber, notes: '', workouts: [workout] }
}

function trimToSessions(days: CreateTrainingDayDTO[], sessionsPerWeek: number, priorityDays: number[]): CreateTrainingDayDTO[] {
  const keep = new Set(priorityDays.slice(0, sessionsPerWeek))
  return days.map((day) => keep.has(day.dayNumber) ? day : { ...day, notes: 'Vilodag', workouts: [] })
}

function strengthWorkout(
  name: string,
  focusAreas: string[],
  prevention: ReturnType<typeof getInjuryPreventionExercises>,
  intensity: WorkoutIntensity,
  position: HockeyPosition
): CreateWorkoutDTO {
  const mainFocus = focusAreas.slice(0, 3).join(', ')
  const prehab = prevention.slice(0, position === 'goalie' ? 4 : 3).map((exercise) => `${exercise.name} (${exercise.sets || ''}x${exercise.reps || exercise.frequency || ''})`).join(', ')
  return {
    type: 'STRENGTH',
    name,
    intensity,
    duration: position === 'goalie' ? 40 : 50,
    instructions: `Fokus: ${mainFocus}. Skadeprevention: ${prehab}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: 'Dynamisk uppvärmning och höft/ljumske-aktivering' },
      { order: 2, type: 'exercise', duration: 30, description: mainFocus || 'Helkroppsstyrka' },
      { order: 3, type: 'exercise', duration: 10, description: prehab || 'Hockeyprehab' },
    ],
  }
}

function conditioningWorkout(name: string, position: HockeyPosition, factor: number): CreateWorkoutDTO {
  const isGoalie = position === 'goalie'
  const duration = Math.round((isGoalie ? 35 : 45) * factor)
  const description = isGoalie
    ? 'Korta laterala explosiva intervaller och reaktion med lång vila.'
    : '30-60 sek bytessimulering med kontrollerad vila och bra kvalitet.'
  return {
    type: 'CYCLING',
    name,
    intensity: 'INTERVAL',
    duration,
    instructions: description,
    segments: [
      { order: 1, type: 'warmup', duration: 10, zone: 1, description: 'Lätt uppvärmning' },
      { order: 2, type: 'interval', duration: Math.max(15, duration - 20), zone: 4, description },
      { order: 3, type: 'cooldown', duration: 10, zone: 1, description: 'Nedvarvning' },
    ],
  }
}

function powerWorkout(position: HockeyPosition): CreateWorkoutDTO {
  const description = position === 'goalie'
    ? 'Lateral push, reaktion och bålstabilitet.'
    : position === 'defense'
      ? 'Lateral power, höftstyrka och explosiva riktningsförändringar.'
      : 'Acceleration, rotation och explosiv benkraft.'
  return {
    type: 'PLYOMETRIC',
    name: 'Explosivitet och power',
    intensity: 'INTERVAL',
    duration: 40,
    instructions: description,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: 'Dynamisk uppvärmning' },
      { order: 2, type: 'work', duration: 20, description },
      { order: 3, type: 'cooldown', duration: 10, description: 'Rörlighet höft/ljumske' },
    ],
  }
}

function iceWorkout(name: string, position: HockeyPosition, factor: number): CreateWorkoutDTO {
  const duration = Math.round(60 * factor)
  return {
    type: 'OTHER',
    name,
    intensity: 'MODERATE',
    duration,
    instructions: position === 'goalie'
      ? 'Målvaktsspecifik is: vinklar, reaktion, lateral förflyttning och kontrollerad volym.'
      : 'Is-pass med skridskoekonomi, riktningsförändringar och positionsspecifika moment.',
    segments: [{ order: 1, type: 'work', duration, description: 'Is-specifik träning' }],
  }
}

function mobilityWorkout(name: string, prevention: ReturnType<typeof getInjuryPreventionExercises>, position: HockeyPosition): CreateWorkoutDTO {
  const exercises = prevention.map((exercise) => exercise.name).join(', ')
  return {
    type: 'RECOVERY',
    name,
    intensity: 'EASY',
    duration: position === 'goalie' ? 35 : 25,
    instructions: `Fokus på ${exercises}.`,
    segments: [{ order: 1, type: 'work', duration: position === 'goalie' ? 35 : 25, description: exercises }],
  }
}

function activationWorkout(name: string, position: HockeyPosition): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'EASY',
    duration: 25,
    instructions: position === 'goalie'
      ? 'Höftmobilitet, reaktion och lätt lateral aktivering.'
      : 'Rörlighet, korta stegringar och lätt puck-/klubbförberedelse.',
    segments: [{ order: 1, type: 'work', duration: 25, description: 'Aktivering' }],
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

function matchWorkout(name: string, position: HockeyPosition): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'MAX',
    duration: position === 'goalie' ? 60 : 45,
    instructions: 'Matchdag. Logga istid, byten, RPE, eventuell smärta och återhämtning.',
    segments: [{ order: 1, type: 'work', duration: 60, description: 'Match' }],
  }
}

function normalizeHockeySettings(value: unknown): HockeySettings {
  return isRecord(value) ? value as HockeySettings : {}
}

function inferSeasonPhase(goal: string): SeasonPhase {
  if (goal === 'off-season-build') return 'off_season'
  if (goal === 'pre-season-readiness') return 'pre_season'
  if (goal === 'in-season-maintenance') return 'in_season'
  return 'in_season'
}

function inferMatchesThisWeek(phase: SeasonPhase, goal: string): number {
  if (goal === 'off-season-build' || phase === 'off_season') return 0
  if (phase === 'playoffs') return 2
  return 1
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
  if (goal === 'return-to-play') return Math.min(1, 0.6 + week * 0.08)
  if (week % 4 === 0 && week < totalWeeks) return 0.75
  return 1
}

function hockeyGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    'off-season-build': 'Hockey off-season',
    'pre-season-readiness': 'Hockey försäsong',
    'in-season-maintenance': 'Hockey säsongsunderhåll',
    'speed-power': 'Hockey snabbhet & power',
    'injury-prevention': 'Hockey skadeprevention',
    'return-to-play': 'Hockey return to play',
    custom: 'Hockeyprogram',
  }
  return labels[goal] || 'Hockeyprogram'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
