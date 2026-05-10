import { describe, expect, it } from 'vitest'
import { buildRaceDayFuelingPlan } from './race-day-plan'

describe('buildRaceDayFuelingPlan', () => {
  it('builds practical pack and timing guidance', () => {
    const plan = buildRaceDayFuelingPlan(75, 180)

    expect(plan).toMatchObject({
      carbsPerHour: 75,
      durationMinutes: 180,
      totalCarbs: 225,
      intakeEvery20Min: 25,
      gelEquivalentCount: 9,
      bottleMixCount: 6,
    })
    expect(plan?.timing[0]).toEqual({ minute: 20, carbs: 25, label: '20 min' })
    expect(plan?.timing).toHaveLength(8)
  })

  it('returns null without a carbohydrate target', () => {
    expect(buildRaceDayFuelingPlan(null, 180)).toBeNull()
  })
})
