import { describe, expect, it } from 'vitest'

import {
  formatHockeyProgramRoutingForPrompt,
  getHockeyProgramBlockRoute,
  getHockeyProgramBlocksForBuilder,
} from '../hockey-program-blocks'

describe('hockey program block routing', () => {
  it('routes repeated sprint and shift-repeat work to Cardio Studio', () => {
    expect(getHockeyProgramBlockRoute('REPEATED_SPRINT_ABILITY')).toMatchObject({
      builder: 'cardio',
      toolName: 'createCardioSession',
      studioLabel: 'Cardio Studio',
    })

    expect(getHockeyProgramBlockRoute('SHIFT_REPEAT_CONDITIONING')).toMatchObject({
      builder: 'cardio',
      toolName: 'createCardioSession',
    })
  })

  it('keeps acceleration, COD, and reactive agility outside the strength builder', () => {
    const agilityBlocks = getHockeyProgramBlocksForBuilder('agility').map((route) => route.blockType)

    expect(agilityBlocks).toEqual(
      expect.arrayContaining(['ACCELERATION', 'DECELERATION_COD', 'REACTIVE_AGILITY', 'LATERAL_POWER'])
    )
    expect(agilityBlocks).not.toContain('STRENGTH_POWER')
  })

  it('uses strength only for gym strength, power, and prehab stability', () => {
    const strengthBlocks = getHockeyProgramBlocksForBuilder('strength').map((route) => route.blockType)

    expect(strengthBlocks).toEqual(['STRENGTH_POWER', 'PREHAB_STABILITY'])
  })

  it('formats concise builder guidance for the coach assistant prompt', () => {
    const promptText = formatHockeyProgramRoutingForPrompt()

    expect(promptText).toContain('Cardio Studio')
    expect(promptText).toContain('Hybrid Studio')
    expect(promptText).toContain('Agility Studio')
    expect(promptText).toContain('Strength Studio')
    expect(promptText).toContain('On-ice skill')
  })
})
