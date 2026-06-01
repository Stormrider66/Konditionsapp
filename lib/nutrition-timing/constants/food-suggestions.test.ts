import { describe, expect, it } from 'vitest'
import {
  CARB_SOURCES,
  MIXED_FOODS,
  foodSuggestionName,
  foodSuggestionPortion,
  formatFoodSuggestion,
} from './food-suggestions'

describe('food suggestion localization', () => {
  it('uses English names and portions for English UI', () => {
    const toast = CARB_SOURCES.find((food) => food.nameEn === 'White toast')

    expect(toast).toBeDefined()
    expect(foodSuggestionName(toast!, 'en')).toBe('White toast')
    expect(foodSuggestionPortion(toast!, 'en')).toBe('2 slices')
  })

  it('defaults to English names and portions', () => {
    const toast = CARB_SOURCES.find((food) => food.nameEn === 'White toast')

    expect(toast).toBeDefined()
    expect(foodSuggestionName(toast!)).toBe('White toast')
    expect(foodSuggestionPortion(toast!)).toBe('2 slices')
  })

  it('keeps Swedish names and portions for Swedish UI', () => {
    const toast = CARB_SOURCES.find((food) => food.nameEn === 'White toast')

    expect(toast).toBeDefined()
    expect(foodSuggestionName(toast!, 'sv')).toBe('Rostat bröd (vitt)')
    expect(foodSuggestionPortion(toast!, 'sv')).toBe('2 skivor')
  })

  it('formats mixed foods without Swedish portion leftovers in English', () => {
    const eggsOnToast = MIXED_FOODS.find((food) => food.nameEn === 'Eggs on toast')

    expect(eggsOnToast).toBeDefined()
    expect(formatFoodSuggestion(eggsOnToast!, 'en')).toContain('Eggs on toast (2 eggs + 2 slices bread)')
    expect(formatFoodSuggestion(eggsOnToast!, 'en')).toContain('carbs')
    expect(formatFoodSuggestion(eggsOnToast!, 'en')).not.toMatch(/[åäöÅÄÖ]|skivor|bröd|ägg/)
  })
})
