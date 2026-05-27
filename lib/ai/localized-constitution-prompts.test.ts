import { describe, expect, it } from 'vitest'
import { buildAthleteSystemPrompt } from './athlete-prompts'
import { buildProgramGeneratorSystemPrompt } from './program-generator/prompts'
import { getPerformanceAnalysisSystemPrompt } from './performance-analysis/prompts'

describe('AI prompt constitution localization', () => {
  it('uses English constitution text in English athlete chat prompts', () => {
    const prompt = buildAthleteSystemPrompt('No active restrictions.', undefined, undefined, undefined, 'en')

    expect(prompt).toContain('ATHLETE CHAT PRINCIPLES')
    expect(prompt).toContain('Respond in English')
    expect(prompt).not.toMatch(/[åäöÅÄÖ]|\b(KONSTITUTION|ATLET-CHATTPRINCIPER|Svara på svenska)\b/)
  })

  it('uses English constitution text in English program and analysis prompts', () => {
    const program = buildProgramGeneratorSystemPrompt('en')
    const analysis = getPerformanceAnalysisSystemPrompt('en')

    expect(program).toContain('PROGRAM GENERATION PRINCIPLES')
    expect(analysis).toContain('ANALYSIS-SPECIFIC PRINCIPLES')
    expect(`${program}\n${analysis}`).not.toMatch(/[åäöÅÄÖ]|\b(KONSTITUTION|PROGRAMGENERERINGSPRINCIPER|ANALYSSPECIFIKA)\b/)
  })

  it('preserves Swedish constitution text in Swedish prompt branches', () => {
    const program = buildProgramGeneratorSystemPrompt('sv')
    const analysis = getPerformanceAnalysisSystemPrompt('sv')

    expect(program).toContain('PROGRAMGENERERINGSPRINCIPER')
    expect(analysis).toContain('ANALYSSPECIFIKA PRINCIPER')
  })
})
