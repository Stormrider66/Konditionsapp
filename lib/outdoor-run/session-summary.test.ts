import { describe, expect, it } from 'vitest'

import {
  buildPhoneRunDedupeKey,
  buildPhoneRunSessionAnalysis,
  estimatePhoneRunTrainingLoad,
  formatRunPace,
  mapRunRpeToIntensity,
  type PhoneRunRawSample,
} from './session-summary'

describe('phone run session summary', () => {
  it('calculates distance, pace, and heart-rate summary from GPS samples', () => {
    const samples: PhoneRunRawSample[] = [
      { elapsedSec: 0, latitude: 59.3293, longitude: 18.0686, accuracy: 8, heartRate: 140 },
      { elapsedSec: 120, latitude: 59.3293, longitude: 18.0774, accuracy: 8, heartRate: 150 },
      { elapsedSec: 240, latitude: 59.3293, longitude: 18.0862, accuracy: 8, heartRate: 160 },
    ]

    const analysis = buildPhoneRunSessionAnalysis(samples)

    expect(analysis.summary.durationSec).toBe(240)
    expect(analysis.summary.distanceMeters).toBeGreaterThan(900)
    expect(analysis.summary.distanceMeters).toBeLessThan(1100)
    expect(analysis.summary.avgPaceSecPerKm).toBeGreaterThan(220)
    expect(analysis.summary.avgPaceSecPerKm).toBeLessThan(270)
    expect(analysis.summary.avgHeartRate).toBe(150)
    expect(analysis.summary.maxHeartRate).toBe(160)
    expect(analysis.routePolyline).toBeTruthy()
    expect(formatRunPace(analysis.summary.avgPaceSecPerKm)).toMatch(/^\d+:\d{2}$/)
  })

  it('filters poor accuracy points before calculating distance', () => {
    const samples: PhoneRunRawSample[] = [
      { elapsedSec: 0, latitude: 59.3293, longitude: 18.0686, accuracy: 8 },
      { elapsedSec: 60, latitude: 60.3293, longitude: 18.0686, accuracy: 200 },
      { elapsedSec: 120, latitude: 59.3293, longitude: 18.0774, accuracy: 8 },
    ]

    const analysis = buildPhoneRunSessionAnalysis(samples)

    expect(analysis.samples).toHaveLength(2)
    expect(analysis.summary.distanceMeters).toBeLessThan(600)
  })

  it('maps RPE into training load and intensity buckets', () => {
    const summary = {
      durationSec: 1800,
      movingDurationSec: 1800,
      distanceMeters: 5000,
      sampleCount: 30,
    }

    expect(estimatePhoneRunTrainingLoad(summary, 8)).toBe(32)
    expect(mapRunRpeToIntensity(2)).toBe('RECOVERY')
    expect(mapRunRpeToIntensity(5)).toBe('MODERATE')
    expect(mapRunRpeToIntensity(9)).toBe('VERY_HARD')
  })

  it('builds a stable duplicate key from rounded summary buckets', () => {
    const key = buildPhoneRunDedupeKey({
      clientId: 'client-1',
      startedAt: new Date('2026-06-15T08:12:34.000Z'),
      summary: { durationSec: 184, distanceMeters: 1518 },
    })

    expect(key).toBe('client-1:2026-06-15T08:12:180:1520')
  })
})
