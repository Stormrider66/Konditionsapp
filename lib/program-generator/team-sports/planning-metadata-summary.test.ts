import { describe, expect, it } from 'vitest'
import { buildTeamSportPlanningSummaryFromMetadata } from './planning-metadata-summary'

describe('buildTeamSportPlanningSummaryFromMetadata', () => {
  it('formats persisted football planning metadata', () => {
    const summary = buildTeamSportPlanningSummaryFromMetadata({
      locale: 'sv',
      metadata: {
        version: 1,
        sport: 'TEAM_FOOTBALL',
        position: 'midfielder',
        seasonPhase: 'in_season',
        intensityMultiplier: 0.85,
        loadGuidance: ['GPS-belastning är hög'],
        prevention: ['Nordic hamstring'],
        football: {
          matchesPerWeek: 1,
          sessionsPerWeek: 5,
        },
      },
    })

    expect(summary).toMatchObject({
      sport: 'football',
      title: 'Planeringsantaganden för fotboll',
      assumptions: [
        { label: 'Position', value: 'Mittfältare' },
        { label: 'Säsongsfas', value: 'Tävlingssäsong' },
        { label: 'Matcher/vecka', value: '1' },
        { label: 'Planerade pass/vecka', value: '5' },
        { label: 'Intensitetsfaktor', value: '85%' },
      ],
      prevention: ['Nordic hamstring'],
      loadGuidance: ['GPS-belastning är hög'],
    })
  })

  it('formats persisted hockey planning metadata', () => {
    const summary = buildTeamSportPlanningSummaryFromMetadata({
      locale: 'en',
      metadata: {
        version: 1,
        sport: 'TEAM_ICE_HOCKEY',
        position: 'goalie',
        seasonPhase: 'playoffs',
        intensityMultiplier: 0.8,
        loadGuidance: ['Two games this week'],
        prevention: ['Hip mobility'],
        hockey: {
          matchesThisWeek: 2,
          requestedSessions: 4,
        },
      },
    })

    expect(summary).toMatchObject({
      sport: 'hockey',
      title: 'Hockey planning assumptions',
      assumptions: [
        { label: 'Position', value: 'Goalie' },
        { label: 'Season phase', value: 'Playoffs' },
        { label: 'Games this week', value: '2' },
        { label: 'Off-ice sessions', value: '4' },
        { label: 'Intensity factor', value: '80%' },
      ],
      prevention: ['Hip mobility'],
      loadGuidance: ['Two games this week'],
    })
  })

  it('ignores unsupported metadata', () => {
    expect(buildTeamSportPlanningSummaryFromMetadata({ metadata: null })).toBeNull()
    expect(buildTeamSportPlanningSummaryFromMetadata({ metadata: { version: 2 } })).toBeNull()
    expect(buildTeamSportPlanningSummaryFromMetadata({ metadata: { version: 1, sport: 'RUNNING' } })).toBeNull()
  })
})
