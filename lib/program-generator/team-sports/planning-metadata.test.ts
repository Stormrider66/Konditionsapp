import { describe, expect, it } from 'vitest'
import { buildFootballPlanningContext, buildHockeyPlanningContext } from './planning-context'
import { buildFootballPlanningMetadata, buildHockeyPlanningMetadata } from './planning-metadata'

describe('team sport planning metadata', () => {
  it('summarizes football planning decisions for persistence', () => {
    const planning = buildFootballPlanningContext({
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      locale: 'sv',
      footballSettings: {
        position: 'forward',
        seasonPhase: 'in_season',
        matchesPerWeek: 1,
        weeklyTrainingSessions: 5,
        hasGPSData: true,
        avgMatchDistanceKm: 11,
        avgSprintDistanceM: 700,
      },
    })

    const metadata = buildFootballPlanningMetadata(planning)

    expect(metadata).toMatchObject({
      version: 1,
      source: 'team-sport-planning-context',
      sport: 'TEAM_FOOTBALL',
      position: 'forward',
      seasonPhase: 'in_season',
      football: {
        matchesPerWeek: 1,
        sessionsPerWeek: 5,
      },
    })
    expect(metadata.intensityMultiplier).toBeLessThan(1)
    expect(metadata.loadGuidance.join(' ')).toContain('GPS-belastning')
    expect(metadata.prevention.length).toBeGreaterThan(0)
  })

  it('summarizes hockey planning decisions for persistence', () => {
    const planning = buildHockeyPlanningContext({
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      locale: 'sv',
      hockeySettings: {
        position: 'defense',
        seasonPhase: 'in_season',
        matchesThisWeek: 2,
        averageIceTimeMinutes: 24,
        shiftsPerGame: 28,
        weeklyOffIceSessions: 5,
        hasAccessToIce: false,
        hasAccessToGym: true,
      },
    })

    const metadata = buildHockeyPlanningMetadata(planning)

    expect(metadata).toMatchObject({
      version: 1,
      source: 'team-sport-planning-context',
      sport: 'TEAM_ICE_HOCKEY',
      position: 'defense',
      seasonPhase: 'in_season',
      hockey: {
        matchesThisWeek: 2,
        requestedSessions: 5,
        hasAccessToIce: false,
        hasAccessToGym: true,
      },
    })
    expect(metadata.intensityMultiplier).toBeLessThan(1)
    expect(metadata.loadGuidance.join(' ')).toContain('Hög istid')
    expect(metadata.hockey?.trainingLoadNotes.length).toBeGreaterThan(0)
  })
})
