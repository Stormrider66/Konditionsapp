import {
  calculateACWR,
  calculateGPSLoadStatus,
  getInjuryPreventionExercises as getFootballInjuryPreventionExercises,
  getPositionRecommendations as getFootballPositionRecommendations,
  getSeasonPhaseTraining as getFootballSeasonPhaseTraining,
  type FootballPosition,
  type SeasonPhase as FootballSeasonPhase,
} from '@/lib/training-engine/football'
import {
  calculateTrainingLoad,
  getInjuryPreventionExercises as getHockeyInjuryPreventionExercises,
  getPositionRecommendations as getHockeyPositionRecommendations,
  getSeasonPhaseTraining as getHockeySeasonPhaseTraining,
  type HockeyPosition,
  type SeasonPhase as HockeySeasonPhase,
} from '@/lib/training-engine/hockey'
import { footballSettingsSchema, hockeySettingsSchema } from './settings-schema'

export type FootballProgramSettings = {
  position?: FootballPosition
  positionDetail?: string
  seasonPhase?: FootballSeasonPhase
  matchesPerWeek?: number
  avgMinutesPerMatch?: number | null
  weeklyTrainingSessions?: number
  hasGPSData?: boolean
  avgMatchDistanceKm?: number | null
  avgSprintDistanceM?: number | null
  recentWeeklyLoads?: number[]
  playStyle?: string
}

export type HockeyProgramSettings = {
  position?: HockeyPosition
  seasonPhase?: HockeySeasonPhase
  averageIceTimeMinutes?: number | null
  shiftsPerGame?: number | null
  matchesThisWeek?: number
  weeklyOffIceSessions?: number
  hasAccessToIce?: boolean
  hasAccessToGym?: boolean
  playStyle?: string
}

export type TeamSportLoadGuidance = {
  intensityMultiplier: number
  notes: string[]
}

type AppLocale = 'en' | 'sv'

export type FootballPlanningContext = {
  settings: FootballProgramSettings
  position: FootballPosition
  phase: FootballSeasonPhase
  matchesPerWeek: number
  sessionsPerWeek: number
  profile: ReturnType<typeof getFootballPositionRecommendations>
  phaseTraining: ReturnType<typeof getFootballSeasonPhaseTraining>
  prevention: ReturnType<typeof getFootballInjuryPreventionExercises>
  loadGuidance: TeamSportLoadGuidance
}

export type HockeyPlanningContext = {
  settings: HockeyProgramSettings
  position: HockeyPosition
  phase: HockeySeasonPhase
  matchesThisWeek: number
  requestedSessions: number
  profile: ReturnType<typeof getHockeyPositionRecommendations>
  phaseTraining: ReturnType<typeof getHockeySeasonPhaseTraining>
  prevention: ReturnType<typeof getHockeyInjuryPreventionExercises>
  trainingLoad: ReturnType<typeof calculateTrainingLoad>
  loadGuidance: TeamSportLoadGuidance
}

export function buildFootballPlanningContext(input: {
  goal: string
  sessionsPerWeek?: number
  footballSettings?: unknown
  locale?: AppLocale
}): FootballPlanningContext {
  const locale = input.locale === 'sv' ? 'sv' : 'en'
  const settings = normalizeFootballSettings(input.footballSettings)
  const position = settings.position || 'midfielder'
  const phase = settings.seasonPhase || inferFootballSeasonPhase(input.goal)
  const matchesPerWeek = Math.max(0, settings.matchesPerWeek || 1)
  const sessionsPerWeek = Math.min(7, Math.max(2, settings.weeklyTrainingSessions || input.sessionsPerWeek || 4))

  return {
    settings,
    position,
    phase,
    matchesPerWeek,
    sessionsPerWeek,
    profile: getFootballPositionRecommendations(position, locale),
    phaseTraining: getFootballSeasonPhaseTraining(phase, locale),
    prevention: getFootballInjuryPreventionExercises(position, locale),
    loadGuidance: getFootballLoadGuidance(settings, position, locale),
  }
}

export function buildHockeyPlanningContext(input: {
  goal: string
  sessionsPerWeek?: number
  hockeySettings?: unknown
  locale?: AppLocale
}): HockeyPlanningContext {
  const locale = input.locale === 'sv' ? 'sv' : 'en'
  const settings = normalizeHockeySettings(input.hockeySettings)
  const position = settings.position || 'center'
  const phase = settings.seasonPhase || inferHockeySeasonPhase(input.goal)
  const matchesThisWeek = settings.matchesThisWeek ?? inferHockeyMatchesThisWeek(phase, input.goal)
  const requestedSessions = Math.min(7, Math.max(2, settings.weeklyOffIceSessions || input.sessionsPerWeek || 4))

  return {
    settings,
    position,
    phase,
    matchesThisWeek,
    requestedSessions,
    profile: getHockeyPositionRecommendations(position, locale),
    phaseTraining: getHockeySeasonPhaseTraining(phase, locale),
    prevention: getHockeyInjuryPreventionExercises(position, locale),
    trainingLoad: calculateTrainingLoad(position, phase, matchesThisWeek, locale),
    loadGuidance: getHockeyLoadGuidance(settings, matchesThisWeek, locale),
  }
}

