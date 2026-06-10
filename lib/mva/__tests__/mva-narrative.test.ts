import { describe, it, expect } from 'vitest'
import {
  buildAthleteMVANarrative,
  buildTeamMVANarrative,
  buildPLSDriverLines,
  type NarrativeAthlete,
} from '../mva-narrative'

function athlete(overrides: Partial<NarrativeAthlete>): NarrativeAthlete {
  return {
    clientName: 'Test Player',
    scores: [0.1, 0.1],
    hotellingT2: 1,
    dmodx: 0.5,
    isOutlierT2: false,
    isOutlierDModX: false,
    topContributors: null,
    ...overrides,
  }
}

describe('buildAthleteMVANarrative', () => {
  it('always leads with a profile-type item', () => {
    const items = buildAthleteMVANarrative(athlete({}), 'en')
    expect(items[0].id).toBe('archetype')
  })

  it('adds a priority item for a DModX outlier', () => {
    const items = buildAthleteMVANarrative(athlete({ isOutlierDModX: true }), 'en')
    expect(items.some((i) => i.id === 'dmodx-outlier' && i.tone === 'priority')).toBe(true)
  })

  it('adds a watch item for a T² outlier', () => {
    const items = buildAthleteMVANarrative(athlete({ isOutlierT2: true }), 'en')
    expect(items.some((i) => i.id === 't2-outlier' && i.tone === 'watch')).toBe(true)
  })

  it('describes a central athlete as inside the team profile', () => {
    const items = buildAthleteMVANarrative(athlete({}), 'en')
    expect(items.some((i) => i.id === 'central')).toBe(true)
  })

  it('localizes to Swedish', () => {
    const items = buildAthleteMVANarrative(athlete({ isOutlierDModX: true }), 'sv')
    const priority = items.find((i) => i.id === 'dmodx-outlier')
    expect(priority?.title).toContain('passar inte')
  })
})

describe('buildTeamMVANarrative', () => {
  it('flags players to review when outliers exist', () => {
    const items = buildTeamMVANarrative(
      [athlete({ clientName: 'A', isOutlierDModX: true }), athlete({ clientName: 'B' })],
      'en'
    )
    const watch = items.find((i) => i.id === 'team-watch')
    expect(watch?.tone).toBe('watch')
    expect(watch?.body).toContain('A')
  })

  it('returns empty for no athletes', () => {
    expect(buildTeamMVANarrative([], 'en')).toHaveLength(0)
  })
})

describe('buildPLSDriverLines', () => {
  it('keeps only VIP >= 1 and signs the direction', () => {
    const lines = buildPLSDriverLines(
      'VO2max',
      [
        { variableName: 'sprint_10m', vip: 1.5, coefficient: -0.4 },
        { variableName: 'noise', vip: 0.3, coefficient: 0.1 },
      ],
      'en'
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('lower')
    expect(lines[0]).toContain('VO2max')
  })
})
