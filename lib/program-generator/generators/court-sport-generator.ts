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
type AppLocale = 'en' | 'sv'

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

const ENGLISH_SPORT_LABELS: Record<CourtSport, string> = {
  TEAM_BASKETBALL: 'Basketball',
  TEAM_HANDBALL: 'Handball',
  TEAM_FLOORBALL: 'Floorball',
  TEAM_VOLLEYBALL: 'Volleyball',
  TENNIS: 'Tennis',
  PADEL: 'Padel',
}

const ENGLISH_SESSION_LABELS: Record<CourtSport, Pick<CourtSportConfig, 'technicalLabel' | 'matchLabel' | 'conditioningLabel' | 'powerLabel'>> = {
  TEAM_BASKETBALL: {
    technicalLabel: 'Basketball skills and decision-making',
    matchLabel: 'Match / game-speed scrimmage',
    conditioningLabel: 'Repeated sprint and court conditioning',
    powerLabel: 'Jump power and first-step explosiveness',
  },
  TEAM_HANDBALL: {
    technicalLabel: 'Handball technique, throwing, and attacking',
    matchLabel: 'Match / game tempo',
    conditioningLabel: 'Repeated sprint and change-of-direction work',
    powerLabel: 'Throwing power, jumping, and contact strength',
  },
  TEAM_FLOORBALL: {
    technicalLabel: 'Stick skills, finishing, and transitions',
    matchLabel: 'Match / shift-based play',
    conditioningLabel: 'Shift intervals and fast recovery',
    powerLabel: 'Acceleration, low position, and change of direction',
  },
  TEAM_VOLLEYBALL: {
    technicalLabel: 'Volleyball technique, approach, and positioning',
    matchLabel: 'Match / set play',
    conditioningLabel: 'Short reaction, landing, and repeated-jump tolerance',
    powerLabel: 'Approach jumps, block jumps, and shoulder power',
  },
  TENNIS: {
    technicalLabel: 'Tennis technique, footwork, and shot patterns',
    matchLabel: 'Match play / point play',
    conditioningLabel: 'Tennis intervals and lateral endurance',
    powerLabel: 'Rotational power, serve, and first step',
  },
  PADEL: {
    technicalLabel: 'Padel technique, wall play, and positioning',
    matchLabel: 'Match play / tactical point play',
    conditioningLabel: 'Short acceleration and lateral work',
    powerLabel: 'Rotational power, smash, and reaction',
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
  const locale = params.locale === 'sv' ? 'sv' : 'en'
  const settings = getSettings(params, config.settingsKey)
  const profileKey = getProfileKey(settings, config.profileSettingKey, config.defaultProfileKey)
  const phase = getPhase(settings, params.goal, config)
  const profile = config.getProfile(profileKey)
  const profileLabel = getProfileLabel(profileKey, profile, locale)
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
      locale,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * DAY_MS),
      phase: getProgramPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: `${getPrimaryFocus(phase, locale)} - ${profileLabel}`,
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: `${getSportLabel(config, locale)} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || [
      getProfileDescription(config, profile, profileLabel, locale),
      t(
        locale,
        `The program is built for ${profileLabel}, ${phaseLabel(phase, locale)}, and the sport's demands for ${getSportDemandSummary(profile, locale)}.`,
        `Programmet använder ${profile.displayName}, ${phaseLabel(phase, locale)} och sportens krav på ${profile.keyPhysicalAttributes.slice(0, 3).join(', ')}.`
      ),
    ].join(' '),
    planningMetadata: {
      version: 1,
      source: 'court-sport-generator',
      sport: config.sport,
      profileKey,
      profileName: profileLabel,
      seasonPhase: phase,
      sessionsPerWeek,
      matchesPerWeek,
      focus: getPhaseFocus(phase, locale),
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
  locale: AppLocale
}): CreateTrainingDayDTO[] {
  const hasMatch = input.matchesPerWeek > 0 &&
    (input.phase === 'in_season' || input.phase === 'playoffs' || input.phase === 'tournament')
  const planned = hasMatch
    ? [
        { day: 1, workout: recoveryWorkout(input.config, input.recommendations, input.locale) },
        { day: 2, workout: strengthPrehabWorkout(input.config, input.phaseTraining, input.recommendations, input.intensityFactor, undefined, input.locale) },
        { day: 3, workout: conditioningWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor, undefined, input.locale) },
        { day: 4, workout: technicalWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor, input.locale) },
        { day: 5, workout: activationWorkout(input.config, input.profile, input.locale) },
        { day: 6, workout: matchWorkout(input.config, input.profile, input.matchesPerWeek, undefined, input.locale) },
        { day: 7, workout: input.matchesPerWeek >= 2 ? matchWorkout(input.config, input.profile, input.matchesPerWeek, 'Match 2', input.locale) : recoveryWorkout(input.config, input.recommendations, input.locale) },
      ]
    : [
        { day: 1, workout: strengthPrehabWorkout(input.config, input.phaseTraining, input.recommendations, input.intensityFactor, undefined, input.locale) },
        { day: 2, workout: conditioningWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor, undefined, input.locale) },
        { day: 3, workout: recoveryWorkout(input.config, input.recommendations, input.locale) },
        { day: 4, workout: powerWorkout(input.config, input.profile, input.intensityFactor, input.locale) },
        { day: 5, workout: technicalWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor, input.locale) },
        { day: 6, workout: strengthPrehabWorkout(input.config, input.phaseTraining, input.recommendations.slice(2), input.intensityFactor * 0.9, t(input.locale, 'Unilateral strength and robustness', 'Unilateral styrka och robusthet'), input.locale) },
        { day: 7, workout: conditioningWorkout(input.config, input.profile, input.phaseTraining, input.intensityFactor * 0.85, t(input.locale, 'Aerobic base and movement quality', 'Aerob bas och rörelsekvalitet'), input.locale) },
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
    notes: keep.get(index + 1) ? '' : t(input.locale, 'Rest day', 'Vilodag'),
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function strengthPrehabWorkout(
  config: CourtSportConfig,
  phaseTraining: CourtPhaseTraining,
  recommendations: CourtExerciseRecommendation[],
  factor: number,
  name?: string,
  locale: AppLocale = 'en'
): CreateWorkoutDTO {
  const workoutName = name || t(locale, 'Strength and injury prevention', 'Styrka och skadeprevention')
  const exercises = recommendations.length > 0
    ? recommendations.slice(0, 4)
    : locale === 'sv'
      ? [
        { name: 'Split squat', category: 'strength', setsReps: '3x8/ben', notes: 'Kontrollerad knälinje', priority: 'essential' },
        { name: 'Lateral bounds', category: 'power', setsReps: '3x6/sida', notes: 'Stabil landning', priority: 'essential' },
        { name: 'Pallof press', category: 'core', setsReps: '3x10/sida', notes: 'Antirotation', priority: 'recommended' },
      ]
      : [
        { name: 'Split squat', category: 'strength', setsReps: '3x8/leg', notes: 'Controlled knee line', priority: 'essential' },
        { name: 'Lateral bounds', category: 'power', setsReps: '3x6/side', notes: 'Stable landing', priority: 'essential' },
        { name: 'Pallof press', category: 'core', setsReps: '3x10/side', notes: 'Anti-rotation', priority: 'recommended' },
      ]

  return {
    type: 'STRENGTH',
    name: workoutName,
    intensity: factor < 0.85 ? 'EASY' : 'MODERATE',
    duration: Math.round(45 * factor),
    instructions: `${getStrengthEmphasis(locale, phaseTraining)}. ${exercises.map((item) => `${item.name} (${item.setsReps})`).join(', ')}.`,
    segments: [
      { order: 1, type: 'warmup', duration: 8, description: t(locale, `${getSportLabel(config, locale)}-specific warm-up and mobility`, `${config.label}-specifik uppvärmning och rörlighet`) },
      ...exercises.map((item, index) => ({
        order: index + 2,
        type: 'exercise' as const,
        duration: 8,
        repsCount: item.setsReps,
        description: `${item.name}: ${locale === 'sv' ? item.notes : 'Controlled reps with clean mechanics'}`,
      })),
      { order: exercises.length + 2, type: 'cooldown' as const, duration: 5, description: t(locale, 'Light mobility and reset', 'Lätt rörlighet och återställning') },
    ],
  }
}

