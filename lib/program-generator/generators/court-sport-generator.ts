import type { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO } from '@/types'
import { getProgramEndDate, getProgramStartDate } from '../date-utils'
import type { SportProgramParams } from '../sport-router/types'
import {
  BASKETBALL_POSITION_PROFILES,
  getPositionRecommendations as getBasketballPositionRecommendations,
  getSeasonPhaseTraining as getBasketballSeasonPhaseTraining,
  type BasketballPosition,
  type SeasonPhase as BasketballSeasonPhase,
} from '@/lib/training-engine/basketball'
import {
  HANDBALL_POSITION_PROFILES,
  getPositionRecommendations as getHandballPositionRecommendations,
  getSeasonPhaseTraining as getHandballSeasonPhaseTraining,
  type HandballPosition,
  type SeasonPhase as HandballSeasonPhase,
} from '@/lib/training-engine/handball'
import {
  FLOORBALL_POSITION_PROFILES,
  getPositionRecommendations as getFloorballPositionRecommendations,
  getSeasonPhaseTraining as getFloorballSeasonPhaseTraining,
  type FloorballPosition,
  type SeasonPhase as FloorballSeasonPhase,
} from '@/lib/training-engine/floorball'
import {
  VOLLEYBALL_POSITION_PROFILES,
  getPositionRecommendations as getVolleyballPositionRecommendations,
  getSeasonPhaseTraining as getVolleyballSeasonPhaseTraining,
  type VolleyballPosition,
  type SeasonPhase as VolleyballSeasonPhase,
} from '@/lib/training-engine/volleyball'
import {
  TENNIS_PLAYSTYLE_PROFILES,
  getPlayStyleRecommendations as getTennisPlayStyleRecommendations,
  getSeasonPhaseTraining as getTennisSeasonPhaseTraining,
  type TennisPlayStyle,
  type SeasonPhase as TennisSeasonPhase,
} from '@/lib/training-engine/tennis'
import {
  PADEL_POSITION_PROFILES,
  getPositionRecommendations as getPadelPositionRecommendations,
  getSeasonPhaseTraining as getPadelSeasonPhaseTraining,
  type PadelPosition,
  type SeasonPhase as PadelSeasonPhase,
} from '@/lib/training-engine/padel'

type CourtSport =
  | 'TEAM_BASKETBALL'
  | 'TEAM_HANDBALL'
  | 'TEAM_FLOORBALL'
  | 'TEAM_VOLLEYBALL'
  | 'TENNIS'
  | 'PADEL'

type CourtSeasonPhase = BasketballSeasonPhase | HandballSeasonPhase | FloorballSeasonPhase | VolleyballSeasonPhase | TennisSeasonPhase | PadelSeasonPhase

type CourtProfile = {
  displayName: string
  description: string
  keyPhysicalAttributes: string[]
  primaryMovementPatterns?: string[]
  commonInjuries: string[]
}

type CourtExerciseRecommendation = {
  name: string
  category: string
  setsReps: string
  notes: string
  priority?: string
}

type CourtPhaseTraining = {
  focus: string[]
  strengthEmphasis: string
  conditioningEmphasis: string
  weeklyStructure: {
    strengthSessions?: number
    conditioningSessions?: number
    technicalSessions?: number
    matchPlay?: number
    restDays?: number
  }
}

type CourtSportConfig = {
  sport: CourtSport
  label: string
  fallbackPhase: CourtSeasonPhase
  peakPhase: CourtSeasonPhase
  defaultProfileKey: string
  profileSettingKey: 'position' | 'playStyle'
  settingsKey: string
  getProfile: (key: string) => CourtProfile
  getRecommendations: (key: string) => CourtExerciseRecommendation[]
  getPhaseTraining: (phase: CourtSeasonPhase) => CourtPhaseTraining
  technicalLabel: string
  matchLabel: string
  conditioningLabel: string
  powerLabel: string
}

const DAY_MS = 24 * 60 * 60 * 1000

