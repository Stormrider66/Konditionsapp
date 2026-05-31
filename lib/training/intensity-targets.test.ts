import { describe, expect, it } from 'vitest'
import {
  formatMethodology,
  getDefaultTargetsForSport,
  getRecommendedTargets,
  getVolumeAdjustedTargets,
} from './intensity-targets'

describe('intensity target locale copy', () => {
  it('uses English labels by default', () => {
    expect(getDefaultTargetsForSport('GENERAL_FITNESS').label).toBe('General Fitness')
    expect(getVolumeAdjustedTargets({ weeklyHours: 7, sessionsPerWeek: 4 }).label).toBe('Polarized (5-9h)')
    expect(formatMethodology('BALANCED')).toBe('Balanced')
  })

  it('keeps Swedish labels when requested', () => {
    expect(getVolumeAdjustedTargets({ weeklyHours: 7, sessionsPerWeek: 4, locale: 'sv' }).label).toBe('Polariserad (5-9h)')
    expect(formatMethodology('BALANCED', 'sv')).toBe('Balanserad')
  })

  it('defaults recommendation advice to English and localizes Swedish advice', () => {
    const customTargets = {
      easyPercent: 90,
      moderatePercent: 5,
      hardPercent: 5,
      methodology: 'CUSTOM' as const,
    }

    const english = getRecommendedTargets('RUNNING', customTargets, 4, 3)
    const swedish = getRecommendedTargets('RUNNING', customTargets, 4, 3, 'sv')

    expect(english.advice).toContain('With 4.0h/week')
    expect(swedish.advice).toContain('Med 4.0h/vecka')
  })
})
