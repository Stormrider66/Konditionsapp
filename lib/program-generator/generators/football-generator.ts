import type { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, PeriodPhase, WorkoutIntensity } from '@/types'
import { getProgramEndDate, getProgramStartDate } from '../date-utils'
import type { SportProgramParams } from '../sport-router/types'
import {
  getInjuryPreventionExercises,
  getPositionRecommendations,
  getSeasonPhaseTraining,
  type FootballPosition,
  type SeasonPhase,
} from '@/lib/training-engine/football'
import { logger } from '@/lib/logger'

type FootballSettings = {
  position?: FootballPosition
  positionDetail?: string
  seasonPhase?: SeasonPhase
  matchesPerWeek?: number
  avgMinutesPerMatch?: number | null
  weeklyTrainingSessions?: number
  hasGPSData?: boolean
  avgMatchDistanceKm?: number | null
  avgSprintDistanceM?: number | null
  playStyle?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function generateFootballProgram(
  params: SportProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  const settings = normalizeFootballSettings(params.footballSettings)
  const position = settings.position || 'midfielder'
  const phase = settings.seasonPhase || inferSeasonPhase(params.goal)
  const profile = getPositionRecommendations(position, 'sv')
  const phaseTraining = getSeasonPhaseTraining(phase, 'sv')
  const prevention = getInjuryPreventionExercises(position, 'sv')
  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)
  const sessionsPerWeek = Math.min(7, Math.max(2, settings.weeklyTrainingSessions || params.sessionsPerWeek || 4))

  logger.debug('Starting football program generation', {
    goal: params.goal,
    position,
    phase,
    sessionsPerWeek,
  })

  const weeks = Array.from({ length: params.durationWeeks }).map((_, index) => {
    const weekNumber = index + 1
    const periodPhase = getProgramPhase(weekNumber, params.durationWeeks)
    const intensityFactor = getWeekIntensityFactor(weekNumber, params.durationWeeks, params.goal)
    const days = buildFootballWeek({
      goal: params.goal,
      phase,
      position,
      sessionsPerWeek,
      matchesPerWeek: Math.max(0, settings.matchesPerWeek || 1),
      profile,
      phaseTraining,
      prevention,
      intensityFactor,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * DAY_MS),
      phase: periodPhase,
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: `${phaseTraining.primaryGoals[0] || 'Fotboll'} - ${profile.primaryConditioningFocus[0] || position}`,
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: `${footballGoalLabel(params.goal)} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `${profile.description} Programmet följer matchveckans rytm och inkluderar positionsspecifik skadeprevention.`,
    weeks,
  }
}

function buildFootballWeek(input: {
  goal: string
  phase: SeasonPhase
  position: FootballPosition
  sessionsPerWeek: number
  matchesPerWeek: number
  profile: ReturnType<typeof getPositionRecommendations>
  phaseTraining: ReturnType<typeof getSeasonPhaseTraining>
  prevention: ReturnType<typeof getInjuryPreventionExercises>
  intensityFactor: number
}): CreateTrainingDayDTO[] {
  const hasMatch = input.phase === 'in_season' || input.phase === 'playoffs' || input.matchesPerWeek > 0
  const days: CreateTrainingDayDTO[] = Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: '',
    workouts: [],
  }))

  if (hasMatch) {
    days[0] = withWorkout(1, recoveryWorkout('MD+1 återhämtning', 'Lätt cykel/jogg, mobilitet och återställning efter match.'))
    days[1] = withWorkout(2, strengthWorkout('MD+2 styrka/prehab', input.profile.primaryStrengthFocus, input.prevention, 'MODERATE'))
    days[2] = withWorkout(3, footballConditioningWorkout(input.position, input.goal, input.intensityFactor))
    days[3] = withWorkout(4, tacticalWorkout('MD-3 fotbollsspecifik träning', input.phaseTraining.conditioningFocus.type.join(', ')))
    days[4] = withWorkout(5, activationWorkout('MD-2 reducerad volym', 'Kort teknik, rörlighet och låg total belastning.'))
    days[5] = withWorkout(6, activationWorkout('MD-1 aktivering', 'FIFA 11+, lätta accelerationer och taktisk förberedelse.'))
    days[6] = withWorkout(7, matchWorkout('Match', input.position))
    return trimToSessions(days, input.sessionsPerWeek, [7, 6, 1, 3, 2, 5, 4])
  }

  days[0] = withWorkout(1, strengthWorkout('Maxstyrka och robusthet', input.profile.primaryStrengthFocus, input.prevention, 'THRESHOLD'))
  days[1] = withWorkout(2, footballConditioningWorkout(input.position, input.goal, input.intensityFactor))
  days[2] = withWorkout(3, recoveryWorkout('Rörlighet och återhämtning', 'Mobilitet, FIFA 11+ och lätt aerob flush.'))
  days[3] = withWorkout(4, speedPowerWorkout(input.position))
  days[4] = withWorkout(5, tacticalWorkout('Small-sided games', 'Fotbollsspecifik kondition, riktningsförändringar och bolltempo.'))
  days[5] = withWorkout(6, strengthWorkout('Unilateral styrka/prehab', input.profile.primaryStrengthFocus, input.prevention, 'MODERATE'))

  return trimToSessions(days, input.sessionsPerWeek, [1, 2, 4, 5, 6, 3])
}

function withWorkout(dayNumber: number, workout: CreateWorkoutDTO): CreateTrainingDayDTO {
  return { dayNumber, notes: '', workouts: [workout] }
}

function trimToSessions(days: CreateTrainingDayDTO[], sessionsPerWeek: number, priorityDays: number[]): CreateTrainingDayDTO[] {
  const keep = new Set(priorityDays.slice(0, sessionsPerWeek))
  return days.map((day) => keep.has(day.dayNumber) ? day : { ...day, notes: 'Vilodag', workouts: [] })
}

function footballConditioningWorkout(position: FootballPosition, goal: string, factor: number): CreateWorkoutDTO {
  const duration = Math.round((goal === 'speed-power' ? 45 : 55) * factor)
  const focus = position === 'forward'
    ? 'Repeated sprint ability och acceleration'
    : position === 'midfielder'
      ? 'Högintensiva intervaller och snabb återhämtning'
      : position === 'goalkeeper'
        ? 'Korta explosiva förflyttningar och reaktion'
        : 'Acceleration/deceleration och duellförberedelse'

  return {
    type: 'RUNNING',
    name: 'Fotbollsspecifik kondition',
    intensity: 'INTERVAL',
    duration,
    instructions: `${focus}. Håll total volym kontrollerad och avsluta med nedvarvning.`,
    segments: [
      { order: 1, type: 'warmup', duration: 12, zone: 1, description: 'FIFA 11+ och dynamisk uppvärmning' },
      { order: 2, type: 'interval', duration: Math.max(15, duration - 22), zone: 4, description: focus },
      { order: 3, type: 'cooldown', duration: 10, zone: 1, description: 'Lätt jogg och rörlighet' },
    ],
  }
}

function strengthWorkout(
  name: string,
  focusAreas: string[],
  prevention: ReturnType<typeof getInjuryPreventionExercises>,
  intensity: WorkoutIntensity
): CreateWorkoutDTO {
  const mainFocus = focusAreas.slice(0, 3).join(', ')
  const prehab = prevention.slice(0, 3).map((exercise) => `${exercise.name} (${exercise.sets || ''}x${exercise.reps || exercise.frequency || ''})`).join(', ')
  return {
    type: 'STRENGTH',
    name,
    intensity,
    duration: 45,
    instructions: `Fokus: ${mainFocus}. Skadeprevention: ${prehab}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: 'Dynamisk uppvärmning och aktivering' },
      { order: 2, type: 'exercise', duration: 25, description: mainFocus || 'Helkroppsstyrka' },
      { order: 3, type: 'exercise', duration: 10, description: prehab || 'FIFA 11+ prevention' },
    ],
  }
}

