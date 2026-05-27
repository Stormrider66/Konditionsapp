import { describe, expect, it } from 'vitest'
import { buildAthleteSystemPrompt } from './athlete-prompts'
import { buildCoachSystemPrompt } from './chat/system-prompt'
import { buildProgramGeneratorSystemPrompt } from './program-generator/prompts'
import { getPerformanceAnalysisSystemPrompt } from './performance-analysis/prompts'

describe('AI prompt constitution localization', () => {
  it('uses English constitution text in English athlete chat prompts', () => {
    const prompt = buildAthleteSystemPrompt('No active restrictions.', undefined, undefined, undefined, 'en')

    expect(prompt).toContain('ATHLETE CHAT PRINCIPLES')
    expect(prompt).toContain('Respond in English')
    expect(prompt).not.toMatch(/[åäöÅÄÖ]|\b(KONSTITUTION|ATLET-CHATTPRINCIPER|Svara på svenska)\b/)
  })

  it('uses an English body in English coach chat prompts', () => {
    const prompt = buildCoachSystemPrompt({ locale: 'en' })

    expect(prompt).toContain('COACH CHAT PRINCIPLES')
    expect(prompt).toContain('FLOATING PAGE ASSISTANT')
    expect(prompt).toContain('TEAM CALENDAR AND HOCKEY WEEK')
    expect(prompt).toContain('Respond in English unless the coach explicitly asks for Swedish')
    expect(prompt).not.toMatch(/\b(Du är|FLYTANDE SIDASSISTENT|PROAKTIV COACHOPERATOR|DINA KUNSKAPSOMRÅDEN|Svara på svenska)\b/)
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
