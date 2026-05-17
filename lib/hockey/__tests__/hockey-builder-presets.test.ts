import { describe, expect, it } from 'vitest'

import {
  HOCKEY_AGILITY_PRESETS,
  HOCKEY_CARDIO_PRESETS,
  HOCKEY_HYBRID_PRESETS,
  formatHockeyBuilderPresetGuidanceForPrompt,
  getHockeyBuilderPresetsForBlock,
} from '../hockey-builder-presets'

describe('hockey builder presets', () => {
  it('gives Cardio Studio hockey sessions it can represent with existing segment shapes', () => {
    const rsa = HOCKEY_CARDIO_PRESETS.find((preset) => preset.id === 'hockey-7x40-rsa')
    const shiftRepeat = HOCKEY_CARDIO_PRESETS.find((preset) => preset.id === 'hockey-shift-repeat-12x35')

    expect(rsa).toMatchObject({
      sport: 'TEAM_ICE_HOCKEY',
      blockType: 'REPEATED_SPRINT_ABILITY',
    })
    expect(rsa?.segments.some((segment) => segment.type === 'INTERVAL' && segment.repeats === 7)).toBe(true)
    expect(shiftRepeat?.segments.some((segment) => segment.type === 'REPEAT_GROUP')).toBe(true)
  })

  it('uses the richer Hybrid Studio formats for hockey station sessions', () => {
    const formats = HOCKEY_HYBRID_PRESETS.map((preset) => preset.format)

    expect(formats).toEqual(expect.arrayContaining(['EMOM', 'INTERVALS', 'LADDER']))
    expect(getHockeyBuilderPresetsForBlock('SLED_POWER')).toHaveLength(1)
    expect(getHockeyBuilderPresetsForBlock('MED_BALL_POWER')).toHaveLength(1)
  })

  it('keeps agility presets in Agility Studio categories', () => {
    const focusAreas = HOCKEY_AGILITY_PRESETS.map((preset) => preset.primaryFocus)

    expect(focusAreas).toEqual(expect.arrayContaining(['SPEED_ACCELERATION', 'COD', 'REACTIVE_AGILITY']))
    expect(HOCKEY_AGILITY_PRESETS.every((preset) => preset.targetSports.includes('TEAM_ICE_HOCKEY'))).toBe(true)
  })

  it('formats prompt guidance with one line per builder', () => {
    const guidance = formatHockeyBuilderPresetGuidanceForPrompt()

    expect(guidance).toContain('Cardio hockey presets')
    expect(guidance).toContain('Hybrid hockey presets')
    expect(guidance).toContain('Agility hockey presets')
  })
})