function speedPowerWorkout(position: FootballPosition): CreateWorkoutDTO {
  return {
    type: 'PLYOMETRIC',
    name: 'Snabbhet och power',
    intensity: 'INTERVAL',
    duration: position === 'goalkeeper' ? 35 : 45,
    instructions: position === 'goalkeeper'
      ? 'Lateral explosivitet, reaktion och hoppkraft med långa vilor.'
      : 'Acceleration, maxfartsexponering och hoppkraft med full återhämtning.',
    segments: [
      { order: 1, type: 'warmup', duration: 12, description: 'Löpdrills, rörlighet och progressiva stegringar' },
      { order: 2, type: 'work', duration: 23, description: 'Korta sprintar/hopp, full vila mellan reps' },
      { order: 3, type: 'cooldown', duration: 10, description: 'Nedvarvning och rörlighet' },
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

function matchWorkout(name: string, position: FootballPosition): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'MAX',
    duration: position === 'goalkeeper' ? 90 : 75,
    instructions: 'Matchdag. Logga minuter, RPE, eventuell GPS-belastning och smärta efter match.',
    segments: [{ order: 1, type: 'work', duration: 90, description: 'Match' }],
  }
}

function normalizeFootballSettings(value: unknown): FootballSettings {
  return isRecord(value) ? value as FootballSettings : {}
}

function inferSeasonPhase(goal: string): SeasonPhase {
  if (goal === 'off-season-build') return 'off_season'
  if (goal === 'pre-season-readiness') return 'pre_season'
  if (goal === 'in-season-maintenance') return 'in_season'
  return 'in_season'
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

function footballGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    'off-season-build': 'Fotboll off-season',
    'pre-season-readiness': 'Fotboll försäsong',
    'in-season-maintenance': 'Fotboll säsongsunderhåll',
    'speed-power': 'Fotboll snabbhet & power',
    'injury-prevention': 'Fotboll skadeprevention',
    'return-to-play': 'Fotboll return to play',
    custom: 'Fotbollsprogram',
  }
  return labels[goal] || 'Fotbollsprogram'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
