import { describe, expect, it } from 'vitest'
import type { Prisma } from '@prisma/client'
import { buildCardioSessionSummary } from './session-summary'

// EMOM-style triple-erg session: 10 rounds of [BikeErg 60s/16cal,
// Row 60s/16cal, SkiErg 60s/16cal] with 60s rest between rounds.
// Flattens to 10×3 work + 9 rest = 39 segments.
const TRIPLE_ERG_SEGMENTS = [
  {
    id: 'main',
    type: 'REPEAT_GROUP',
    repeats: 10,
    restBetweenRounds: 60,
    steps: [
      { id: 'bike', type: 'INTERVAL', duration: 60, calories: 16, equipment: 'BIKE_ERG' },
      { id: 'row', type: 'INTERVAL', duration: 60, calories: 16, equipment: 'ROW' },
      { id: 'ski', type: 'INTERVAL', duration: 60, calories: 16, equipment: 'SKI_ERG' },
    ],
  },
]

// Calories achieved per round (index 0 = round 1) — gradual fade.
const BIKE_CALS = [16, 16, 16, 16, 15, 15, 15, 15, 14, 14] // 152, ≥16: 4
const ROW_CALS = [17, 17, 16, 16, 16, 16, 15, 15, 15, 15] // 158, ≥16: 6
const SKI_CALS = [16, 16, 16, 15, 15, 15, 15, 14, 14, 13] // 149, ≥16: 3

function emomLogs() {
  const logs = []
  let index = 0
  for (let round = 0; round < 10; round++) {
    const cals = [BIKE_CALS[round], ROW_CALS[round], SKI_CALS[round]]
    for (let station = 0; station < 3; station++) {
      logs.push({
        id: `log-${index}`,
        segmentIndex: index,
        actualDuration: 60,
        actualDistance: null,
        actualPace: null,
        actualAvgHR: null,
        actualMaxHR: null,
        actualAvgPower: 200 + station * 20 - round, // mild fade in watts too
        actualMaxPower: 280 + station * 20,
        actualCalories: cals[station],
        completed: true,
        skipped: false,
      })
      index++
    }
    if (round < 9) {
      logs.push({
        id: `log-${index}`,
        segmentIndex: index,
        actualDuration: 60,
        actualDistance: null,
        actualPace: null,
        actualAvgHR: null,
        actualMaxHR: null,
        actualAvgPower: null,
        actualMaxPower: null,
        actualCalories: null,
        completed: true,
        skipped: false,
      })
      index++
    }
  }
  return logs
}

function buildSummary(segments: unknown, segmentLogs: ReturnType<typeof emomLogs>) {
  return buildCardioSessionSummary({
    session: {
      id: 'session-1',
      name: 'Triple erg EMOM',
      description: null,
      sport: 'FUNCTIONAL_FITNESS',
      segments: segments as never,
    },
    log: {
      id: 'log-1',
      startedAt: new Date('2026-06-13T10:00:00Z'),
      completedAt: new Date('2026-06-13T10:39:00Z'),
      status: 'COMPLETED',
      actualDuration: 39 * 60,
      sessionRPE: 8,
      notes: null,
      avgHeartRate: null,
      maxHeartRate: null,
      segmentLogs,
    },
    locale: 'en',
  })
}