function conditioningWorkout(
  config: CourtSportConfig,
  profile: CourtProfile,
  phaseTraining: CourtPhaseTraining,
  factor: number,
  name?: string,
  locale: AppLocale = 'en'
): CreateWorkoutDTO {
  const workoutName = name || getConditioningLabel(config, locale)
  const movement = getSportDemandSummary(profile, locale)
  return {
    type: 'RUNNING',
    name: workoutName,
    intensity: factor < 0.85 ? 'MODERATE' : 'INTERVAL',
    duration: Math.round(50 * factor),
    instructions: `${getConditioningEmphasis(locale, phaseTraining)}. ${t(locale, `Movement focus: ${movement}. Keep quality ahead of maximum volume.`, `Rörelsemönster: ${movement}. Håll kvalitet före maximal volym.`)}`,
    segments: [
      { order: 1, type: 'warmup', duration: 12, description: t(locale, 'Dynamic warm-up, accelerations, and braking mechanics', 'Dynamisk uppvärmning, accelerationer och bromsteknik') },
      { order: 2, type: 'interval', duration: Math.max(15, Math.round(28 * factor)), zone: 4, description: getConditioningLabel(config, locale) },
      { order: 3, type: 'cooldown', duration: 10, description: t(locale, 'Cool-down and mobility', 'Nedvarvning och rörlighet') },
    ],
  }
}

