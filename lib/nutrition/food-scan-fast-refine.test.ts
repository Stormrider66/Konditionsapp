import { describe, expect, it } from 'vitest'
import {
  applySimpleFoodIdentityCorrection,
  parseSimpleFoodIdentityCorrection,
  type FoodReferenceMatch,
} from './food-scan-fast-refine'

const baseAnalysis = {
  success: true,
  items: [
    {
      name: 'Pasta',
      category: 'GRAIN',
      estimatedGrams: 100,
      portionDescription: '100 g',
      calories: 130,
      proteinGrams: 5,
      carbsGrams: 25,
      fatGrams: 1,
      fiberGrams: 2,
    },
  ],
  totals: {
    calories: 130,
    proteinGrams: 5,
    carbsGrams: 25,
    fatGrams: 1,
    fiberGrams: 2,
  },
  mealDescription: 'Pasta',
  mealType: 'LUNCH',
  confidence: 0.8,
  notes: [],
}

const referenceWithoutEnglishName: FoodReferenceMatch = {
  nameSv: 'Majspasta kokt',
  nameEn: null,
  category: 'GRAIN',
  caloriesPer100g: 140,
  proteinPer100g: 4,
  carbsPer100g: 28,
  fatPer100g: 1.2,
  fiberPer100g: 2.5,
}

describe('food scan fast refine localization', () => {
  it('uses the English correction text when a matched food has no English display name', () => {
    const correction = parseSimpleFoodIdentityCorrection('it is 1.5 dl corn pasta')

    expect(correction).not.toBeNull()

    const refined = applySimpleFoodIdentityCorrection({
      originalAnalysis: baseAnalysis,
      correction: correction!,
      foodMatch: referenceWithoutEnglishName,
      locale: 'en',
    })

    expect(refined?.result.items[0].name).toBe('Corn pasta')
    expect(refined?.result.items[0].portionDescription).toBe('1.5 dl')
    expect(refined?.result.mealDescription).toBe('Corn pasta')
  })

  it('keeps Swedish reference names and decimal style for Swedish users', () => {
    const correction = parseSimpleFoodIdentityCorrection('det är 1.5 dl majspasta')

    expect(correction).not.toBeNull()

    const refined = applySimpleFoodIdentityCorrection({
      originalAnalysis: baseAnalysis,
      correction: correction!,
      foodMatch: referenceWithoutEnglishName,
      locale: 'sv',
    })

    expect(refined?.result.items[0].name).toBe('Majspasta kokt')
    expect(refined?.result.items[0].portionDescription).toBe('1,5 dl')
  })
})
