import { describe, expect, it } from 'vitest'
import { solvePortions, type SolverFood } from '../portion-solver'

const yoghurt: SolverFood = {
  name: 'Grekisk yoghurt',
  source: 'DATABASE',
  per100g: { caloriesKcal: 59, proteinG: 10, carbsG: 3.6, fatG: 0.4 },
}
const banana: SolverFood = {
  name: 'Banan',
  source: 'DATABASE',
  per100g: { caloriesKcal: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3 },
}

describe('solvePortions', () => {
  it('hits the calorie target closely for yoghurt + banana', () => {
    const target = { caloriesKcal: 400, proteinG: 30, carbsG: 50, fatG: 8 }
    const result = solvePortions([yoghurt, banana], target)

    // Calories are the primary constraint — should land within 15% of target.
    expect(result.totals.caloriesKcal).toBeGreaterThan(target.caloriesKcal * 0.85)
    expect(result.totals.caloriesKcal).toBeLessThan(target.caloriesKcal * 1.15)

    // Every food gets a sane, non-negative, bounded amount.
    expect(result.foods).toHaveLength(2)
    for (const food of result.foods) {
      expect(food.grams).toBeGreaterThanOrEqual(0)
      expect(food.grams).toBeLessThanOrEqual(2000)
    }
    // Both chosen foods should actually be used.
    expect(result.foods[0].grams).toBeGreaterThan(0)
    expect(result.foods[1].grams).toBeGreaterThan(0)
  })

  it('scales a single food to the calorie target', () => {
    const target = { caloriesKcal: 300, proteinG: 20, carbsG: 30, fatG: 5 }
    const result = solvePortions([yoghurt], target)
    // 300 kcal of 59 kcal/100g yoghurt ~= 508 g.
    expect(result.foods[0].grams).toBeGreaterThan(400)
    expect(result.foods[0].grams).toBeLessThan(620)
    expect(result.totals.caloriesKcal).toBeGreaterThan(255)
    expect(result.totals.caloriesKcal).toBeLessThan(345)
  })

  it('does not blow up on a zero-calorie food', () => {
    const water: SolverFood = {
      name: 'Vatten',
      source: 'DATABASE',
      per100g: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    }
    const target = { caloriesKcal: 200, proteinG: 15, carbsG: 20, fatG: 4 }
    const result = solvePortions([water, yoghurt], target)
    expect(result.foods[0].grams).toBe(0)
    expect(result.foods[1].grams).toBeGreaterThan(0)
    expect(Number.isFinite(result.totals.caloriesKcal)).toBe(true)
  })
})
