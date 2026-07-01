import { describe, expect, it } from 'vitest'
import {
  recordedCardioSegmentDurationSeconds,
  resolveCardioForTimeResultSeconds,
  resolveRecordedCardioDurationSeconds,
} from './recorded-duration'

function segment(
  segmentIndex: number,
  overrides: Partial<Parameters<typeof recordedCardioSegmentDurationSeconds>[0]> = {},
) {
  return {
    segmentIndex,
    actualDuration: 60,
    startedAt: null,
    completedAt: null,
    completed: true,
    skipped: false,
    ...overrides,
  }
}

describe('recorded cardio duration', () => {
  it('prefers a positive recorded duration over a longer wall-clock window', () => {
    expect(recordedCardioSegmentDurationSeconds(segment(0, {
      actualDuration: 600,
      startedAt: '2026-06-24T07:46:01.868Z',
      completedAt: '2026-06-24T08:13:45.560Z',
    }))).toBe(600)
  })

  it('uses timestamps when a completed time-to-target segment saved zero', () => {
    expect(recordedCardioSegmentDurationSeconds(segment(0, {
      actualDuration: 0,
      startedAt: '2026-06-24T07:44:05.746Z',
      completedAt: '2026-06-24T07:45:55.099Z',
    }))).toBe(109)
  })

  it('sums a fully finalized workout and counts skipped segments as zero', () => {
    expect(resolveRecordedCardioDurationSeconds({
      segmentLogs: [
        segment(0, { actualDuration: 600 }),
        segment(1, { actualDuration: 256 }),
        segment(2, { actualDuration: null, completed: false, skipped: true }),
        segment(3, {
          actualDuration: 0,
          startedAt: '2026-06-24T07:44:05.746Z',
          completedAt: '2026-06-24T07:45:55.099Z',
        }),
      ],
      expectedSegmentCount: 4,
      fallbackDuration: 1200,
    })).toBe(965)
  })

  it('keeps the stored fallback when segment coverage is incomplete', () => {
    expect(resolveRecordedCardioDurationSeconds({
      segmentLogs: [segment(0), segment(2)],
      expectedSegmentCount: 3,
      fallbackDuration: 1200,
    })).toBe(1200)
  })

  it('totals only completed time-to-target intervals', () => {
    expect(resolveCardioForTimeResultSeconds([
      { type: 'WARMUP', plannedDuration: 600, actualDuration: 600, completed: true, skipped: false },
      { type: 'INTERVAL', plannedCalories: 60, actualDuration: 256, completed: true, skipped: false },
      { type: 'INTERVAL', plannedCalories: 60, actualDuration: 258, completed: true, skipped: false },
      { type: 'COOLDOWN', plannedDuration: 600, actualDuration: 600, completed: true, skipped: false },
    ])).toBe(514)
  })

  it('does not publish a for-time result until every scored interval is complete', () => {
    expect(resolveCardioForTimeResultSeconds([
      { type: 'INTERVAL', plannedCalories: 60, actualDuration: 256, completed: true, skipped: false },
      { type: 'INTERVAL', plannedCalories: 60, actualDuration: null, completed: false, skipped: false },
    ])).toBeNull()
  })
})
