import { describe, expect, it } from 'vitest'

import {
  buildHyroxEvaluationPayload,
  buildHyroxSegmentDefinitions,
  buildHyroxSegmentsFromGarminLaps,
  expectedHyroxLapCount,
  summarizeHyroxPerformance,
} from './race-evaluation'

function laps(count: number, duration = 60) {
  return Array.from({ length: count }, (_, index) => ({
    startSec: index * duration,
    durationInSeconds: duration,
    averageHeartRate: 150 + (index % 4),
    maxHeartRate: 170 + (index % 5),
  }))
}

describe('HYROX race evaluation helpers', () => {
  it('builds official HYROX segment order without Roxzone timers', () => {
    const segments = buildHyroxSegmentDefinitions(false)

    expect(segments).toHaveLength(16)
    expect(expectedHyroxLapCount(false)).toBe(16)
    expect(segments.map((segment) => segment.label)).toEqual([
      'Run 1',
      'SkiErg',
      'Run 2',
      'Sled Push',
      'Run 3',
      'Sled Pull',
      'Run 4',
      'Burpee Broad Jump',
      'Run 5',
      'Row',
      'Run 6',
      "Farmer's Carry",
      'Run 7',
      'Sandbag Lunge',
      'Run 8',
      'Wall Balls',
    ])
  })

  it('adds one Roxzone segment per station when enabled', () => {
    const segments = buildHyroxSegmentDefinitions(true)

    expect(segments).toHaveLength(24)
    expect(expectedHyroxLapCount(true)).toBe(24)
    expect(segments.slice(0, 6).map((segment) => segment.label)).toEqual([
      'Run 1',
      'Roxzone 1',
      'SkiErg',
      'Run 2',
      'Roxzone 2',
      'Sled Push',
    ])
  })

  it('maps Garmin laps to HYROX labels and preserves extra laps', () => {
    const mapped = buildHyroxSegmentsFromGarminLaps({
      laps: laps(17, 45),
      activityStart: new Date('2026-06-21T10:00:00Z'),
      timeline: [],
      roxzoneEnabled: false,
    })

    expect(mapped).toHaveLength(17)
    expect(mapped[0]?.label).toBe('Run 1')
    expect(mapped[1]?.label).toBe('SkiErg')
    expect(mapped[15]?.label).toBe('Wall Balls')
    expect(mapped[16]?.label).toBe('Extra lap 1')
    expect(mapped[16]?.compliance.score).toBe(0)
  })

  it('summarizes run splits, station times, and Roxzone time', () => {
    const mapped = buildHyroxSegmentsFromGarminLaps({
      laps: laps(24, 30),
      activityStart: new Date('2026-06-21T10:00:00Z'),
      timeline: [],
      roxzoneEnabled: true,
    })

    const performance = summarizeHyroxPerformance(mapped)

    expect(performance.hyroxRunSplits).toHaveLength(8)
    expect(performance.hyroxRunSplits.every((split) => split === 30)).toBe(true)
    expect(performance.hyroxStations.skiErg).toBe(30)
    expect(performance.hyroxStations.wallBalls).toBe(30)
    expect(performance.roxzoneTime).toBe(240)
    expect(performance.hyroxTotalTime).toBe(720)
  })

  it('builds a draft evaluation payload from Garmin laps', () => {
    const payload = buildHyroxEvaluationPayload({
      activity: {
        id: 'garmin-1',
        garminActivityId: BigInt(123),
        name: 'HYROX test',
        startDate: new Date('2026-06-21T10:00:00Z'),
        elapsedTime: 24 * 60,
        laps: laps(24, 60),
        hrStream: [120, 130, 140, 150],
        hrStreamOffsets: [0, 60, 120, 180],
      },
      roxzoneEnabled: true,
      raceType: 'SIMULATION',
      division: 'OPEN',
      maxHr: 190,
      zones: [
        { zone: 1, hrMin: 0, hrMax: 120 },
        { zone: 2, hrMin: 121, hrMax: 140 },
        { zone: 3, hrMin: 141, hrMax: 155 },
        { zone: 4, hrMin: 156, hrMax: 175 },
        { zone: 5, hrMin: 176, hrMax: 220 },
      ],
    })

    expect(payload.summary.hyrox.status).toBe('DRAFT')
    expect(payload.summary.hyrox.expectedLapCount).toBe(24)
    expect(payload.summary.hyrox.actualLapCount).toBe(24)
    expect(payload.summary.hyrox.lapCountStatus).toBe('MATCH')
    expect(payload.segmentEvaluations[2]?.label).toBe('SkiErg')
    expect(payload.timelinePreview).toHaveLength(4)
  })
})
