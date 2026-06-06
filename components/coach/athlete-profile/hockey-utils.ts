// components/coach/athlete-profile/hockey-utils.ts
//
// Hockey settings normalization for the coach-mode athlete profile.
// Extracted from the page component during Phase 0 of the IA redesign.

import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'
import type { ClientWithTests, SportProfileSummary } from './types'

const DEFAULT_PLAYER_HOCKEY_SETTINGS: HockeySettings = {
  position: 'center',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'in_season',
  averageIceTimeMinutes: null,
  shiftsPerGame: null,
  yearsPlaying: 0,
  playStyle: 'two_way',
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyOffIceSessions: 3,
  hasAccessToIce: true,
  hasAccessToGym: true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeHockeyPosition(position?: string | null): HockeySettings['position'] {
  const normalized = position?.trim().toLowerCase() ?? ''
  if (['goalie', 'målvakt', 'malvakt', 'keeper'].some((value) => normalized.includes(value))) return 'goalie'
  if (normalized === 'd' || ['defense', 'defence', 'back'].some((value) => normalized.includes(value))) return 'defense'
  if (['wing', 'forward', 'lw', 'rw', 'ytter'].some((value) => normalized.includes(value))) return 'wing'
  return 'center'
}

function normalizeHockeyLeagueLevel(value?: string | null, teamName?: string | null): HockeySettings['leagueLevel'] {
  const normalizedValue = value?.trim().toLowerCase() ?? ''
  const validLevels = new Set<HockeySettings['leagueLevel']>([
    'recreational',
    'junior',
    'division_3',
    'division_2',
    'division_1',
    'shl',
    'hockeyallsvenskan',
    'hockeyettan',
  ])
  if (validLevels.has(normalizedValue as HockeySettings['leagueLevel'])) {
    return normalizedValue as HockeySettings['leagueLevel']
  }

  const normalized = teamName?.trim().toLowerCase() ?? ''
  if (/shl/.test(normalized)) return 'shl'
  if (/allsvenskan/.test(normalized)) return 'hockeyallsvenskan'
  if (/ettan|division 1|div 1/.test(normalized)) return 'hockeyettan'
  if (/j20|u20|j18|u18|junior/.test(normalized)) return 'junior'
  return 'recreational'
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function buildHockeySettings(
  client: ClientWithTests,
  sportProfile: SportProfileSummary | null,
): HockeySettings {
  const stored = isRecord(sportProfile?.hockeySettings) ? sportProfile.hockeySettings : {}
  const teamName = typeof stored.teamName === 'string' && stored.teamName.trim()
    ? stored.teamName
    : client.team?.name ?? ''

  return {
    ...DEFAULT_PLAYER_HOCKEY_SETTINGS,
    ...(stored as Partial<HockeySettings>),
    position: typeof stored.position === 'string'
      ? normalizeHockeyPosition(stored.position)
      : normalizeHockeyPosition(client.position),
    teamName,
    leagueLevel: normalizeHockeyLeagueLevel(
      typeof stored.leagueLevel === 'string' ? stored.leagueLevel : null,
      teamName,
    ),
    strengthFocus: stringArray(stored.strengthFocus),
    weaknesses: stringArray(stored.weaknesses),
    injuryHistory: stringArray(stored.injuryHistory),
  }
}
