import { describe, expect, it } from 'vitest'
import {
  buildFootballPlanningContext,
  buildHockeyPlanningContext,
  inferHockeyMatchesThisWeek,
  normalizeFootballSettings,
  normalizeHockeySettings,
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
    expect(context.loadGuidance.notes.join(' ')).toContain('GPS load is high')
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
    expect(context.loadGuidance.notes.join(' ')).toContain('High ice-time/shift load')
  })

  it('sanitizes stringly and invalid football settings before planning', () => {
    const settings = normalizeFootballSettings({
      position: 'striker',
      seasonPhase: 'pre_season',
      matchesPerWeek: '2',
      weeklyTrainingSessions: '6',
      avgSprintDistanceM: 'not-a-number',
      hasGPSData: 'true',
      recentWeeklyLoads: ['300', 'bad', 450, 500],
    })

    expect(settings.position).toBeUndefined()
    expect(settings.seasonPhase).toBe('pre_season')
    expect(settings.matchesPerWeek).toBe(2)
    expect(settings.weeklyTrainingSessions).toBe(6)
    expect(settings.avgSprintDistanceM).toBeUndefined()
    expect(settings.hasGPSData).toBe(true)
    expect(settings.recentWeeklyLoads).toEqual([300, 450, 500])
  })

  it('sanitizes hockey settings and falls back to safe defaults', () => {
    const settings = normalizeHockeySettings({
      position: 'netminder',
      seasonPhase: 'playoffs',
      matchesThisWeek: '3',
      weeklyOffIceSessions: '4',
      averageIceTimeMinutes: '24',
      shiftsPerGame: 'too many',
      hasAccessToIce: 'false',
    })
    const context = buildHockeyPlanningContext({
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      hockeySettings: settings,
    })

    expect(settings.position).toBeUndefined()
    expect(settings.matchesThisWeek).toBe(3)
    expect(settings.averageIceTimeMinutes).toBe(24)
    expect(settings.shiftsPerGame).toBeUndefined()
    expect(settings.hasAccessToIce).toBe(false)
    expect(context.position).toBe('center')
    expect(context.matchesThisWeek).toBe(3)
  })
})
