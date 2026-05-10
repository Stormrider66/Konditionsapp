import { describe, expect, it } from 'vitest'
import { buildRaceFuelingProductTiming, normalizeRaceFuelingProductPlan, summarizeRaceFuelingProductPlan } from './product-plan'

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
})
