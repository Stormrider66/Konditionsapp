import { describe, expect, it } from 'vitest'
import {
  generateStrengthSessionPrompt,
  progressionRecommendationPrompt,
} from './strength-program-prompts'

describe('strength program prompts localization', () => {
  it('keeps English strength session prompts free from Swedish phase wording', () => {
    const prompt = generateStrengthSessionPrompt({
      phase: 'POWER',
      goal: 'power',
      athleteLevel: 'INTERMEDIATE',
      equipmentAvailable: ['barbell', 'box'],
      timeAvailable: 45,
      includeWarmup: true,
      includeCore: true,
      includeCooldown: true,
      locale: 'en',
    })

    expect(prompt).toContain('30-60% 1RM (speed is prioritized)')
    expect(prompt).toContain('Write all user-facing names, descriptions, notes, and instructions in English')
    expect(prompt).not.toMatch(/[åäöÅÄÖ]|\b(HASTIGHET|prioriteras|Övningsnamn|Fokusera på kontroll)\b/)
  })

  it('keeps English progression prompts free from Swedish phase wording', () => {
    const prompt = progressionRecommendationPrompt({
      exerciseId: 'exercise-1',
      exerciseName: 'Box Jump',
      recentLogs: [{ weight: 40, reps: 5, date: '2026-05-20' }],
      estimated1RM: 60,
      phase: 'POWER',
      locale: 'en',
    })

    expect(prompt).toContain('Target intensity: 30-60% 1RM (speed is prioritized)')
    expect(prompt).toContain('Write all user-facing content in English')
    expect(prompt).not.toMatch(/[åäöÅÄÖ]|\b(HASTIGHET|Målintensitet|FRÅGA)\b/)
  })

  it('preserves Swedish strength prompts when requested', () => {
    const prompt = generateStrengthSessionPrompt({
      phase: 'POWER',
      goal: 'power',
      athleteLevel: 'INTERMEDIATE',
      equipmentAvailable: ['skivstång'],
      timeAvailable: 45,
      includeWarmup: true,
      includeCore: true,
      includeCooldown: true,
      locale: 'sv',
    })

    expect(prompt).toContain('HASTIGHET prioriteras')
    expect(prompt).toContain('Övningsnamn på svenska')
  })
})
