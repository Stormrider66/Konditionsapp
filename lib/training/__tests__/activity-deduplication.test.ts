import { describe, expect, it } from 'vitest'

import {
  deduplicateActivities,
  normalizeConcept2Activity,
  normalizeGarminActivity,
  normalizeQuickErgActivity,
} from '../activity-deduplication'

describe('quick erg activity normalization', () => {
  it('normalizes directly captured erg sessions for the shared activity matcher', () => {
    const normalized = normalizeQuickErgActivity({
      id: 'quick-1',
      startedAt: new Date('2026-06-15T10:00:00.000Z'),
      durationSec: 1200,
      distanceMeters: 5000,
      machineType: 'CONCEPT2_ROW',
      avgHeartRate: 158,
      trainingLoad: { dailyLoad: 42 },
    })

    expect(normalized).toMatchObject({
      id: 'quickerg-quick-1',
      source: 'quickerg',
      duration: 1200,
      distance: 5000,
      type: 'ROWING',
      tss: 42,
      avgHR: 158,
    })
  })

  it('matches later Concept2 imports instead of showing duplicate sessions', () => {
    const quickErg = normalizeQuickErgActivity({
      id: 'quick-1',
      startedAt: new Date('2026-06-15T10:00:00.000Z'),
      durationSec: 1200,
      distanceMeters: 5000,
      machineType: 'CONCEPT2_ROW',
    })
    const concept2 = normalizeConcept2Activity({
      id: 'c2-1',
      date: new Date('2026-06-15T10:04:00.000Z'),
      time: 12_050,
      distance: 5010,
      mappedType: 'ROWING',
      type: 'rower',
      concept2Id: 1234,
    })

    const result = deduplicateActivities([quickErg, concept2])

    expect(result.deduplicated).toHaveLength(1)
    expect(result.duplicatesRemoved).toBe(1)
    expect(result.matchedPairs[0].matchReason).toContain('start_time_within_4min')
  })

  it('matches later Garmin indoor cycling imports against Wattbike captures', () => {
    const quickErg = normalizeQuickErgActivity({
      id: 'quick-bike-1',
      startedAt: new Date('2026-06-15T12:00:00.000Z'),
      durationSec: 1800,
      distanceMeters: 14_000,
      machineType: 'WATTBIKE',
    })
    const garmin = normalizeGarminActivity(
      {
        activityId: 9876,
        type: 'indoor_cycling',
        mappedType: 'CYCLING',
        duration: 1790,
        distance: 13_900,
        startTimeSeconds: Date.parse('2026-06-15T12:08:00.000Z') / 1000,
      },
      new Date('2026-06-15T12:08:00.000Z')
    )

    const result = deduplicateActivities([quickErg, garmin])

    expect(result.deduplicated).toHaveLength(1)
    expect(result.duplicatesRemoved).toBe(1)
    expect(result.matchedPairs[0].confidence).toBeGreaterThanOrEqual(0.5)
  })
})
