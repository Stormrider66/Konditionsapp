import { describe, expect, it } from 'vitest'
import {
  getProgramSportSettings,
  getProgramSportSettingsKey,
  normalizeProgramSport,
} from './sport-normalization'

describe('program sport normalization', () => {
  it.each([
    ['basket', 'TEAM_BASKETBALL'],
    ['Basketball', 'TEAM_BASKETBALL'],
    ['ice hockey', 'TEAM_ICE_HOCKEY'],
    ['ishockey', 'TEAM_ICE_HOCKEY'],
    ['innebandy', 'TEAM_FLOORBALL'],
    ['floorball', 'TEAM_FLOORBALL'],
    ['volleyboll', 'TEAM_VOLLEYBALL'],
    ['football', 'TEAM_FOOTBALL'],
    ['soccer', 'TEAM_FOOTBALL'],
    ['padel', 'PADEL'],
    ['tennis', 'TENNIS'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeProgramSport(input)).toBe(expected)
  })

  it('maps generated sport keys to saved profile settings', () => {
    expect(getProgramSportSettingsKey('handboll')).toBe('handballSettings')
    expect(getProgramSportSettings('tennis', {
      tennisSettings: {
        playStyle: 'all_court',
      },
    })).toEqual({
      playStyle: 'all_court',
    })
  })
})
