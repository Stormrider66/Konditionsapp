import { SportType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { fuelingPlanInputSchema } from './plan-input'

describe('fuelingPlanInputSchema', () => {
  it('accepts a duration-based target without distance pace context', () => {
    const result = fuelingPlanInputSchema.safeParse({
      sport: SportType.RUNNING,
      durationMinutes: 210,
    })

    expect(result.success).toBe(true)
  })

  it('accepts a distance target with speed', () => {
    const result = fuelingPlanInputSchema.safeParse({
      sport: SportType.RUNNING,
      distanceKm: 42.2,
      targetSpeedKmh: 12,
    })

    expect(result.success).toBe(true)
  })

  it('accepts a distance target with pace', () => {
    const result = fuelingPlanInputSchema.safeParse({
      sport: SportType.RUNNING,
      distanceKm: 21.1,
      targetPaceMinKm: 4.5,
    })

    expect(result.success).toBe(true)
  })

  it('rejects a distance target with power but no expected time or pace', () => {
    const result = fuelingPlanInputSchema.safeParse({
      sport: SportType.CYCLING,
      distanceKm: 120,
      targetPowerWatts: 250,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter expected time, or distance together with target pace/speed.')
  })
})