const CONFIGS: Record<CourtSport, CourtSportConfig> = {
  TEAM_BASKETBALL: {
    sport: 'TEAM_BASKETBALL',
    label: 'Basket',
    fallbackPhase: 'in_season',
    peakPhase: 'playoffs',
    defaultProfileKey: 'small_forward',
    profileSettingKey: 'position',
    settingsKey: 'basketballSettings',
    getProfile: (key) => BASKETBALL_POSITION_PROFILES[(key as BasketballPosition)] || BASKETBALL_POSITION_PROFILES.small_forward,
    getRecommendations: (key) => getBasketballPositionRecommendations((key as BasketballPosition) in BASKETBALL_POSITION_PROFILES ? key as BasketballPosition : 'small_forward'),
    getPhaseTraining: (phase) => getBasketballSeasonPhaseTraining(phase as BasketballSeasonPhase),
    technicalLabel: 'Basket skills och beslutsfattande',
    matchLabel: 'Match / game-speed scrimmage',
    conditioningLabel: 'Repeated sprint och court conditioning',
    powerLabel: 'Hoppkraft och first-step explosivitet',
  },
  TEAM_HANDBALL: {
    sport: 'TEAM_HANDBALL',
    label: 'Handboll',
    fallbackPhase: 'in_season',
    peakPhase: 'playoffs',
    defaultProfileKey: 'back',
    profileSettingKey: 'position',
    settingsKey: 'handballSettings',
    getProfile: (key) => HANDBALL_POSITION_PROFILES[(key as HandballPosition)] || HANDBALL_POSITION_PROFILES.back,
    getRecommendations: (key) => getHandballPositionRecommendations((key as HandballPosition) in HANDBALL_POSITION_PROFILES ? key as HandballPosition : 'back'),
    getPhaseTraining: (phase) => getHandballSeasonPhaseTraining(phase as HandballSeasonPhase),
    technicalLabel: 'Handbollsteknik, kast och genombrott',
    matchLabel: 'Match / speltempo',
    conditioningLabel: 'Repeated sprint och riktningsförändringar',
    powerLabel: 'Kastkraft, hopp och kontaktstyrka',
  },
  TEAM_FLOORBALL: {
    sport: 'TEAM_FLOORBALL',
    label: 'Innebandy',
    fallbackPhase: 'in_season',
    peakPhase: 'playoffs',
    defaultProfileKey: 'forward',
    profileSettingKey: 'position',
    settingsKey: 'floorballSettings',
    getProfile: (key) => FLOORBALL_POSITION_PROFILES[(key as FloorballPosition)] || FLOORBALL_POSITION_PROFILES.forward,
    getRecommendations: (key) => getFloorballPositionRecommendations((key as FloorballPosition) in FLOORBALL_POSITION_PROFILES ? key as FloorballPosition : 'forward'),
    getPhaseTraining: (phase) => getFloorballSeasonPhaseTraining(phase as FloorballSeasonPhase),
    technicalLabel: 'Klubbteknik, avslut och spelvändningar',
    matchLabel: 'Match / byteslikt spel',
    conditioningLabel: 'Bytesintervaller och snabb återhämtning',
    powerLabel: 'Acceleration, låg position och riktningsförändring',
  },
  TEAM_VOLLEYBALL: {
    sport: 'TEAM_VOLLEYBALL',
    label: 'Volleyboll',
    fallbackPhase: 'in_season',
    peakPhase: 'playoffs',
    defaultProfileKey: 'outside_hitter',
    profileSettingKey: 'position',
    settingsKey: 'volleyballSettings',
    getProfile: (key) => VOLLEYBALL_POSITION_PROFILES[(key as VolleyballPosition)] || VOLLEYBALL_POSITION_PROFILES.outside_hitter,
    getRecommendations: (key) => getVolleyballPositionRecommendations((key as VolleyballPosition) in VOLLEYBALL_POSITION_PROFILES ? key as VolleyballPosition : 'outside_hitter'),
    getPhaseTraining: (phase) => getVolleyballSeasonPhaseTraining(phase as VolleyballSeasonPhase),
    technicalLabel: 'Volleybollteknik, approach och positionering',
    matchLabel: 'Match / setspel',
    conditioningLabel: 'Kort reaktion, landning och repeated jump tolerance',
    powerLabel: 'Approach jumps, blockhopp och axelkraft',
  },
  TENNIS: {
    sport: 'TENNIS',
    label: 'Tennis',
    fallbackPhase: 'in_season',
    peakPhase: 'tournament',
    defaultProfileKey: 'all_court',
    profileSettingKey: 'playStyle',
    settingsKey: 'tennisSettings',
    getProfile: (key) => TENNIS_PLAYSTYLE_PROFILES[(key as TennisPlayStyle)] || TENNIS_PLAYSTYLE_PROFILES.all_court,
    getRecommendations: (key) => getTennisPlayStyleRecommendations((key as TennisPlayStyle) in TENNIS_PLAYSTYLE_PROFILES ? key as TennisPlayStyle : 'all_court'),
    getPhaseTraining: (phase) => getTennisSeasonPhaseTraining(phase as TennisSeasonPhase),
    technicalLabel: 'Tennisteknik, fotarbete och slagmönster',
    matchLabel: 'Matchplay / poängspel',
    conditioningLabel: 'Tennisintervaller och lateral uthållighet',
    powerLabel: 'Rotationskraft, serve och första steg',
  },
  PADEL: {
    sport: 'PADEL',
    label: 'Padel',
    fallbackPhase: 'in_season',
    peakPhase: 'tournament',
    defaultProfileKey: 'all_court',
    profileSettingKey: 'position',
    settingsKey: 'padelSettings',
    getProfile: (key) => PADEL_POSITION_PROFILES[(key as PadelPosition)] || PADEL_POSITION_PROFILES.all_court,
    getRecommendations: (key) => getPadelPositionRecommendations((key as PadelPosition) in PADEL_POSITION_PROFILES ? key as PadelPosition : 'all_court'),
    getPhaseTraining: (phase) => getPadelSeasonPhaseTraining(phase as PadelSeasonPhase),
    technicalLabel: 'Padelteknik, väggspel och positionering',
    matchLabel: 'Matchplay / taktiskt poängspel',
    conditioningLabel: 'Kort acceleration och sidledsarbete',
    powerLabel: 'Rotationskraft, smash och reaktion',
  },
}

