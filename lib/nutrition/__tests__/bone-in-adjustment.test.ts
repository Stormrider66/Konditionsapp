import { describe, expect, it } from 'vitest'
import { applyBoneInAdjustment, detectBoneInAdjustment } from '@/lib/nutrition/bone-in-adjustment'

const makeItem = (overrides = {}) => ({
  name: 'Kycklingklubbor',
  category: 'PROTEIN',
  estimatedGrams: 300,
  portionDescription: '300 g med ben',
  calories: 645,
  proteinGrams: 81,
  carbsGrams: 0,
  fatGrams: 36,
  fiberGrams: 0,
  saturatedFatGrams: 9,
  ...overrides,
})

describe('bone-in nutrition adjustment', () => {
  it('detects chicken drumsticks and estimates edible grams', () => {
    const adjustment = detectBoneInAdjustment(makeItem())

    expect(adjustment).toMatchObject({
      edibleFraction: 0.65,
      edibleGrams: 195,
      reason: 'kycklingklubba med ben',
    })
  })

  it('scales macros to the edible portion while keeping gross grams in English by default', () => {
    const adjusted = applyBoneInAdjustment(makeItem())

    expect(adjusted.estimatedGrams).toBe(300)
    expect(adjusted.proteinGrams).toBe(52.7)
    expect(adjusted.calories).toBe(419.3)
    expect(adjusted.fatGrams).toBe(23.4)
    expect(adjusted.saturatedFatGrams).toBe(5.9)
    expect(adjusted.portionDescription).toBe('300 g med ben (about 195 g edible after bone)')
  })

  it('preserves Swedish edible portion wording when requested', () => {
    const adjusted = applyBoneInAdjustment(makeItem(), 'sv')

    expect(adjusted.portionDescription).toBe('300 g med ben (ca 195 g ätbart efter ben)')
  })

  it('uses generic bone-in adjustment for animal protein with explicit bone text', () => {
    const adjusted = applyBoneInAdjustment(
      makeItem({
        name: 'Lax med ben',
        estimatedGrams: 200,
        portionDescription: '200 g med ben',
        calories: 416,
        proteinGrams: 40,
        fatGrams: 26,
      }),
      'sv'
    )

    expect(adjusted.estimatedGrams).toBe(200)
    expect(adjusted.proteinGrams).toBe(28)
    expect(adjusted.portionDescription).toContain('ca 140 g ätbart')
  })

  it('does not adjust boneless cuts or fillets', () => {
    const item = makeItem({
      name: 'Kycklingfilé',
      estimatedGrams: 180,
      portionDescription: '180 g',
      proteinGrams: 55,
    })

    expect(applyBoneInAdjustment(item)).toBe(item)
  })

  it('does not apply the same adjustment twice when description already says edible', () => {
    const item = makeItem({
      portionDescription: '300 g with bone (about 195 g edible after bone)',
      proteinGrams: 52.7,
    })

    expect(applyBoneInAdjustment(item)).toBe(item)
  })
})
