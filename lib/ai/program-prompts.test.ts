import { describe, expect, it } from 'vitest'
import { SportType } from '@prisma/client'
import {
  SPORT_PROMPTS_EN,
  generateProgramPrompt,
  getSportPrompt,
  quickWorkoutPrompt,
} from './program-prompts'

const SWEDISH_CHARS = /[åäöÅÄÖ]/

function flattenPromptText(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flattenPromptText)
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(flattenPromptText)
  }
  return []
}

describe('localized program prompts', () => {
  it('keeps the English sport prompt catalog free from Swedish characters', () => {
    const englishTexts = flattenPromptText(SPORT_PROMPTS_EN)

    expect(englishTexts.length).toBeGreaterThan(0)
    expect(englishTexts.filter((text) => SWEDISH_CHARS.test(text))).toEqual([])
  })

  it('uses English sport guidance in generated program prompts by default', () => {
    const prompt = generateProgramPrompt(SportType.RUNNING, 'POLARIZED', 8)

    expect(prompt).toContain('You create running programs')
    expect(prompt).toContain('Long run')
    expect(prompt).not.toMatch(SWEDISH_CHARS)
  })

  it('uses English sport guidance in quick workout prompts by default', () => {
    const prompt = quickWorkoutPrompt(SportType.CYCLING, 45, 'moderate')

    expect(prompt).toContain('Endurance ride')
    expect(prompt).not.toMatch(SWEDISH_CHARS)
  })

  it('preserves Swedish sport guidance for Swedish locale contexts', () => {
    const prompt = getSportPrompt(SportType.RUNNING, 'sv')

    expect(prompt.systemContext).toContain('Du skapar löpprogram')
    expect(prompt.systemContext).toMatch(SWEDISH_CHARS)
  })
})