export async function generateCourtSportProgram(
  params: SportProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  if (!isCourtSport(params.sport)) {
    throw new Error(`Unsupported court sport: ${params.sport}`)
  }

  const config = CONFIGS[params.sport]
  const settings = getSettings(params, config.settingsKey)
  const profileKey = getProfileKey(settings, config.profileSettingKey, config.defaultProfileKey)
  const phase = getPhase(settings, params.goal, config)
  const profile = config.getProfile(profileKey)
  const phaseTraining = config.getPhaseTraining(phase)
  const recommendations = config.getRecommendations(profileKey)
  const sessionsPerWeek = Math.min(7, Math.max(2, getNumber(settings.sessionsPerWeek) || params.sessionsPerWeek || 4))
  const matchesPerWeek = Math.max(0, getNumber(settings.matchesPerWeek) ?? getNumber(settings.matchesThisWeek) ?? inferMatchesPerWeek(phase, params.goal))

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  const weeks = Array.from({ length: params.durationWeeks }).map((_, index) => {
    const weekNumber = index + 1
    const intensityFactor = getWeekLoadFactor(weekNumber, params.durationWeeks, phase, matchesPerWeek)
    const days = buildCourtSportWeek({
      config,
      profile,
      phase,
      phaseTraining,
      recommendations,
      sessionsPerWeek,
      matchesPerWeek,
      intensityFactor,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * DAY_MS),
      phase: getProgramPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: `${phaseTraining.focus[0] || config.label} - ${profile.displayName}`,
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: `${config.label} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || [
      profile.description,
      `Programmet använder ${profile.displayName}, ${phaseLabel(phase)} och sportens krav på ${profile.keyPhysicalAttributes.slice(0, 3).join(', ')}.`,
    ].join(' '),
    planningMetadata: {
      version: 1,
      source: 'court-sport-generator',
      sport: config.sport,
      profileKey,
      profileName: profile.displayName,
      seasonPhase: phase,
      sessionsPerWeek,
      matchesPerWeek,
      focus: phaseTraining.focus.slice(0, 4),
      prevention: recommendations.slice(0, 4).map((item) => item.name),
    },
    weeks,
  }
}

function buildCourtSportWeek(input: {
  config: CourtSportConfig
  profile: CourtProfile
  phase: CourtSeasonPhase
  phaseTraining: CourtPhaseTraining
  recommendations: CourtExerciseRecommendation[]
  sessionsPerWeek: number
  matchesPerWeek: number
  intensityFactor: number
}): CreateTrainingDayDTO[] {
  const hasMatch = input.matchesPerWeek > 0 &&
    (input.phase === 'in_season' || input.phase === 'playoffs' || input.phase === 'tournament')
  const planned = hasMatch
    ? [
        { day: 1, workout: recoveryWorkout(input.config, input.recommendations) },
        { day: 2, workout: strengthPrehabWorkout(input.config, input.phaseTraining, input.recommendations, input.intensityFactor) },
        { day: 3, workout: conditioningWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor) },
        { day: 4, workout: technicalWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor) },
        { day: 5, workout: activationWorkout(input.config, input.profile) },
        { day: 6, workout: matchWorkout(input.config, input.profile, input.matchesPerWeek) },
        { day: 7, workout: input.matchesPerWeek >= 2 ? matchWorkout(input.config, input.profile, input.matchesPerWeek, 'Match 2') : recoveryWorkout(input.config, input.recommendations) },
      ]
    : [
        { day: 1, workout: strengthPrehabWorkout(input.config, input.phaseTraining, input.recommendations, input.intensityFactor) },
        { day: 2, workout: conditioningWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor) },
        { day: 3, workout: recoveryWorkout(input.config, input.recommendations) },
        { day: 4, workout: powerWorkout(input.config, input.profile, input.intensityFactor) },
        { day: 5, workout: technicalWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor) },
        { day: 6, workout: strengthPrehabWorkout(input.config, input.phaseTraining, input.recommendations.slice(2), input.intensityFactor * 0.9, 'Unilateral styrka och robusthet') },
        { day: 7, workout: conditioningWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor * 0.85, 'Aerob bas och rörelsekvalitet') },
      ]

  const priorityDays = hasMatch
    ? [6, ...(input.matchesPerWeek >= 2 ? [7] : []), 2, 3, 4, 5, 1]
    : [1, 2, 4, 5, 6, 3, 7]
  const keep = new Map(priorityDays.slice(0, input.sessionsPerWeek).map((day) => {
    const item = planned.find((candidate) => candidate.day === day)
    return [day, item?.workout]
  }))

  return Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: keep.get(index + 1) ? '' : 'Vilodag',
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function strengthPrehabWorkout(
  config: CourtSportConfig,
  phaseTraining: CourtPhaseTraining,
  recommendations: CourtExerciseRecommendation[],
  factor: number,
  name = 'Styrka och skadeprevention'
): CreateWorkoutDTO {
  const exercises = recommendations.length > 0
    ? recommendations.slice(0, 4)
    : [
        { name: 'Split squat', category: 'strength', setsReps: '3x8/ben', notes: 'Kontrollerad knälinje', priority: 'essential' },
        { name: 'Lateral bounds', category: 'power', setsReps: '3x6/sida', notes: 'Stabil landning', priority: 'essential' },
        { name: 'Pallof press', category: 'core', setsReps: '3x10/sida', notes: 'Antirotation', priority: 'recommended' },
      ]

  return {
    type: 'STRENGTH',
    name,
    intensity: factor < 0.85 ? 'EASY' : 'MODERATE',
    duration: Math.round(45 * factor),
    instructions: `${phaseTraining.strengthEmphasis}. ${exercises.map((item) => `${item.name} (${item.setsReps})`).join(', ')}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 8, description: `${config.label}-specifik uppvärmning och rörlighet` },
      ...exercises.map((item, index) => ({
        order: index + 2,
        type: 'exercise' as const,
        duration: 8,
        repsCount: item.setsReps,
        description: `${item.name}: ${item.notes}`,
      })),
      { order: exercises.length + 2, type: 'cooldown' as const, duration: 5, description: 'Lätt rörlighet och återställning' },
    ],
  }
}