function technicalWorkout(
  config: CourtSportConfig,
  profile: CourtProfile,
  phaseTraining: CourtPhaseTraining,
  factor: number,
  locale: AppLocale = 'en'
): CreateWorkoutDTO {
  const technicalLabel = getTechnicalLabel(config, locale)
  return {
    type: 'OTHER',
    name: technicalLabel,
    intensity: factor < 0.85 ? 'EASY' : 'MODERATE',
    duration: Math.round(55 * factor),
    instructions: `${technicalLabel}. ${t(locale, `Connect technical work to ${getPrimaryFocusFromTraining(phaseTraining, locale)} and the ${getProfileLabel('', profile, locale)} role.`, `Koppla teknik till ${phaseTraining.focus.slice(0, 3).join(', ')} och rollen ${profile.displayName}.`)}`,
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: t(locale, 'Coordination, footwork, and low-intensity ball touches', 'Koordination, fotarbete och lågintensiv bollkontakt') },
      { order: 2, type: 'work', duration: Math.max(25, Math.round(35 * factor)), description: t(locale, `${technicalLabel} with decisions, tempo, and position demands`, `${config.technicalLabel} med beslut, tempo och positionskrav`) },
      { order: 3, type: 'cooldown', duration: 8, description: t(locale, 'Low-intensity technical work and mobility', 'Lågintensiv teknik och rörlighet') },
    ],
  }
}

function powerWorkout(config: CourtSportConfig, profile: CourtProfile, factor: number, locale: AppLocale = 'en'): CreateWorkoutDTO {
  const powerLabel = getPowerLabel(config, locale)
  return {
    type: 'PLYOMETRIC',
    name: powerLabel,
    intensity: 'INTERVAL',
    duration: Math.round(45 * factor),
    instructions: `${powerLabel}. ${t(locale, `Profile demands: ${getSportDemandSummary(profile, locale)}. Full recovery between explosive reps.`, `Profilkrav: ${profile.keyPhysicalAttributes.slice(0, 4).join(', ')}. Full vila mellan explosiva repetitioner.`)}`,
    segments: [
      { order: 1, type: 'warmup', duration: 12, description: t(locale, 'Landing mechanics, trunk activation, and progressive jumps/starts', 'Landningsmekanik, bålaktivering och progressiva hopp/starter') },
      { order: 2, type: 'work', duration: Math.max(18, Math.round(23 * factor)), description: t(locale, 'Short explosive blocks with technical quality', 'Korta explosiva block med teknisk kvalitet') },
      { order: 3, type: 'cooldown', duration: 8, description: t(locale, 'Cool-down, hip/ankle/shoulder mobility', 'Nedvarvning, höft/fotled/axel-rörlighet') },
    ],
  }
}