export function normalizeFootballSettings(value: unknown): FootballProgramSettings {
  return isRecord(value) ? footballSettingsSchema.parse(value) as FootballProgramSettings : {}
}

export function normalizeHockeySettings(value: unknown): HockeyProgramSettings {
  return isRecord(value) ? hockeySettingsSchema.parse(value) as HockeyProgramSettings : {}
}

export function getFootballLoadGuidance(
  settings: FootballProgramSettings,
  position: FootballPosition,
  locale: AppLocale = 'en'
): TeamSportLoadGuidance {
  const notes: string[] = []
  let intensityMultiplier = 1

  if (settings.hasGPSData && settings.avgMatchDistanceKm && settings.avgSprintDistanceM) {
    const status = calculateGPSLoadStatus(position, {
      totalDistanceM: Math.round(settings.avgMatchDistanceKm * 1000),
      highSpeedRunningM: Math.round(settings.avgSprintDistanceM * 1.8),
      sprintDistanceM: Math.round(settings.avgSprintDistanceM),
      accelerations: 0,
      decelerations: 0,
    }, locale)

    if (status.overall === 'very_high') {
      intensityMultiplier = Math.min(intensityMultiplier, 0.75)
      notes.push(t(locale, 'GPS load is very high: reduce sprint/HI volume and prioritize recovery.', 'GPS-belastning är mycket hög: reducera sprint-/HI-volym och prioritera återhämtning.'))
    } else if (status.overall === 'high') {
      intensityMultiplier = Math.min(intensityMultiplier, 0.85)
      notes.push(t(locale, 'GPS load is high: keep the next intensive session shorter and avoid extra sprint volume.', 'GPS-belastning är hög: håll nästa intensiva pass kortare och undvik extra sprintvolym.'))
    } else if (status.overall === 'low') {
      intensityMultiplier = Math.max(intensityMultiplier, 1.05)
      notes.push(t(locale, 'GPS load is low: controlled extra conditioning/speed exposure is reasonable.', 'GPS-belastning är låg: kontrollerad extra konditions-/hastighetsexponering är rimlig.'))
    }
  }

  if (settings.recentWeeklyLoads && settings.recentWeeklyLoads.length >= 4) {
    const acwr = calculateACWR(settings.recentWeeklyLoads, locale)
    if (acwr.zone === 'danger') {
      intensityMultiplier = Math.min(intensityMultiplier, 0.65)
      notes.push(`ACWR ${acwr.ratio}: ${acwr.recommendation}`)
    } else if (acwr.zone === 'caution') {
      intensityMultiplier = Math.min(intensityMultiplier, 0.8)
      notes.push(`ACWR ${acwr.ratio}: ${acwr.recommendation}`)
    }
  }

  return { intensityMultiplier, notes }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function getHockeyLoadGuidance(
  settings: HockeyProgramSettings,
  matchesThisWeek: number,
  locale: AppLocale = 'en'
): TeamSportLoadGuidance {
  const notes: string[] = []
  let intensityMultiplier = 1

  if (matchesThisWeek >= 3) {
    intensityMultiplier = Math.min(intensityMultiplier, 0.65)
    notes.push(t(locale, 'Very high match load: minimize extra off-ice intensity.', 'Mycket hög matchbelastning: minimera extra off-ice intensitet.'))
  } else if (matchesThisWeek === 2) {
    intensityMultiplier = Math.min(intensityMultiplier, 0.8)
    notes.push(t(locale, 'Two matches this week: prioritize recovery and short quality sessions.', 'Två matcher denna vecka: prioritera återhämtning och korta kvalitetspass.'))
  }

  if ((settings.averageIceTimeMinutes ?? 0) >= 22 || (settings.shiftsPerGame ?? 0) >= 26) {
    intensityMultiplier = Math.min(intensityMultiplier, 0.85)
    notes.push(t(locale, 'High ice-time/shift load: reduce extra interval volume and monitor RPE closely.', 'Hög istid/bytesbelastning: reducera extra intervallvolym och följ RPE noga.'))
  }

  return { intensityMultiplier, notes }
}

export function inferFootballSeasonPhase(goal: string): FootballSeasonPhase {
  if (goal === 'off-season-build') return 'off_season'
  if (goal === 'pre-season-readiness') return 'pre_season'
  if (goal === 'in-season-maintenance') return 'in_season'
  return 'in_season'
}

export function inferHockeySeasonPhase(goal: string): HockeySeasonPhase {
  if (goal === 'off-season-build') return 'off_season'
  if (goal === 'pre-season-readiness') return 'pre_season'
  if (goal === 'in-season-maintenance') return 'in_season'
  return 'in_season'
}

export function inferHockeyMatchesThisWeek(phase: HockeySeasonPhase, goal: string): number {
  if (goal === 'off-season-build' || phase === 'off_season') return 0
  if (phase === 'playoffs') return 2
  return 1
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
