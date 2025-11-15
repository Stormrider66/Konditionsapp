import { describe, it, expect } from 'vitest'
import {
  calculateVDOT,
  getEquivalentRaceTimes,
  getTrainingPaces,
  findVDOTFromRaceTime
} from '../vdot'
import { predictTimeFromVDOT } from '../race-predictions'

describe('VDOT Calculations', () => {
  it('round-trips VDOT through predicted race performances', () => {
    const baseVDOT = 50
    const fiveKTime = predictTimeFromVDOT(baseVDOT, 5000)
    const tenKTime = predictTimeFromVDOT(baseVDOT, 10000)

    const derivedFiveK = calculateVDOT(5000, fiveKTime)
    const derivedTenK = calculateVDOT(10000, tenKTime)

    expect(derivedFiveK).toBeCloseTo(baseVDOT, 0)
    expect(derivedTenK).toBeCloseTo(baseVDOT, 0)
  })

  it('round-trips equivalent race times and VDOT lookups', () => {
    const expectedVDOT = calculateVDOT(5000, 21 * 60)
    const equivalents = getEquivalentRaceTimes(expectedVDOT)

    expect(equivalents['5K']).toBeDefined()
    expect(equivalents['Marathon']).toBeDefined()

    const derivedVDOT = findVDOTFromRaceTime('5K', 21 * 60)
    expect(derivedVDOT).toBeCloseTo(expectedVDOT, 1)
  })

  it('produces internally consistent training paces', () => {
    const paces = getTrainingPaces(52)

    expect(paces.easy.min).toBeGreaterThan(paces.easy.max) // min pace = slower (more seconds)
    expect(paces.threshold.pace).toBeLessThan(paces.marathon.pace)
    expect(paces.interval.pace).toBeLessThan(paces.threshold.pace)
    expect(paces.repetition.pace).toBeLessThan(paces.interval.pace)
    expect(paces.easy.formatted).toContain('-')
  })
})

