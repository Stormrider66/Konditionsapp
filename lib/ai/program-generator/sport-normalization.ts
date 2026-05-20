export type NormalizedProgramSport =
  | 'RUNNING'
  | 'CYCLING'
  | 'SKIING'
  | 'SWIMMING'
  | 'TRIATHLON'
  | 'HYROX'
  | 'GENERAL_FITNESS'
  | 'FUNCTIONAL_FITNESS'
  | 'STRENGTH'
  | 'TEAM_FOOTBALL'
  | 'TEAM_ICE_HOCKEY'
  | 'TEAM_HANDBALL'
  | 'TEAM_FLOORBALL'
  | 'TEAM_BASKETBALL'
  | 'TEAM_VOLLEYBALL'
  | 'TENNIS'
  | 'PADEL'

type SportSettingsKey =
  | 'hockeySettings'
  | 'footballSettings'
  | 'handballSettings'
  | 'floorballSettings'
  | 'basketballSettings'
  | 'volleyballSettings'
  | 'tennisSettings'
  | 'padelSettings'

const SPORT_ALIASES: Record<string, NormalizedProgramSport> = {
  RUNNING: 'RUNNING',
  RUN: 'RUNNING',
  LOPNING: 'RUNNING',
  LÖPNING: 'RUNNING',
  CYCLING: 'CYCLING',
  BIKE: 'CYCLING',
  CYKEL: 'CYCLING',
  CYKLING: 'CYCLING',
  SKIING: 'SKIING',
  SKI: 'SKIING',
  SKIDAKNING: 'SKIING',
  SKIDÅKNING: 'SKIING',
  SWIMMING: 'SWIMMING',
  SWIM: 'SWIMMING',
  SIMNING: 'SWIMMING',
  TRIATHLON: 'TRIATHLON',
  HYROX: 'HYROX',
  GENERAL_FITNESS: 'GENERAL_FITNESS',
  FITNESS: 'GENERAL_FITNESS',
  FUNCTIONAL_FITNESS: 'FUNCTIONAL_FITNESS',
  CROSSFIT: 'FUNCTIONAL_FITNESS',
  STRENGTH: 'STRENGTH',
  STYRKA: 'STRENGTH',
  TEAM_FOOTBALL: 'TEAM_FOOTBALL',
  FOOTBALL: 'TEAM_FOOTBALL',
  SOCCER: 'TEAM_FOOTBALL',
  FOTBOLL: 'TEAM_FOOTBALL',
  TEAM_ICE_HOCKEY: 'TEAM_ICE_HOCKEY',
  ICE_HOCKEY: 'TEAM_ICE_HOCKEY',
  HOCKEY: 'TEAM_ICE_HOCKEY',
  ISHOCKEY: 'TEAM_ICE_HOCKEY',
  TEAM_HANDBALL: 'TEAM_HANDBALL',
  HANDBALL: 'TEAM_HANDBALL',
  HANDBOLL: 'TEAM_HANDBALL',
  TEAM_FLOORBALL: 'TEAM_FLOORBALL',
  FLOORBALL: 'TEAM_FLOORBALL',
  INNEBANDY: 'TEAM_FLOORBALL',
  TEAM_BASKETBALL: 'TEAM_BASKETBALL',
  BASKETBALL: 'TEAM_BASKETBALL',
  BASKET: 'TEAM_BASKETBALL',
  TEAM_VOLLEYBALL: 'TEAM_VOLLEYBALL',
  VOLLEYBALL: 'TEAM_VOLLEYBALL',
  VOLLEYBOLL: 'TEAM_VOLLEYBALL',
  VOLLEY: 'TEAM_VOLLEYBALL',
  TENNIS: 'TENNIS',
  PADEL: 'PADEL',
}

const SPORT_SETTINGS_KEYS: Partial<Record<NormalizedProgramSport, SportSettingsKey>> = {
  TEAM_ICE_HOCKEY: 'hockeySettings',
  TEAM_FOOTBALL: 'footballSettings',
  TEAM_HANDBALL: 'handballSettings',
  TEAM_FLOORBALL: 'floorballSettings',
  TEAM_BASKETBALL: 'basketballSettings',
  TEAM_VOLLEYBALL: 'volleyballSettings',
  TENNIS: 'tennisSettings',
  PADEL: 'padelSettings',
}

export function normalizeProgramSport(input: string | null | undefined): NormalizedProgramSport {
  if (!input) return 'RUNNING'

  const key = input
    .trim()
    .replace(/[-\s]+/g, '_')
    .toUpperCase()

  return SPORT_ALIASES[key] || SPORT_ALIASES[key.replace(/^TEAM_/, '')] || 'RUNNING'
}

export function getProgramSportSettingsKey(sport: string): SportSettingsKey | null {
  return SPORT_SETTINGS_KEYS[normalizeProgramSport(sport)] || null
}

export function getProgramSportSettings(
  sport: string,
  sportProfile: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const settingsKey = getProgramSportSettingsKey(sport)
  if (!settingsKey || !sportProfile) return null

  const settings = sportProfile[settingsKey]
  return isRecord(settings) ? settings : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
