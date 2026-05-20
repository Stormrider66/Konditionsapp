import { describe, expect, it } from 'vitest'
import { buildTeamSportPromptSection } from './prompt-section'

describe('buildTeamSportPromptSection', () => {
  it('adds football planning guidance from the shared context', () => {
    const section = buildTeamSportPromptSection({
      sport: 'TEAM_FOOTBALL',
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      locale: 'sv',
      variant: 'markdown',
      footballSettings: {
        position: 'forward',
        seasonPhase: 'in_season',
        hasGPSData: true,
        avgMatchDistanceKm: 11,
        avgSprintDistanceM: 700,
      },
    })

    expect(section).toContain('FOTBOLLSSPECIFIK PROFIL')
    expect(section).toContain('Matcher per vecka')
    expect(section).toContain('GPS-belastning är hög')
    expect(section).toContain('MD+1 återhämtning')
  })

  it('adds localized hockey load and prevention guidance', () => {
    const section = buildTeamSportPromptSection({
      sport: 'TEAM_ICE_HOCKEY',
      goal: 'in-season-maintenance',
      sessionsPerWeek: 5,
      locale: 'en',
      variant: 'compact',
      hockeySettings: {
        position: 'goalie',
        seasonPhase: 'playoffs',
        averageIceTimeMinutes: 24,
      },
    })

    expect(section).toContain('ICE HOCKEY CONTEXT')
    expect(section).toContain('Games this week: 2')
    expect(section).toContain('Load guidance')
    expect(section).toContain('avoid hard off-ice conditioning')
  })
})
