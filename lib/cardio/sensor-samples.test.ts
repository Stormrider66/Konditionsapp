import { describe, expect, it } from 'vitest'
import {
  extractPowerSamples,
  normalizeCardioSensorSamples,
  sanitizeCardioSensorSamples,
  summarizeCardioSensorSamples,
} from './sensor-samples'

describe('cardio sensor samples', () => {
  it('keeps legacy watt arrays readable', () => {
    expect(sanitizeCardioSensorSamples([200.2, null, 215.7, 'x'])).toEqual([200, null, 216, null])
    expect(extractPowerSamples([200, null, 216])).toEqual([200, 216])
  })

  it('sanitizes rich 1 Hz sample objects', () => {
    const sanitized = sanitizeCardioSensorSamples({
      power: [201.2, 205.8],
      cadence: [89.23, null],
      heartRate: [150.4, 153.6],
      ignored: ['nope'],
    })

    expect(sanitized).toEqual({
      version: 1,
      sampleRateHz: 1,
      power: [201, 206],
      cadence: [89.2, null],
      heartRate: [150, 154],
    })
  })

  it('summarizes rich sample metrics for review cards', () => {
    const series = normalizeCardioSensorSamples({
      power: [200, 210, 220],
      cadence: [80, 82, 84],
      heartRate: [160, 154, 148],
      distanceMeters: [0, 8.5, 17],
      calories: [0, 1, 2],
    })

    expect(series?.power).toEqual([200, 210, 220])
    expect(summarizeCardioSensorSamples(series)).toMatchObject({
      sampleCount: 3,
      richSampleMetrics: ['power', 'heartRate', 'cadence', 'distance', 'calories'],
      avgPower: 210,
      avgCadence: 82,
      firstHeartRate: 160,
      lastHeartRate: 148,
      heartRateDrop: 12,
      distanceMeters: 17,
      calories: 2,
    })
  })
})