describe('buildCardioSessionSummary', () => {
  it('rebuilds 10 rounds with per-round calorie totals from the flat segment logs', () => {
    const summary = buildSummary(TRIPLE_ERG_SEGMENTS, emomLogs())

    expect(summary.windows).toHaveLength(30)
    expect(summary.rounds).toHaveLength(10)

    const round1 = summary.rounds[0]
    expect(round1.round).toBe(1)
    expect(round1.windows).toHaveLength(3)
    expect(round1.totalCalories).toBe(16 + 17 + 16)
    expect(round1.totalWorkSeconds).toBe(180)
    expect(round1.complete).toBe(true)

    const round10 = summary.rounds[9]
    expect(round10.totalCalories).toBe(14 + 15 + 13)
  })

  it('scores EMOM windows by calories and reports round fade', () => {
    const summary = buildSummary(TRIPLE_ERG_SEGMENTS, emomLogs())

    expect(summary.windows.every((w) => w.scoreKind === 'calories')).toBe(true)
    expect(summary.roundFade).not.toBeNull()
    expect(summary.roundFade!.metric).toBe('calories')
    expect(summary.roundFade!.firstValue).toBe(49)
    expect(summary.roundFade!.lastValue).toBe(42)
    expect(summary.roundFade!.percent).toBeCloseTo(((42 - 49) / 49) * 100, 5)
    expect(summary.roundFade!.bestRound).toBe(1)
    expect(summary.roundFade!.worstRound).toBe(10)
  })

  it('summarises each machine separately with target hit rate and fade', () => {
    const summary = buildSummary(TRIPLE_ERG_SEGMENTS, emomLogs())

    expect(summary.equipment).toHaveLength(3)
    const bike = summary.equipment.find((e) => e.equipment === 'BIKE_ERG')!
    expect(bike.windows).toBe(10)
    expect(bike.completedWindows).toBe(10)
    expect(bike.totalCalories).toBe(152)
    expect(bike.targetCalories).toBe(16)
    expect(bike.targetHitRate).toBeCloseTo(0.4, 5)
    expect(bike.bestCalories).toBe(16)
    expect(bike.worstCalories).toBe(14)
    // first window 16 cal → last window 14 cal
    expect(bike.fadePercent).toBeCloseTo(((14 - 16) / 16) * 100, 5)
    expect(bike.avgPower).not.toBeNull()

    const row = summary.equipment.find((e) => e.equipment === 'ROW')!
    expect(row.targetHitRate).toBeCloseTo(0.6, 5)
  })

  it('aggregates calorie adherence across all scored windows', () => {
    const summary = buildSummary(TRIPLE_ERG_SEGMENTS, emomLogs())

    expect(summary.calorieAdherence).toEqual({
      plannedTotal: 480,
      actualTotal: 152 + 158 + 149,
      scoredWindows: 30,
      hitWindows: 4 + 6 + 3,
    })
  })

  it('scores calorie-target windows without a duration by time and flips fade semantics', () => {
    const segments = [
      {
        id: 'main',
        type: 'REPEAT_GROUP',
        repeats: 3,
        restBetweenRounds: 60,
        steps: [{ id: 'row', type: 'INTERVAL', calories: 16, equipment: 'ROW' }],
      },
    ]
    const durations = [50, 55, 60]
    const logs = durations.flatMap((duration, round) => {
      const work = {
        id: `work-${round}`,
        segmentIndex: round * 2,
        actualDuration: duration,
        actualDistance: null,
        actualPace: null,
        actualAvgHR: null,
        actualMaxHR: null,
        actualAvgPower: 210,
        actualMaxPower: 260,
        actualCalories: 16,
        completed: true,
        skipped: false,
      }
      if (round === 2) return [work]
      return [
        work,
        {
          id: `rest-${round}`,
          segmentIndex: round * 2 + 1,
          actualDuration: 60,
          actualDistance: null,
          actualPace: null,
          actualAvgHR: null,
          actualMaxHR: null,
          actualAvgPower: null,
          actualMaxPower: null,
          actualCalories: null,
          completed: true,
          skipped: false,
        },
      ]
    })

    const summary = buildSummary(segments, logs)

    expect(summary.windows).toHaveLength(3)
    expect(summary.windows.every((w) => w.scoreKind === 'time')).toBe(true)

    const row = summary.equipment.find((e) => e.equipment === 'ROW')!
    expect(row.scoreKind).toBe('time')
    expect(row.bestWindowSeconds).toBe(50)
    expect(row.worstWindowSeconds).toBe(60)
    // slower over time → positive fade
    expect(row.fadePercent).toBeCloseTo(20, 5)
  })

  it('keeps incomplete rounds out of the fade calculation', () => {
    const logs = emomLogs().filter((log) => log.segmentIndex < 36) // round 10 unlogged
    const summary = buildSummary(TRIPLE_ERG_SEGMENTS, logs)

    expect(summary.rounds).toHaveLength(10)
    expect(summary.rounds[9].complete).toBe(false)
    expect(summary.roundFade!.lastRound).toBe(9)
  })

  it('builds coach review and live-data coverage from rich samples', () => {
    const logs = emomLogs() as Array<ReturnType<typeof emomLogs>[number] & { powerSamples?: Prisma.JsonValue | null }>
    logs[0].powerSamples = {
      power: [220, 222, 224],
      cadence: [69, 70, 71],
      heartRate: [150, 153, 156],
      distanceMeters: [0, 9, 18],
      calories: [0, 1, 2],
    } as unknown as Prisma.JsonValue
    logs[3].powerSamples = {
      heartRate: [158, 152, 148],
    } as unknown as Prisma.JsonValue

    const summary = buildCardioSessionSummary({
      session: {
        id: 'session-1',
        name: 'Triple erg EMOM',
        description: null,
        sport: 'FUNCTIONAL_FITNESS',
        segments: TRIPLE_ERG_SEGMENTS as never,
      },
      log: {
        id: 'log-1',
        startedAt: new Date('2026-06-13T10:00:00Z'),
        completedAt: new Date('2026-06-13T10:39:00Z'),
        status: 'COMPLETED',
        actualDuration: 39 * 60,
        sessionRPE: 8,
        notes: 'Pain/injury mentioned: left calf tightness',
        avgHeartRate: null,
        maxHeartRate: null,
        segmentLogs: logs,
      },
      locale: 'en',
    })

    expect(summary.liveData).toMatchObject({
      segmentsWithSamples: 2,
      segmentsWithRichSamples: 2,
      sampleSeconds: 6,
      avgCadence: 70,
      avgRecoveryHrDrop: 10,
    })
    expect(summary.liveData.metrics).toEqual(['cadence', 'calories', 'distance', 'heartRate', 'power'])
    expect(summary.windows[0]).toMatchObject({
      avgCadence: 70,
      sensorSampleCount: 3,
    })
    expect(summary.coachReview.tone).toBe('concern')
    expect(summary.coachReview.painFlag).toContain('Pain or injury')
    expect(summary.coachReview.cadence).toContain('low-rhythm')
    expect(summary.coachReview.flags.map((flag) => flag.label)).toContain('Pain/injury mentioned')
  })
})
