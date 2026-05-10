import { describe, expect, it } from 'vitest'
import { normalizeRaceFuelingProductPlan, summarizeRaceFuelingProductPlan } from './product-plan'

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
})
