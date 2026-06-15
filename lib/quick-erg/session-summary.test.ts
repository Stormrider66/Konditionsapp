import { describe, expect, it } from 'vitest'

import {
  buildQuickErgDedupeKey,
  buildQuickErgSessionAnalysis,
  compactBluetoothSamples,
  estimateQuickErgTrainingLoad,
  inferActivityType,
  type QuickErgSample,
} from './session-summary'
import type { WattbikeSample } from '@/lib/integrations/wattbike/types'

describe('compactBluetoothSamples', () => {
  it('bins irregular Bluetooth samples to 1 Hz and carries the last values through gaps', () => {
    const samples: WattbikeSample[] = [
      { t: 1000, power: 100, distance: 0, source: 'ftms' },
      { t: 1500, power: 220, distance: 4, source: 'ftms' },
      { t: 3000, cadence: 86, distance: 16, heartRate: 142, source: 'ftms' },
    ]

    const compact = compactBluetoothSamples(samples)

    expect(compact).toHaveLength(3)
    expect(compact[0]).toMatchObject({ elapsedSec: 0, power: 220, distanceMeters: 4 })
    expect(compact[1]).toMatchObject({ elapsedSec: 1, power: 220, distanceMeters: 4 })
    expect(compact[2]).toMatchObject({
      elapsedSec: 2,
      power: 220,
      cadence: 86,
      distanceMeters: 16,
      heartRate: 142,
    })
  })
})

describe('buildQuickErgSessionAnalysis', () => {
  it('computes core summary metrics, best efforts, and free-session intervals', () => {
    const samples: QuickErgSample[] = Array.from({ length: 40 }, (_, elapsedSec) => {
      const inFirstRep = elapsedSec < 10
      const resting = elapsedSec >= 10 && elapsedSec < 20
      const power = inFirstRep ? 100 : resting ? 0 : 240
      const distanceMeters = inFirstRep
        ? elapsedSec * 5
        : resting
          ? 45
          : 50 + (elapsedSec - 20) * 5

      return {
        elapsedSec,
        power,
        distanceMeters,
        heartRate: resting ? 120 : 150,
        strokeRate: resting ? 0 : 28,
        calories: elapsedSec,
      }
    })

    const analysis = buildQuickErgSessionAnalysis(samples)

    expect(analysis.summary).toMatchObject({
      durationSec: 40,
      distanceMeters: 145,
      calories: 39,
      avgPower: 145,
      maxPower: 240,
      avgHeartRate: 143,
      maxHeartRate: 150,
      movingSec: 30,
      sampleCount: 40,
    })
    expect(analysis.bestEfforts).toContainEqual(expect.objectContaining({
      type: 'power',
      label: '6s',
      value: 240,
      durationSec: 6,
    }))
    expect(analysis.detectedIntervals).toHaveLength(2)
    expect(analysis.detectedIntervals[0]).toMatchObject({
      index: 1,
      startSec: 0,
      endSec: 9,
      durationSec: 10,
      avgPower: 100,
      restAfterSec: 10,
    })
    expect(analysis.detectedIntervals[1]).toMatchObject({
      index: 2,
      startSec: 20,
      endSec: 39,
      durationSec: 20,
      avgPower: 240,
    })
  })
})

describe('quick erg helpers', () => {
  it('maps machine types to activity types for activity feeds and load rows', () => {
    expect(inferActivityType('CONCEPT2_ROW')).toBe('ROWING')
    expect(inferActivityType('CONCEPT2_SKIERG')).toBe('SKIING')
    expect(inferActivityType('WATTBIKE')).toBe('CYCLING')
    expect(inferActivityType('FTMS_AIRBIKE')).toBe('CYCLING')
  })

  it('estimates training load from duration and athlete RPE', () => {
    expect(estimateQuickErgTrainingLoad({ durationSec: 1800, movingSec: 1800, sampleCount: 1800 }, 8)).toBe(24)
    expect(estimateQuickErgTrainingLoad({ durationSec: 60, movingSec: 60, sampleCount: 60 })).toBe(1)
  })

  it('builds stable duplicate keys using a distance bucket', () => {
    const startedAt = new Date('2026-06-15T10:00:00.000Z')
    const base = buildQuickErgDedupeKey({
      clientId: 'client-1',
      machineType: 'CONCEPT2_ROW',
      startedAt,
      summary: { durationSec: 1200, distanceMeters: 5004 },
    })
    const sameBucket = buildQuickErgDedupeKey({
      clientId: 'client-1',
      machineType: 'CONCEPT2_ROW',
      startedAt,
      summary: { durationSec: 1200, distanceMeters: 5003 },
    })

    expect(base).toBe(sameBucket)
  })
})
