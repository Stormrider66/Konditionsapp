import { describe, expect, it } from 'vitest'
import { calculateMuscularFatigue, getFatigueDescription } from './fatigue-calculator'

describe('fatigue calculator localization', () => {
  it('defaults athlete dashboard fatigue labels to English', () => {
    const fatigue = calculateMuscularFatigue([])

    expect(fatigue.map((item) => item.muscleGroup)).toEqual([
      'Legs & glutes',
      'Core',
      'Upper body',
    ])
    expect(getFatigueDescription('HIGH')).toBe('High load - prioritize recovery')
  })

  it('preserves Swedish fatigue labels when requested', () => {
    const fatigue = calculateMuscularFatigue([], 7, 'sv')

    expect(fatigue.map((item) => item.muscleGroup)).toEqual([
      'Ben & Rumpa',
      'Core',
      'Överkropp',
    ])
    expect(getFatigueDescription('HIGH', 'sv')).toBe('Hög belastning - prioritera återhämtning')
  })
})
