import { describe, expect, it } from 'vitest'
import { redistributeSkippedMeals, type RedistributeMealInput } from '../skip-redistribute'

const meal = (
  id: string,
  kcal: number,
  p: number,
  c: number,
  f: number,
  skipped = false,
  logged = false
): RedistributeMealInput => ({ id, caloriesKcal: kcal, proteinG: p, carbsG: c, fatG: f, skipped, logged })

describe('redistributeSkippedMeals', () => {
  it('redistributes a skipped meal across remaining un-logged meals', () => {
    const meals = [
      meal('b', 500, 30, 60, 15),
      meal('l', 600, 40, 70, 18, true), // skipped lunch
      meal('d', 700, 45, 80, 20),
    ]
    const r = redistributeSkippedMeals(meals)
    expect(r.get('l')!.skipped).toBe(true)
    expect(r.get('b')!.caloriesKcal).toBeGreaterThan(500)
    expect(r.get('d')!.caloriesKcal).toBeGreaterThan(700)
    expect(r.get('b')!.redistributed).toBe(true)
    expect(r.get('d')!.redistributed).toBe(true)
    // Non-skipped total should equal the original day total (1800) when the cap
    // is generous enough to absorb everything.
    const nonSkipped = r.get('b')!.caloriesKcal + r.get('d')!.caloriesKcal
    expect(nonSkipped).toBeGreaterThan(1750)
    expect(nonSkipped).toBeLessThanOrEqual(1810)
  })

  it('does not change logged meals and respects the growth cap', () => {
    const meals = [
      meal('b', 500, 30, 60, 15),
      meal('l', 1000, 60, 120, 30, true), // big skipped meal
      meal('d', 200, 15, 25, 6, false, true), // already logged
    ]
    const r = redistributeSkippedMeals(meals)
    expect(r.get('d')!.caloriesKcal).toBe(200)
    expect(r.get('d')!.redistributed).toBe(false)
    // Breakfast is the only recipient; capped at 1.75x = 875.
    expect(r.get('b')!.caloriesKcal).toBeLessThanOrEqual(875)
    expect(r.get('b')!.caloriesKcal).toBeGreaterThan(500)
  })

  it('leaves meals unchanged when nothing is skipped', () => {
    const meals = [meal('b', 500, 30, 60, 15), meal('d', 700, 45, 80, 20)]
    const r = redistributeSkippedMeals(meals)
    expect(r.get('b')!.caloriesKcal).toBe(500)
    expect(r.get('b')!.redistributed).toBe(false)
    expect(r.get('d')!.caloriesKcal).toBe(700)
  })

  it('no-ops when every non-skipped meal is already logged', () => {
    const meals = [
      meal('b', 500, 30, 60, 15, false, true),
      meal('l', 600, 40, 70, 18, true),
    ]
    const r = redistributeSkippedMeals(meals)
    expect(r.get('b')!.caloriesKcal).toBe(500)
    expect(r.get('b')!.redistributed).toBe(false)
  })
})
