import { describe, expect, it } from 'vitest'
import {
  buildCourtSportSettingsPayload,
  getCourtSportProfileValue,
} from './CourtSportSettings'
import type { ConfigFormData } from './schema'

function baseFormData(overrides: Partial<ConfigFormData> = {}): ConfigFormData {
  return {
    clientId: 'client-1',
    durationWeeks: 8,
    sessionsPerWeek: 4,
    includeStrength: false,
    strengthSessionsPerWeek: 0,
    ...overrides,
  }
}

describe('court sport wizard settings', () => {
  it('builds basketball settings from manual wizard fields', () => {
    const payload = buildCourtSportSettingsPayload('TEAM_BASKETBALL', 'in-season-maintenance', baseFormData({
      courtPosition: 'point_guard',
      seasonPhase: 'in_season',
      matchesPerWeek: 1,
      sessionsPerWeek: 5,
    }))

    expect(payload.basketballSettings).toMatchObject({
      position: 'point_guard',
      seasonPhase: 'in_season',
      matchesPerWeek: 1,
      sessionsPerWeek: 5,
    })
  })

  it('keeps saved tennis profile values and overlays wizard changes', () => {
    const payload = buildCourtSportSettingsPayload('TENNIS', 'tournament', baseFormData({
      courtPlayStyle: 'aggressive_baseliner',
      sessionsPerWeek: 5,
    }), {
      playStyle: 'all_court',
      seasonPhase: 'in_season',
      matchesPerWeek: 1,
      preferredSurface: 'clay',
    })

    expect(payload.tennisSettings).toMatchObject({
      playStyle: 'aggressive_baseliner',
      seasonPhase: 'in_season',
      matchesPerWeek: 1,
      sessionsPerWeek: 5,
      preferredSurface: 'clay',
    })
  })

  it('summarizes saved racket sport settings for profile data source cards', () => {
    expect(getCourtSportProfileValue('PADEL', {
      position: 'left_side',
      seasonPhase: 'tournament',
      matchesPerWeek: 2,
    }, 'en')).toBe('Left side · tournament · 2 matches')
  })
})