function activationWorkout(config: CourtSportConfig, profile: CourtProfile, locale: AppLocale = 'en'): CreateWorkoutDTO {
  return {
    type: 'RECOVERY',
    name: t(locale, 'Match-prep activation', 'Matchförberedande aktivering'),
    intensity: 'EASY',
    duration: 35,
    instructions: t(locale, `Short activation for ${getProfileLabel('', profile, locale)}: mobility, reactions, light technical work, and 3-5 short accelerations.`, `Kort aktivering för ${profile.displayName}: rörlighet, reaktioner, lätt teknik och 3-5 korta accelerationer.`),
    segments: [
      { order: 1, type: 'warmup', duration: 10, description: t(locale, `${getSportLabel(config, locale)}-specific mobility`, `${config.label}-specifik rörlighet`) },
      { order: 2, type: 'work', duration: 18, description: t(locale, 'Light reactions, ball touches, and accelerations', 'Lätta reaktioner, bollkontakt och accelerationer') },
      { order: 3, type: 'cooldown', duration: 7, description: t(locale, 'Breathing and mental preparation', 'Andning och mental förberedelse') },
    ],
  }
}

function matchWorkout(config: CourtSportConfig, profile: CourtProfile, matchesPerWeek: number, name?: string, locale: AppLocale = 'en'): CreateWorkoutDTO {
  const matchLabel = name || getMatchLabel(config, locale)
  return {
    type: 'OTHER',
    name: matchLabel,
    intensity: 'INTERVAL',
    duration: matchesPerWeek >= 2 ? 55 : 70,
    instructions: t(locale, `${matchLabel} for ${getProfileLabel('', profile, locale)}. Log RPE, minutes, and any pain afterward.`, `${config.matchLabel} för ${profile.displayName}. Logga RPE, minuter och eventuell smärta efteråt.`),
    segments: [
      { order: 1, type: 'warmup', duration: 15, description: t(locale, 'Match warm-up and position-specific activation', 'Matchuppvärmning och positionsspecifik aktivering') },
      { order: 2, type: 'work', duration: matchesPerWeek >= 2 ? 35 : 50, description: getMatchLabel(config, locale) },
      { order: 3, type: 'cooldown', duration: 8, description: t(locale, 'Cool-down, hydration, and quick recovery', 'Nedvarvning, vätska och snabb återhämtning') },
    ],
  }
}

