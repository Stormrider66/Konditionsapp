// lib/coach/athlete-profile-config.ts
//
// Single source of truth for "given this athlete's sport + team context, how does
// the coach profile behave?". Replaces the ad-hoc `isHockeyAthlete` checks that were
// duplicated across the client detail page, TestPageContent, and the sport views.
//
// Phase 0 of the athlete-profile IA redesign — see docs/athlete-profile-ia-redesign.md.

import { type SportType, isTeamSport, isRacketSport } from '@/types'

export type SportKind = 'ENDURANCE' | 'TEAM' | 'RACKET' | 'FUNCTIONAL' | 'STRENGTH' | 'OTHER'

const HOCKEY: SportType = 'TEAM_ICE_HOCKEY'

const ENDURANCE_SPORTS = new Set<SportType>([
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
])

const FUNCTIONAL_SPORTS = new Set<SportType>([
  'HYROX',
  'GENERAL_FITNESS',
  'FUNCTIONAL_FITNESS',
])

/** Minimal shape the registry needs — accepts the page's `client.team` / `sportProfile`. */
export interface AthleteProfileConfigInput {
  team?: { sportType?: string | null } | null
  sportProfile?: { primarySport?: string | null; secondarySports?: string[] | null } | null
}

export interface AthleteProfileConfig {
  primarySport: SportType | null
  secondarySports: SportType[]
  sportKind: SportKind
  /** Athlete is attached to a team or plays a team sport. */
  isTeamAthlete: boolean
  /** Hockey-specific surfaces (battery entry, hockey view, pathway) apply. */
  isHockeyAthlete: boolean
  /** Endurance pace/zone (VDOT) dashboard applies. */
  showPaceZones: boolean
}

function asSportType(value?: string | null): SportType | null {
  return value ? (value as SportType) : null
}

function classify(sport: SportType | null): SportKind {
  if (!sport) return 'OTHER'
  if (ENDURANCE_SPORTS.has(sport)) return 'ENDURANCE'
  if (isTeamSport(sport)) return 'TEAM'
  if (isRacketSport(sport)) return 'RACKET'
  if (FUNCTIONAL_SPORTS.has(sport)) return 'FUNCTIONAL'
  if (sport === 'STRENGTH') return 'STRENGTH'
  return 'OTHER'
}

export function getAthleteProfileConfig(input: AthleteProfileConfigInput): AthleteProfileConfig {
  const primarySport = asSportType(input.sportProfile?.primarySport)
  const secondarySports = (input.sportProfile?.secondarySports ?? [])
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s as SportType)
  const teamSport = asSportType(input.team?.sportType)

  const isHockeyAthlete =
    teamSport === HOCKEY ||
    primarySport === HOCKEY ||
    secondarySports.includes(HOCKEY)

  const isTeamAthlete =
    !!input.team ||
    (primarySport ? isTeamSport(primarySport) : false) ||
    (teamSport ? isTeamSport(teamSport) : false)

  return {
    primarySport,
    secondarySports,
    sportKind: classify(primarySport),
    isTeamAthlete,
    isHockeyAthlete,
    showPaceZones: primarySport === 'RUNNING',
  }
}
