import { describe, expect, it } from 'vitest'

import { calculateMacroDistributionPercentages } from '../macro-distribution'

describe('calculateMacroDistributionPercentages', () => {
  it('calculates macro distribution from eaten grams using macro calories', () => {
    expect(calculateMacroDistributionPercentages({
      carbsGrams: 151,
      proteinGrams: 83,
      fatGrams: 119,
    })).toEqual({
      carbsPercent: 30,
      proteinPercent: 17,
      fatPercent: 53,
    })
  })

  it('keeps planned target percentages stable for the same macro target inputs', () => {
    expect(calculateMacroDistributionPercentages({
      carbsGrams: 257,
      proteinGrams: 100,
      fatGrams: 68,
    })).toEqual({
      carbsPercent: 50,
      proteinPercent: 20,
      fatPercent: 30,
    })
  })

  it('returns zero percentages when no macro calories are available', () => {
    expect(calculateMacroDistributionPercentages({
      carbsGrams: 0,
      proteinGrams: 0,
      fatGrams: 0,
    })).toEqual({
      carbsPercent: 0,
      proteinPercent: 0,
      fatPercent: 0,
    })
  })

  it('rounds to a distribution that always totals 100 percent', () => {
    const distribution = calculateMacroDistributionPercentages({
      carbsGrams: 1,
      proteinGrams: 1,
      fatGrams: 1,
    })

    expect(distribution.carbsPercent + distribution.proteinPercent + distribution.fatPercent).toBe(100)
  })
})