function recoveryWorkout(config: CourtSportConfig, recommendations: CourtExerciseRecommendation[], locale: AppLocale = 'en'): CreateWorkoutDTO {
  const prevention = recommendations.slice(0, 3).map((item) => item.name).join(', ') || t(locale, 'mobility, trunk control, and light activation', 'mobilitet, bål och lätt aktivering')
  return {
    type: 'RECOVERY',
    name: t(locale, 'Recovery and prehab', 'Återhämtning och prehab'),
    intensity: 'RECOVERY',
    duration: 35,
    instructions: t(locale, `Light recovery for ${getSportLabel(config, locale)}. Prioritize ${prevention}.`, `Lätt återhämtning för ${config.label}. Prioritera ${prevention}.`),
    segments: [
      { order: 1, type: 'warmup', duration: 8, description: t(locale, 'Easy bike/jog or mobility flow', 'Lätt cykel/jogg eller rörlighetsflöde') },
      { order: 2, type: 'exercise', duration: 20, description: prevention },
      { order: 3, type: 'cooldown', duration: 7, description: t(locale, 'Breathing and relaxation', 'Andning och avspänning') },
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

function getSportLabel(config: CourtSportConfig, locale: AppLocale): string {
  return locale === 'sv' ? config.label : ENGLISH_SPORT_LABELS[config.sport]
}

function getTechnicalLabel(config: CourtSportConfig, locale: AppLocale): string {
  return locale === 'sv' ? config.technicalLabel : ENGLISH_SESSION_LABELS[config.sport].technicalLabel
}

function getMatchLabel(config: CourtSportConfig, locale: AppLocale): string {
  return locale === 'sv' ? config.matchLabel : ENGLISH_SESSION_LABELS[config.sport].matchLabel
}

function getConditioningLabel(config: CourtSportConfig, locale: AppLocale): string {
  return locale === 'sv' ? config.conditioningLabel : ENGLISH_SESSION_LABELS[config.sport].conditioningLabel
}

function getPowerLabel(config: CourtSportConfig, locale: AppLocale): string {
  return locale === 'sv' ? config.powerLabel : ENGLISH_SESSION_LABELS[config.sport].powerLabel
}

function getProfileLabel(profileKey: string, profile: CourtProfile, locale: AppLocale): string {
  if (locale === 'sv') return profile.displayName
  if (!profileKey) return 'selected profile'

  return profileKey
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getProfileDescription(
  config: CourtSportConfig,
  profile: CourtProfile,
  profileLabel: string,
  locale: AppLocale
): string {
  if (locale === 'sv') return profile.description

  return `${profileLabel} profile for ${getSportLabel(config, locale)} with emphasis on ${getSportDemandSummary(profile, locale)}.`
}

function getSportDemandSummary(profile: CourtProfile, locale: AppLocale): string {
  if (locale === 'sv') {
    return profile.primaryMovementPatterns?.slice(0, 3).join(', ') || profile.keyPhysicalAttributes.slice(0, 3).join(', ')
  }

  return 'speed, change of direction, power, and repeat-effort capacity'
}

function getStrengthEmphasis(locale: AppLocale, phaseTraining: CourtPhaseTraining): string {
  return locale === 'sv'
    ? phaseTraining.strengthEmphasis
    : 'Strength work focused on robust mechanics, power transfer, and injury resilience'
}

function getConditioningEmphasis(locale: AppLocale, phaseTraining: CourtPhaseTraining): string {
  return locale === 'sv'
    ? phaseTraining.conditioningEmphasis
    : 'Conditioning focused on sport-specific intervals, acceleration control, and repeat-effort quality'
}

function getPhaseFocus(phase: CourtSeasonPhase, locale: AppLocale): string[] {
  if (locale === 'sv') {
    const labels: Record<string, string[]> = {
      off_season: ['Maxstyrka', 'Aerob bas', 'Skadeförebyggande', 'Teknikutveckling'],
      pre_season: ['Explosiv kraft', 'Matchhärdighet', 'Sportsspecifik kondition', 'Teknik'],
      in_season: ['Styrkeunderhåll', 'Återhämtning', 'Matchprestation', 'Skadeprevention'],
      playoffs: ['Peak performance', 'Mental förberedelse', 'Taktisk perfektion', 'Maximal återhämtning'],
      tournament: ['Peak performance', 'Mental förberedelse', 'Taktisk perfektion', 'Maximal återhämtning'],
    }
    return labels[phase] || ['Sportsspecifik utveckling']
  }

  const labels: Record<string, string[]> = {
    off_season: ['Max strength', 'Aerobic base', 'Injury prevention', 'Technical development'],
    pre_season: ['Explosive power', 'Match durability', 'Sport-specific conditioning', 'Technical work'],
    in_season: ['Strength maintenance', 'Recovery', 'Match performance', 'Injury prevention'],
    playoffs: ['Peak performance', 'Mental preparation', 'Tactical sharpness', 'Maximum recovery'],
    tournament: ['Peak performance', 'Mental preparation', 'Tactical sharpness', 'Maximum recovery'],
  }
  return labels[phase] || ['Sport-specific development']
}

function getPrimaryFocus(phase: CourtSeasonPhase, locale: AppLocale): string {
  return getPhaseFocus(phase, locale)[0]
}

function getPrimaryFocusFromTraining(phaseTraining: CourtPhaseTraining, locale: AppLocale): string {
  return locale === 'sv'
    ? phaseTraining.focus.slice(0, 3).join(', ')
    : 'the current phase focus'
}

function phaseLabel(phase: CourtSeasonPhase, locale: AppLocale): string {
  const labels: Record<AppLocale, Record<string, string>> = {
    en: {
      off_season: 'off-season',
      pre_season: 'pre-season',
      in_season: 'in-season',
      playoffs: 'playoffs',
      tournament: 'tournament',
    },
    sv: {
      off_season: 'off-season',
      pre_season: 'försäsong',
      in_season: 'säsong',
      playoffs: 'slutspel',
      tournament: 'turnering',
    },
  }
  return labels[locale][phase] || phase
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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
