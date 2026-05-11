import { describe, expect, it } from 'vitest'
import { estimateRaceFueling, estimateSubstrateOxidationFromStage } from './race-fueling'
import type { FuelingTestStage } from './types'

const metabolicStages: FuelingTestStage[] = [
  { sequence: 1, duration: 4, heartRate: 114, lactate: 1.4, speed: 7.2, vo2: 28, rer: 0.87, vco2: 2138 },
  { sequence: 2, duration: 4, heartRate: 122, lactate: 1.4, speed: 8.0, vo2: 30, rer: 0.86, vco2: 2232 },
  { sequence: 3, duration: 4, heartRate: 131, lactate: 1.6, speed: 8.8, vo2: 33, rer: 0.81, vco2: 2333 },
  { sequence: 4, duration: 4, heartRate: 134, lactate: 1.7, speed: 9.6, vo2: 34, rer: 0.82, vco2: 2524 },
  { sequence: 5, duration: 4, heartRate: 143, lactate: 1.8, speed: 10.4, vo2: 36, rer: 0.79, vco2: 2780 },
  { sequence: 6, duration: 4, heartRate: 154, lactate: 1.8, speed: 11.2, vo2: 40, rer: 0.86, vco2: 2911 },
  { sequence: 7, duration: 4, heartRate: 163, lactate: 3.2, speed: 12.0, vo2: 42, rer: 0.88, vco2: 3302 },
  { sequence: 8, duration: 4, heartRate: 169, lactate: 5.3, speed: 12.8, vo2: 45, rer: 0.87, vco2: 3446 },
]

describe('race fueling estimates', () => {
  it('calculates carbohydrate oxidation from VO2 and VCO2', () => {
    const oxidation = estimateSubstrateOxidationFromStage(metabolicStages[6], 75)

    expect(oxidation?.method).toBe('VO2_VCO2')
    expect(oxidation?.isPhysiologicallyReliable).toBe(true)
    expect(oxidation?.carbohydrateGramsPerHour).toBeGreaterThan(175)
    expect(oxidation?.carbohydrateGramsPerHour).toBeLessThan(190)
  })

  it('turns race demand into practical conservative, recommended, and ambitious intake scenarios', () => {
    const estimate = estimateRaceFueling(
      {
        sport: 'RUNNING',
        distanceKm: 42.195,
        targetSpeedKmh: 12,
      },
      metabolicStages,
      { weightKg: 75, currentGutToleranceCarbsPerHour: 70 }
    )

    expect(estimate.confidence).toBe('HIGH')
    expect(estimate.estimatedDurationMinutes).toBeGreaterThan(210)
    expect(estimate.carbohydrateDemandPerHour).toBeGreaterThan(175)
    expect(estimate.recommendedCarbsPerHour).toBeLessThanOrEqual(85)
    expect(estimate.scenarios.map((scenario) => scenario.key)).toEqual([
      'CONSERVATIVE',
      'RECOMMENDED',
      'AMBITIOUS',
    ])
    expect(estimate.scenarios[1].totalCarbs).toBeGreaterThan(250)
  })

  it('falls back to duration-based guidance when no metabolic match exists', () => {
    const estimate = estimateRaceFueling(
      {
        sport: 'CYCLING',
        durationMinutes: 240,
      },
      [],
      {}
    )

    expect(estimate.confidence).toBe('MEDIUM')
    expect(estimate.carbohydrateDemandPerHour).toBe(110)
    expect(estimate.recommendedCarbsPerHour).toBeGreaterThanOrEqual(60)
  })

  it('uses sport-aware fallback demand for non-endurance sports', () => {
    const teamEstimate = estimateRaceFueling(
      {
        sport: 'TEAM_FOOTBALL',
        durationMinutes: 120,
      },
      [],
      {}
    )
    const racketEstimate = estimateRaceFueling(
      {
        sport: 'PADEL',
        durationMinutes: 120,
      },
      [],
      {}
    )
    const strengthEstimate = estimateRaceFueling(
      {
        sport: 'STRENGTH',
        durationMinutes: 90,
      },
      [],
      {}
    )

    expect(teamEstimate.carbohydrateDemandPerHour).toBe(70)
    expect(racketEstimate.carbohydrateDemandPerHour).toBe(65)
    expect(strengthEstimate.carbohydrateDemandPerHour).toBe(55)
    expect(teamEstimate.recommendedCarbsPerHour).toBeLessThan(50)
  })

  it('uses metabolic stages for duration-only race goals when available', () => {
    const estimate = estimateRaceFueling(
      {
        sport: 'RUNNING',
        durationMinutes: 210,
      },
      metabolicStages,
      { weightKg: 75 }
    )

    expect(estimate.confidence).toBe('HIGH')
    expect(estimate.sourceStage?.sequence).toBe(1)
    expect(estimate.carbohydrateDemandPerHour).not.toBe(90)
    expect(estimate.warningsSv).not.toContain('Ingen exakt matchning mot testets intensitet hittades, så rekommendationen blir mer generell.')
  })
})
