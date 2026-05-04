import { describe, expect, it } from 'vitest'
import { createLactateProfileFromThresholds, analyzeLactateProfile } from '../lactate-profile-analyzer'
import { selectOptimalPaces } from '../pace-selector'

const DAVID_TEST_STAGES = [
  { sequence: 0, speed: 8.5, heartRate: 145, lactate: 1.6 },
  { sequence: 1, speed: 12, heartRate: 168, lactate: 3.3 },
  { sequence: 2, speed: 12.8, heartRate: 176, lactate: 4.7 },
  { sequence: 3, speed: 13.3, heartRate: 150, lactate: 5.7 },
  { sequence: 4, speed: 13.8, heartRate: 213, lactate: 25 },
]

const SAVED_AEROBIC_THRESHOLD = {
  speed: 9.3,
  heartRate: 150,
  lactate: 2,
  method: 'LINEAR_2.0',
  confidence: 'HIGH' as const,
}

const SAVED_ANAEROBIC_THRESHOLD = {
  speed: 13.6,
  heartRate: 192,
  lactate: 5.28,
  method: 'DMAX',
  confidence: 'HIGH' as const,
}

describe('lactate profile analyzer', () => {
  it('does not accept impossible D-max lactate values above observed max', () => {
    const profile = analyzeLactateProfile(DAVID_TEST_STAGES, 213)

    expect(profile.lt2.lactate).toBeLessThanOrEqual(profile.maxLactate)
    expect(profile.lt2Ratio).toBeLessThanOrEqual(1)
  })

  it('uses saved completed-test thresholds as the pace source of truth', () => {
    const profile = createLactateProfileFromThresholds(
      DAVID_TEST_STAGES,
      213,
      SAVED_ANAEROBIC_THRESHOLD,
      SAVED_AEROBIC_THRESHOLD
    )

    expect(profile.maxLactate).toBe(25)
    expect(profile.lt2.speed).toBe(13.6)
    expect(profile.lt2.heartRate).toBe(192)
    expect(profile.lt2.lactate).toBe(5.28)
    expect(profile.lt2Ratio).toBeCloseTo(0.2112, 4)
  })

  it('selects running paces from saved LT2 instead of recalculating a second LT2', () => {
    const paces = selectOptimalPaces(
      {
        age: 20,
        gender: 'MALE',
        weeklyKm: 50,
        trainingAge: 2,
        maxHR: 213,
      },
      undefined,
      {
        testStages: DAVID_TEST_STAGES,
        maxHR: 213,
        aerobicThreshold: SAVED_AEROBIC_THRESHOLD,
        anaerobicThreshold: SAVED_ANAEROBIC_THRESHOLD,
      }
    )

    expect(paces.primarySource).toBe('LACTATE_RATIO')
    expect(paces.thresholdPace.kmh).toBe(13.6)
    expect(paces.lactateProfile?.lt2.lactate).toBe(5.28)
    expect(paces.lactateProfile?.lt2Ratio).toBeLessThan(1)
  })
})
