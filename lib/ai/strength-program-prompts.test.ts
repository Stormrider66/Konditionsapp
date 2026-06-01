import { describe, expect, it } from 'vitest'
import {
  BIOMECHANICAL_PILLARS,
  generateStrengthSessionPrompt,
  progressionRecommendationPrompt,
  STRENGTH_GOAL_CONTEXT,
  STRENGTH_PHASE_CONTEXT,
} from './strength-program-prompts'

describe('strength program prompts localization', () => {
  it('keeps exported default strength context in English', () => {
    const exportedDefaults = [
      STRENGTH_PHASE_CONTEXT.POWER.description,
      STRENGTH_PHASE_CONTEXT.POWER.intensity,
      STRENGTH_PHASE_CONTEXT.POWER.tempo,
      ...STRENGTH_PHASE_CONTEXT.POWER.focus,
      STRENGTH_GOAL_CONTEXT['running-economy'].description,
      ...STRENGTH_GOAL_CONTEXT['running-economy'].exerciseEmphasis,
      ...STRENGTH_GOAL_CONTEXT['running-economy'].sampleExercises,
      BIOMECHANICAL_PILLARS.POSTERIOR_CHAIN.description,
      ...BIOMECHANICAL_PILLARS.POSTERIOR_CHAIN.keyExercises,
    ].join('\n')

    expect(exportedDefaults).toContain('Convert strength into explosive force and speed.')
    expect(exportedDefaults).toContain('speed is prioritized')
    expect(exportedDefaults).not.toMatch(/[åäöÅÄÖ]|\b(HASTIGHET|löpeffektivitet|Höftlyft|Marklyft)\b/)
    expect(STRENGTH_PHASE_CONTEXT.POWER.descriptionSv).toContain('Konvertera styrka')
  })

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
