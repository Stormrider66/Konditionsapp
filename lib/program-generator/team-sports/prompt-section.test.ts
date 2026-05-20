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

  it('adds court and racket sport profile guidance', () => {
    const tennisSection = buildTeamSportPromptSection({
      sport: 'TENNIS',
      sessionsPerWeek: 5,
      locale: 'en',
      variant: 'compact',
      tennisSettings: {
        playStyle: 'aggressive_baseliner',
        seasonPhase: 'tournament',
        matchesPerWeek: 2,
      },
    })

    expect(tennisSection).toContain('TENNIS CONTEXT')
    expect(tennisSection).toContain('Play style: aggressive_baseliner')
    expect(tennisSection).toContain('point intervals')

    const basketballSection = buildTeamSportPromptSection({
      sport: 'TEAM_BASKETBALL',
      sessionsPerWeek: 4,
      locale: 'sv',
      variant: 'markdown',
      basketballSettings: {
        position: 'point_guard',
        seasonPhase: 'in_season',
        matchesPerWeek: 1,
      },
    })

    expect(basketballSection).toContain('BASKETSPECIFIK PROFIL')
    expect(basketballSection).toContain('Position')
    expect(basketballSection).toContain('hoppbelastning')
  })

  it('adds useful sport guidance even when profile settings are missing', () => {
    const hockeySection = buildTeamSportPromptSection({
      sport: 'TEAM_ICE_HOCKEY',
      sessionsPerWeek: 4,
      locale: 'en',
      variant: 'compact',
    })

    expect(hockeySection).toContain('ICE HOCKEY CONTEXT')
    expect(hockeySection).toContain('skating acceleration')
    expect(hockeySection).toContain('safe defaults')

    const padelSection = buildTeamSportPromptSection({
      sport: 'PADEL',
      sessionsPerWeek: 3,
      locale: 'sv',
      variant: 'markdown',
    })

    expect(padelSection).toContain('PADELSPECIFIK PROFIL')
    expect(padelSection).toContain('rotationskraft')
    expect(padelSection).toContain('Planerade pass')
  })
})