function conditioningWorkout(
  config: CourtSportConfig,
  profile: CourtProfile,
  phaseTraining: CourtPhaseTraining,
  factor: number,
  name = config.conditioningLabel
): CreateWorkoutDTO {
  const movement = profile.primaryMovementPatterns?.slice(0, 3).join(', ') || profile.keyPhysicalAttributes.slice(0, 3).join(', ')
  return {
    type: 'RUNNING',
    name,
    intensity: factor < 0.85 ? 'MODERATE' : 'INTERVAL',
    duration: Math.round(50 * factor),
    instructions: `${phaseTraining.conditioningEmphasis}. Rörelsemönster: ${movement}. Håll kvalitet före maximal volym.`,
    segments: [
      { order: 1, type: 'warmup', duration: 12, description: 'Dynamisk uppvärmning, accelerationer och bromsteknik' },
      { order: 2, type: 'interval', duration: Math.max(15, Math.round(28 * factor)), zone: 4, description: config.conditioningLabel },
      { order: 3, type: 'cooldown', duration: 10, description: 'Nedvarvning och rörlighet' },
    ],
  }
}

function technicalWorkout(
  config: CourtSportConfig,
  profile: CourtProfile,
  phaseTraining: CourtPhaseTraining,
  factor: number
): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name: config.technicalLabel,
    intensity: factor < 0.85 ? 'EASY' : 'MODERATE',
    duration: Math.round(55 * factor),
    instructions: `${config.technicalLabel}. Koppla teknik till ${phaseTraining.focus.slice(0, 3).join(', ')} och rollen ${profile.displayName}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: 'Koordination, fotarbete och lågintensiv bollkontakt' },
      { order: 2, type: 'work', duration: Math.max(25, Math.round(35 * factor)), description: `${config.technicalLabel} med beslut, tempo och positionskrav` },
      { order: 3, type: 'cooldown', duration: 8, description: 'Lågintensiv teknik och rörlighet' },
    ],
  }
}

function powerWorkout(config: CourtSportConfig, profile: CourtProfile, factor: number): CreateWorkoutDTO {
  return {
    type: 'PLYOMETRIC',
    name: config.powerLabel,
    intensity: 'INTERVAL',
    duration: Math.round(45 * factor),
    instructions: `${config.powerLabel}. Profilkrav: ${profile.keyPhysicalAttributes.slice(0, 4).join(', ')}. Full vila mellan explosiva repetitioner.`,
    segments: [
      { order: 1, type: 'warmup', duration: 12, description: 'Landningsmekanik, bålaktivering och progressiva hopp/starter' },
      { order: 2, type: 'work', duration: Math.max(18, Math.round(23 * factor)), description: 'Korta explosiva block med teknisk kvalitet' },
      { order: 3, type: 'cooldown', duration: 8, description: 'Nedvarvning, höft/fotled/axel-rörlighet' },
    ],
  }
}

function activationWorkout(config: CourtSportConfig, profile: CourtProfile): CreateWorkoutDTO {
  return {
    type: 'RECOVERY',
    name: 'Matchförberedande aktivering',
    intensity: 'EASY',
    duration: 35,
    instructions: `Kort aktivering för ${profile.displayName}: rörlighet, reaktioner, lätt teknik och 3-5 korta accelerationer.`,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: `${config.label}-specifik rörlighet` },
      { order: 2, type: 'work', duration: 18, description: 'Lätta reaktioner, bollkontakt och accelerationer' },
      { order: 3, type: 'cooldown', duration: 7, description: 'Andning och mental förberedelse' },
    ],
  }
}

function matchWorkout(config: CourtSportConfig, profile: CourtProfile, matchesPerWeek: number, name = config.matchLabel): CreateWorkoutDTO {
  return {
    type: 'OTHER',
    name,
    intensity: 'INTERVAL',
    duration: matchesPerWeek >= 2 ? 55 : 70,
    instructions: `${config.matchLabel} för ${profile.displayName}. Logga RPE, minuter och eventuell smärta efteråt.`,
    segments: [
      { order: 1, type: 'warmup', duration: 15, description: 'Matchuppvärmning och positionsspecifik aktivering' },
      { order: 2, type: 'work', duration: matchesPerWeek >= 2 ? 35 : 50, description: config.matchLabel },
      { order: 3, type: 'cooldown', duration: 8, description: 'Nedvarvning, vätska och snabb återhämtning' },
    ],
  }
}

function recoveryWorkout(config: CourtSportConfig, recommendations: CourtExerciseRecommendation[]): CreateWorkoutDTO {
  const prevention = recommendations.slice(0, 3).map((item) => item.name).join(', ') || 'mobilitet, bål och lätt aktivering'
  return {
    type: 'RECOVERY',
    name: 'Återhämtning och prehab',
    intensity: 'RECOVERY',
    duration: 35,
    instructions: `Lätt återhämtning för ${config.label}. Prioritera ${prevention}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 8, description: 'Lätt cykel/jogg eller rörlighetsflöde' },
      { order: 2, type: 'exercise', duration: 20, description: prevention },
      { order: 3, type: 'cooldown', duration: 7, description: 'Andning och avspänning' },
    ],
  }
}

