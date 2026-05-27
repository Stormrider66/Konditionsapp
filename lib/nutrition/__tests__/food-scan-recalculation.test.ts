import {
  calculateFoodTotals,
  createEditableFoodItem,
  parsePortionGramsFromText,
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

  it('parses drink-style portion text into grams', () => {
    expect(parsePortionGramsFromText('2 dl')).toBe(200)
    expect(parsePortionGramsFromText('jag drack 250 ml')).toBe(250)
    expect(parsePortionGramsFromText('0,5 liter')).toBe(500)
  })

  it('ignores portion text without a concrete gram-equivalent amount', () => {
    expect(parsePortionGramsFromText('1 hel sats')).toBeNull()
    expect(parsePortionGramsFromText('ett glas')).toBeNull()
  })

  it('uses English bone-in edible portion text by default', () => {
    const chicken = createEditableFoodItem({
      name: 'Chicken drumstick with bone',
      category: 'PROTEIN',
      estimatedGrams: 300,
      portionDescription: '300 g with bone',
      calories: 645,
      proteinGrams: 81,
      carbsGrams: 0,
      fatGrams: 36,
      fiberGrams: 0,
    })

    expect(chicken.portionDescription).toBe('300 g with bone (about 195 g edible after bone)')
  })

  it('preserves Swedish bone-in edible portion text when requested', () => {
    const chicken = createEditableFoodItem({
      name: 'Kycklingklubbor',
      category: 'PROTEIN',
      estimatedGrams: 300,
      portionDescription: '300 g med ben',
      calories: 645,
      proteinGrams: 81,
      carbsGrams: 0,
      fatGrams: 36,
      fiberGrams: 0,
    }, 'sv')

    expect(chicken.portionDescription).toBe('300 g med ben (ca 195 g ätbart efter ben)')
  })
})
