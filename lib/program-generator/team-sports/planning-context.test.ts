import { describe, expect, it } from 'vitest'
import {
  buildFootballPlanningContext,
  buildHockeyPlanningContext,
  inferHockeyMatchesThisWeek,
} from './planning-context'

describe('team sport planning context', () => {
  it('normalizes football settings and backs off high GPS load', () => {
    const context = buildFootballPlanningContext({
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      footballSettings: {
        position: 'forward',
        seasonPhase: 'in_season',
        matchesPerWeek: 1,
        hasGPSData: true,
        avgMatchDistanceKm: 11,
        avgSprintDistanceM: 700,
      },
    })

    expect(context.position).toBe('forward')
    expect(context.phase).toBe('in_season')
    expect(context.sessionsPerWeek).toBe(5)
    expect(context.loadGuidance.intensityMultiplier).toBeLessThan(1)
    expect(context.loadGuidance.notes.join(' ')).toContain('GPS-belastning är hög')
  })

  it('infers hockey match count from phase and adjusts high game load', () => {
    const context = buildHockeyPlanningContext({
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      hockeySettings: {
        position: 'defense',
        seasonPhase: 'playoffs',
        averageIceTimeMinutes: 24,
      },
    })

    expect(inferHockeyMatchesThisWeek('playoffs', 'in-season-maintenance')).toBe(2)
    expect(context.matchesThisWeek).toBe(2)
    expect(context.requestedSessions).toBe(5)
    expect(context.loadGuidance.intensityMultiplier).toBe(0.8)
    expect(context.loadGuidance.notes.join(' ')).toContain('Hög istid/bytesbelastning')
  })
})