function getSettings(params: SportProgramParams, settingsKey: string): Record<string, unknown> {
  const record = params as unknown as Record<string, unknown>
  const settings = record[settingsKey]
  return isRecord(settings) ? settings : {}
}

function getProfileKey(settings: Record<string, unknown>, key: string, fallback: string): string {
  const value = settings[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function getPhase(settings: Record<string, unknown>, goal: string, config: CourtSportConfig): CourtSeasonPhase {
  const explicitPhase = settings.seasonPhase
  if (typeof explicitPhase === 'string' && isAllowedPhase(explicitPhase, config)) {
    return explicitPhase
  }
  if (goal === 'off-season-build') return 'off_season'
  if (goal === 'pre-season-readiness') return 'pre_season'
  if (goal === 'tournament' || goal === 'playoffs') return config.peakPhase
  if (goal === 'speed-power') return 'pre_season'
  return config.fallbackPhase
}

function isAllowedPhase(phase: string, config: CourtSportConfig): phase is CourtSeasonPhase {
  return phase === 'off_season' ||
    phase === 'pre_season' ||
    phase === 'in_season' ||
    phase === config.peakPhase
}

function inferMatchesPerWeek(phase: CourtSeasonPhase, goal: string): number {
  if (phase === 'off_season' || goal === 'off-season-build') return 0
  if (phase === 'playoffs' || phase === 'tournament') return 2
  return 1
}

function getWeekLoadFactor(weekNumber: number, totalWeeks: number, phase: CourtSeasonPhase, matchesPerWeek: number): number {
  let factor = 0.9 + (weekNumber / totalWeeks) * 0.18
  if (weekNumber % 4 === 0 && weekNumber < totalWeeks) factor *= 0.75
  if (phase === 'in_season') factor *= 0.9
  if (phase === 'playoffs' || phase === 'tournament') factor *= 0.75
  if (matchesPerWeek >= 2) factor *= 0.85
  if (weekNumber === totalWeeks) factor *= 0.8
  return Math.max(0.55, Math.min(1.1, factor))
}

function getProgramPhase(weekNumber: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 'TAPER'
  if (progress > 0.72) return 'PEAK'
  if (progress > 0.35) return 'BUILD'
  return 'BASE'
}

function phaseLabel(phase: CourtSeasonPhase): string {
  const labels: Record<string, string> = {
    off_season: 'off-season',
    pre_season: 'försäsong',
    in_season: 'säsong',
    playoffs: 'slutspel',
    tournament: 'turnering',
  }
  return labels[phase] || phase
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isCourtSport(sport: string): sport is CourtSport {
  return sport in CONFIGS
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
