import { describe, it, expect } from 'vitest'
import {
  calculateWBGT,
  calculatePaceAdjustment,
  calculateAltitudeAdjustment,
  calculateWindResistance
} from '@/lib/training-engine/advanced-features/environmental-adjustments'

describe('Environmental Adjustments', () => {
  it('calculates WBGT for extreme heat', () => {
    const wbgt = calculateWBGT({
      temperatureC: 35,
      humidityPercent: 80,
      dewPointC: 30
    })

    expect(wbgt).toBeGreaterThan(28)
  })

  it('provides conservative pace adjustment guidance for hot WBGT', () => {
    const adjustment = calculatePaceAdjustment({
      wbgt: 30,
      heatAcclimated: false
    })

    expect(adjustment.paceSlowdownPercent).toBeGreaterThanOrEqual(15)
    expect(adjustment.guidance).toContain('Consider canceling')
  })

  it('reduces slowdown by 50% for heat-acclimated athlete', () => {
    const unacclimated = calculatePaceAdjustment({
      wbgt: 25,
      heatAcclimated: false
    })

    const acclimated = calculatePaceAdjustment({
      wbgt: 25,
      heatAcclimated: true
    })

    expect(acclimated.paceSlowdownPercent).toBeCloseTo(
      unacclimated.paceSlowdownPercent * 0.5,
      1
    )
  })

  it('calculates altitude adjustment for 2000m threshold workout', () => {
    const adjustment = calculateAltitudeAdjustment({
      altitudeMeters: 2000,
      acclimatizationDays: 0,
      workoutIntensity: 'THRESHOLD'
    })

    expect(adjustment).toBeGreaterThan(5)
    expect(adjustment).toBeLessThan(15)
  })

  it('reduces altitude impact with acclimatization', () => {
    const day0 = calculateAltitudeAdjustment({
      altitudeMeters: 2000,
      acclimatizationDays: 0,
      workoutIntensity: 'THRESHOLD'
    })

    const day14 = calculateAltitudeAdjustment({
      altitudeMeters: 2000,
      acclimatizationDays: 14,
      workoutIntensity: 'THRESHOLD'
    })

    expect(day14).toBeLessThan(day0)
    expect(day14).toBeCloseTo(day0 * 0.5, 1)
  })

  it('calculates headwind resistance impact', () => {
    const resistance = calculateWindResistance({
      windSpeedMps: 10,
      windDirection: 0,
      runnerDirection: 0,
      runnerSpeedMps: 4
    })

    expect(resistance).toBeGreaterThan(5)
  })

  it('calculates tailwind benefit', () => {
    const resistance = calculateWindResistance({
      windSpeedMps: 5,
      windDirection: 180,
      runnerDirection: 0,
      runnerSpeedMps: 4
    })

    expect(resistance).toBeLessThan(0)
  })
})

