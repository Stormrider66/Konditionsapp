import { describe, expect, it } from 'vitest'
import { buildConstitutionPreamble } from './constitution'

describe('buildConstitutionPreamble localization', () => {
  it('builds an English WOD constitution without Swedish safety wording', () => {
    const preamble = buildConstitutionPreamble('wod', undefined, 'en')

    expect(preamble).toContain('CONSTITUTION - CORE PRINCIPLES')
    expect(preamble).toContain('WOD-SPECIFIC PRINCIPLES')
    expect(preamble).toContain('ALWAYS include a warm-up and cooldown')
    expect(preamble).not.toMatch(/[åäöÅÄÖ]|\b(KONSTITUTION|GRUNDLÄGGANDE|uppvärmning|nedvarvning)\b/)
  })

  it('builds English chat and analysis domain sections', () => {
    const athlete = buildConstitutionPreamble('chat', 'athlete', 'en')
    const coach = buildConstitutionPreamble('chat', 'coach', 'en')
    const analysis = buildConstitutionPreamble('analysis', undefined, 'en')

    expect(athlete).toContain('ATHLETE CHAT PRINCIPLES')
    expect(coach).toContain('COACH CHAT PRINCIPLES')
    expect(analysis).toContain('ANALYSIS-SPECIFIC PRINCIPLES')
    expect(`${athlete}\n${coach}\n${analysis}`).not.toMatch(/[åäöÅÄÖ]|\b(ATLET|ANALYSSPECIFIKA|överträning)\b/)
  })

  it('uses the English constitution by default', () => {
    const preamble = buildConstitutionPreamble('program')

    expect(preamble).toContain('CONSTITUTION - CORE PRINCIPLES')
    expect(preamble).toContain('PROGRAM GENERATION PRINCIPLES')
    expect(preamble).not.toContain('KONSTITUTION')
  })

  it('preserves the Swedish constitution when requested', () => {
    const preamble = buildConstitutionPreamble('program', undefined, 'sv')

    expect(preamble).toContain('KONSTITUTION')
    expect(preamble).toContain('PROGRAMGENERERINGSPRINCIPER')
  })
})
