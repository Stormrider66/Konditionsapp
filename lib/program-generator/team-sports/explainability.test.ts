import { describe, expect, it } from 'vitest'
import { buildTeamSportPlanningSummary } from './explainability'

describe('buildTeamSportPlanningSummary', () => {
  it('explains Swedish football assumptions and load reductions', () => {
    const summary = buildTeamSportPlanningSummary({
      sport: 'TEAM_FOOTBALL',
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      locale: 'sv',
      footballSettings: {
        position: 'forward',
        seasonPhase: 'in_season',
        hasGPSData: true,
        avgMatchDistanceKm: 11,
        avgSprintDistanceM: 700,
      },
    })

    expect(summary?.title).toContain('fotboll')
    expect(summary?.assumptions).toContainEqual({ label: 'Position', value: 'Forward' })
    expect(summary?.assumptions).toContainEqual({ label: 'Intensitetsfaktor', value: '85%' })
    expect(summary?.loadGuidance.join(' ')).toContain('GPS-belastning är hög')
    expect(summary?.prevention.length).toBeGreaterThan(0)
  })

  it('explains English hockey match load and default position fallback', () => {
    const summary = buildTeamSportPlanningSummary({
      sport: 'TEAM_ICE_HOCKEY',
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      locale: 'en',
      hockeySettings: {
        position: 'netminder',
        seasonPhase: 'playoffs',
        averageIceTimeMinutes: 24,
      },
    })

    expect(summary?.title).toContain('Hockey')
    expect(summary?.assumptions).toContainEqual({ label: 'Position', value: 'Center' })
    expect(summary?.assumptions).toContainEqual({ label: 'Games this week', value: '2' })
    expect(summary?.loadGuidance.join(' ')).toContain('High ice-time/shift load')
    expect(JSON.stringify(summary)).not.toMatch(/[åäöÅÄÖ]|\b(Hög|istid|bytesbelastning|återhämtning)\b/)
  })
})
