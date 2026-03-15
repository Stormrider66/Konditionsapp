import {
  calculateFoodTotals,
  createEditableFoodItem,
  recalculateItemFromGrams,
  updateDensityFromManualValue,
} from '@/lib/nutrition/food-scan-recalculation'

describe('food scan recalculation', () => {
  it('recalculates item macros when grams change', () => {
    const milk = createEditableFoodItem({
      name: 'Mjolk',
      category: 'DAIRY',
      estimatedGrams: 300,
      portionDescription: '3 dl',
      calories: 180,
      proteinGrams: 10.2,
      carbsGrams: 14.4,
      fatGrams: 9.0,
      fiberGrams: 0,
    })

    const updated = recalculateItemFromGrams(milk, 260)

    expect(updated.estimatedGrams).toBe(260)
    expect(updated.calories).toBe(156)
    expect(updated.proteinGrams).toBe(8.8)
    expect(updated.carbsGrams).toBe(12.5)
    expect(updated.fatGrams).toBe(7.8)
  })

  it('uses manually edited nutrient values as the new baseline for later gram changes', () => {
    const oats = createEditableFoodItem({
      name: 'Havregryn',
      category: 'GRAIN',
      estimatedGrams: 100,
      portionDescription: '1 portion',
      calories: 370,
      proteinGrams: 13,
      carbsGrams: 60,
      fatGrams: 7,
      fiberGrams: 10,
    })

    const withManualProtein = {
      ...updateDensityFromManualValue(oats, 'proteinGrams', 15),
      proteinGrams: 15,
    }
    const updated = recalculateItemFromGrams(withManualProtein, 50)

    expect(updated.proteinGrams).toBe(7.5)
    expect(updated.calories).toBe(185)
  })

  it('sums recalculated item totals', () => {
    const milk = recalculateItemFromGrams(
      createEditableFoodItem({
        name: 'Mjolk',
        category: 'DAIRY',
        estimatedGrams: 300,
        portionDescription: '3 dl',
        calories: 180,
        proteinGrams: 10.2,
        carbsGrams: 14.4,
        fatGrams: 9,
        fiberGrams: 0,
      }),
      260
    )

    const banana = createEditableFoodItem({
      name: 'Banan',
      category: 'FRUIT',
      estimatedGrams: 120,
      portionDescription: '1 st',
      calories: 105,
      proteinGrams: 1.3,
      carbsGrams: 27,
      fatGrams: 0.3,
      fiberGrams: 3.1,
    })

    const totals = calculateFoodTotals([milk, banana])

    expect(totals.calories).toBe(261)
    expect(totals.proteinGrams).toBeCloseTo(10.1, 5)
    expect(totals.carbsGrams).toBeCloseTo(39.5, 5)
  })
})
