import { describe, expect, it } from 'vitest'
import { buildFuelingBuildUpPlan } from './build-up-plan'

describe('buildFuelingBuildUpPlan', () => {
  it('builds a gradual progression from current tolerance to race target', () => {
    const plan = buildFuelingBuildUpPlan({
      raceTargetGPerHour: 85,
      currentGutToleranceGPerHour: 55,
      weeksAvailable: 5,
    })

    expect(plan?.startCarbsGPerHour).toBe(55)
    expect(plan?.raceTargetGPerHour).toBe(85)
    expect(plan?.sessions).toHaveLength(5)
    expect(plan?.sessions[0].targetCarbsGPerHour).toBe(55)
    expect(plan?.sessions.at(-1)?.targetCarbsGPerHour).toBe(85)
    expect(plan?.sessions.some((session) => session.focusSv === 'Bygg upptag')).toBe(true)
  })

  it('uses a short maintenance progression when tolerance is already near target', () => {
    const plan = buildFuelingBuildUpPlan({
      raceTargetGPerHour: 70,
      currentGutToleranceGPerHour: 68,
    })

    expect(plan?.sessions).toHaveLength(3)
    expect(plan?.sessions.at(-1)?.focusSv).toBe('Race-repetition')
  })

  it('returns null without a usable target', () => {
    expect(buildFuelingBuildUpPlan({ raceTargetGPerHour: null })).toBeNull()
    expect(buildFuelingBuildUpPlan({ raceTargetGPerHour: 0 })).toBeNull()
  })
})
