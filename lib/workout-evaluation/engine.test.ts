import { describe, expect, it } from 'vitest'

import { workoutEvaluationTestUtils } from './engine'
import type { SegmentEvaluation, NormalizedSensorSample, WorkoutZoneSummary } from './types'

const emptyZoneSummary: WorkoutZoneSummary = {
  zone1Seconds: 0,
  zone2Seconds: 0,
  zone3Seconds: 0,
  zone4Seconds: 0,
  zone5Seconds: 0,
  totalTrackedSeconds: 0,
  highIntensitySeconds: 0,
}

function segment(index: number, avgPower: number, avgPaceSecPerKm: number, avgHr: number): SegmentEvaluation {
  return {
    segmentIndex: index,
    label: `Interval ${index}`,
    planned: {},
    actual: {
      durationSec: 180,
      avgHr,
      maxHr: avgHr + 8,
      avgPower,
      avgPaceSecPerKm,
      zoneSeconds: {
        1: 0,
        2: 0,
        3: 30,
        4: 120,
        5: 30,
      },
    },
    compliance: {
      intensityHit: null,
      targetHit: null,
      score: 100,
    },
  }
}

describe('workout evaluation engine utilities', () => {
  it('maps timeline samples into HR zone totals and high-intensity seconds', () => {
    const summary = workoutEvaluationTestUtils.zoneSummaryFromTimeline([
      { timeSec: 0, heartRate: 120, hrZone: 1 },
      { timeSec: 1, heartRate: 140, hrZone: 2 },
      { timeSec: 2, heartRate: 160, hrZone: 4 },
      { timeSec: 3, heartRate: 171, hrZone: 5 },
    ])

    expect(summary.zone1Seconds).toBe(1)
    expect(summary.zone2Seconds).toBe(1)
    expect(summary.zone4Seconds).toBe(1)
    expect(summary.zone5Seconds).toBe(1)
    expect(summary.totalTrackedSeconds).toBe(4)
    expect(summary.highIntensitySeconds).toBe(2)
  })

  it('falls back to Garmin zone totals when stream data is missing', () => {
    const fallback: WorkoutZoneSummary = {
      ...emptyZoneSummary,
      zone4Seconds: 300,
      zone5Seconds: 120,
    }

    const summary = workoutEvaluationTestUtils.zoneSummaryFromTimeline([], fallback)

    expect(summary.totalTrackedSeconds).toBe(420)
    expect(summary.highIntensitySeconds).toBe(420)
  })

  it('downsamples long timelines into chart-sized previews', () => {
    const samples: NormalizedSensorSample[] = Array.from({ length: 1200 }, (_, index) => ({
      timeSec: index,
      heartRate: 120 + (index % 80),
      power: 180 + (index % 40),
      distanceMeters: index * 3,
    }))

    const preview = workoutEvaluationTestUtils.downsampleTimeline(samples)

    expect(preview.length).toBeLessThanOrEqual(900)
    expect(preview[0].timeSec).toBe(0)
    expect(preview.at(-1)?.timeSec).toBeGreaterThan(0)
  })

  it('detects fatigue from power fade, pace fade, HR drift, and high intensity time', () => {
    const fatigue = workoutEvaluationTestUtils.buildFatigueSummary(
      [
        segment(1, 330, 210, 160),
        segment(2, 315, 218, 168),
        segment(3, 292, 228, 174),
      ],
      {
        ...emptyZoneSummary,
        zone4Seconds: 900,
        zone5Seconds: 480,
        totalTrackedSeconds: 1500,
        highIntensitySeconds: 1380,
      },
    )

    expect(fatigue.powerDropPct).toBeGreaterThan(10)
    expect(fatigue.paceDropPct).toBeGreaterThan(5)
    expect(fatigue.hrDriftPct).toBeGreaterThan(5)
    expect(fatigue.level).toMatch(/HIGH|VERY_HIGH/)
    expect(fatigue.notes.length).toBeGreaterThan(1)
  })
})
