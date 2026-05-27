import type { FootballPlanningContext, HockeyPlanningContext } from './planning-context'

export type TeamSportPlanningMetadata = {
  version: 1
  source: 'team-sport-planning-context'
  sport: 'TEAM_FOOTBALL' | 'TEAM_ICE_HOCKEY'
  position: string
  seasonPhase: string
  intensityMultiplier: number
  loadGuidance: string[]
  prevention: string[]
  football?: {
    matchesPerWeek: number
    sessionsPerWeek: number
    primaryGoals: string[]
    conditioningFocus: string[]
    strengthFocus: string[]
  }
  hockey?: {
    matchesThisWeek: number
    requestedSessions: number
    strengthSessions: number
    conditioningSessions: number
    hasAccessToIce: boolean
    hasAccessToGym: boolean
    trainingLoadNotes: string[]
    primaryGoals: string[]
    conditioningFocus: string[]
    strengthFocus: string[]
    testEvidence?: HockeyTestPlanningMetadata
  }
}

export type HockeyTestPlanningMetadata = {
  testId?: string
  testDate?: string
  availableMetrics: string[]
  priorities: string[]
  notes: string[]
}

export function buildFootballPlanningMetadata(
  planning: FootballPlanningContext
): TeamSportPlanningMetadata {
  return {
    version: 1,
    source: 'team-sport-planning-context',
    sport: 'TEAM_FOOTBALL',
    position: planning.position,
    seasonPhase: planning.phase,
    intensityMultiplier: planning.loadGuidance.intensityMultiplier,
    loadGuidance: planning.loadGuidance.notes,
    prevention: planning.prevention.slice(0, 4).map((exercise) => exercise.name),
    football: {
      matchesPerWeek: planning.matchesPerWeek,
      sessionsPerWeek: planning.sessionsPerWeek,
      primaryGoals: planning.phaseTraining.primaryGoals.slice(0, 4),
      conditioningFocus: planning.profile.primaryConditioningFocus.slice(0, 4),
      strengthFocus: planning.profile.primaryStrengthFocus.slice(0, 4),
    },
  }
}

export function buildHockeyPlanningMetadata(
  planning: HockeyPlanningContext,
  testEvidence?: HockeyTestPlanningMetadata
): TeamSportPlanningMetadata {
  return {
    version: 1,
    source: 'team-sport-planning-context',
    sport: 'TEAM_ICE_HOCKEY',
    position: planning.position,
    seasonPhase: planning.phase,
    intensityMultiplier: planning.loadGuidance.intensityMultiplier,
    loadGuidance: planning.loadGuidance.notes,
    prevention: planning.prevention.slice(0, 4).map((exercise) => exercise.name),
    hockey: {
      matchesThisWeek: planning.matchesThisWeek,
      requestedSessions: planning.requestedSessions,
      strengthSessions: planning.trainingLoad.strengthSessions,
      conditioningSessions: planning.trainingLoad.conditioningSessions,
      hasAccessToIce: planning.settings.hasAccessToIce !== false,
      hasAccessToGym: planning.settings.hasAccessToGym !== false,
      trainingLoadNotes: planning.trainingLoad.notes,
      primaryGoals: planning.phaseTraining.primaryGoals.slice(0, 4),
      conditioningFocus: planning.profile.primaryConditioningFocus.slice(0, 4),
      strengthFocus: planning.profile.primaryStrengthFocus.slice(0, 4),
      testEvidence,
    },
  }
}
