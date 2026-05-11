import { describe, expect, it } from 'vitest'
import {
  buildRaceFuelingProductItems,
  buildRaceFuelingProductTiming,
  normalizeRaceFuelingProductItems,
  normalizeRaceFuelingProductPlan,
  retargetRaceFuelingProductPlan,
  summarizeRaceFuelingProductItems,
  summarizeRaceFuelingProductPlan,
} from './product-plan'

describe('normalizeRaceFuelingProductPlan', () => {
  it('normalizes stored product plan JSON', () => {
    const plan = normalizeRaceFuelingProductPlan({
      version: 1,
      targetCarbsG: 180,
      totalCarbsG: 190,
      differenceG: 10,
      marginLabel: 'Tight',
      items: [
        { label: 'Gel', count: 6, carbsPerItemG: 25, totalCarbsG: 150 },
        { label: 'Flaskor sportdryck', count: 1, carbsPerItemG: 40, totalCarbsG: 40 },
      ],
    })

    expect(plan?.totalCarbsG).toBe(190)
    expect(summarizeRaceFuelingProductPlan(plan!)).toBe('6 gel à 25 g, 1 flaskor sportdryck à 40 g')
  })

  it('rejects malformed values', () => {
    expect(normalizeRaceFuelingProductPlan({ version: 2 })).toBeNull()
    expect(normalizeRaceFuelingProductPlan(null)).toBeNull()
  })

  it('spreads product units across race timing', () => {
    const plan = normalizeRaceFuelingProductPlan({
      version: 1,
      targetCarbsG: 180,
      totalCarbsG: 190,
      differenceG: 10,
      marginLabel: 'Tight',
      items: [
        { label: 'Gel', count: 3, carbsPerItemG: 25, totalCarbsG: 75 },
        { label: 'Flaskor sportdryck', count: 1, carbsPerItemG: 40, totalCarbsG: 40 },
      ],
    })

    const timing = buildRaceFuelingProductTiming(plan, 100)

    expect(timing).toEqual([
      { minute: 20, label: '20 min', products: ['Gel (25 g)'], carbsG: 25 },
      { minute: 40, label: '40 min', products: ['Gel (25 g)'], carbsG: 25 },
      { minute: 60, label: '60 min', products: ['Gel (25 g)'], carbsG: 25 },
      { minute: 80, label: '80 min', products: ['Flaskor sportdryck (40 g)'], carbsG: 40 },
    ])
  })

  it('normalizes saved workout product items and ignores malformed rows', () => {
    const items = normalizeRaceFuelingProductItems([
      { label: 'Gel', count: 2, carbsPerItemG: 25, totalCarbsG: 50 },
      { label: 'Sportdryck', count: '1', carbsPerItemG: 40, totalCarbsG: 40 },
      { label: 'Chews/bar', count: 1, carbsPerItemG: 20, totalCarbsG: 20 },
      null,
    ])

    expect(items).toEqual([
      { label: 'Gel', count: 2, carbsPerItemG: 25, totalCarbsG: 50 },
      { label: 'Chews/bar', count: 1, carbsPerItemG: 20, totalCarbsG: 20 },
    ])
    expect(summarizeRaceFuelingProductItems(items)).toBe('2 gel à 25 g, 1 chews/bar à 20 g')
  })

  it('builds product items from calculator values', () => {
    const items = buildRaceFuelingProductItems([
      { label: 'Gel', count: 3, carbsPerItemG: 25 },
      { label: 'Sportdryck', count: 1, carbsPerItemG: 40 },
      { label: 'Chews/bar', count: 0, carbsPerItemG: 20 },
    ])

    expect(items).toEqual([
      { label: 'Gel', count: 3, carbsPerItemG: 25, totalCarbsG: 75 },
      { label: 'Sportdryck', count: 1, carbsPerItemG: 40, totalCarbsG: 40 },
    ])
  })

  it('retargets a stored product plan when race totals change', () => {
    const plan = normalizeRaceFuelingProductPlan({
      version: 1,
      targetCarbsG: 180,
      totalCarbsG: 190,
      differenceG: 10,
      marginLabel: 'Tight',
      items: [{ label: 'Gel', count: 6, carbsPerItemG: 25, totalCarbsG: 150 }],
    })

    const retargeted = retargetRaceFuelingProductPlan(plan!, 220)

    expect(retargeted.targetCarbsG).toBe(220)
    expect(retargeted.differenceG).toBe(-30)
    expect(retargeted.marginLabel).toBe('Saknas')
    expect(retargeted.items).toEqual(plan?.items)
    expect(retargeted.updatedAt).toBeTruthy()
  })
})
