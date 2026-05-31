import { describe, expect, it } from 'vitest'
import {
  buildGoalReadiness,
  buildProgressSummary,
  comparableNormGap,
  comparableNormValue,
  inferTeamLevel,
  scoreTone,
  type AdaptiveMetricAthlete,
  type AdaptiveMetricRow,
} from '@/lib/hockey/team-analysis-engine'

function athlete(partial: Partial<AdaptiveMetricAthlete> & { clientId: string; name: string }): AdaptiveMetricAthlete {
  return {
    latest: null,
    previous: null,
    delta: null,
    percentChange: null,
    latestDate: null,
    previousDate: null,
    rank: null,
    percentile: null,
    targetGap: null,
    score: null,
    missing: false,
    ...partial,
  }
}

function metricRow(partial: Partial<AdaptiveMetricRow> & { key: string; athletes: AdaptiveMetricAthlete[] }): AdaptiveMetricRow {
  return {
    label: partial.key,
    unit: 'kg',
    category: 'strength',
    lowerIsBetter: false,
    coverage: partial.athletes.length,
    teamAverage: null,
    target: null,
    elite: null,
    leader: null,
    ...partial,
  }
}

describe('scoreTone', () => {
  it('classifies by threshold boundaries', () => {
    // good at >= 75
    expect(scoreTone(75)).toBe('good')
    expect(scoreTone(100)).toBe('good')
    // watch at [50, 75)
    expect(scoreTone(74)).toBe('watch')
    expect(scoreTone(50)).toBe('watch')
    // risk at (0, 50)
    expect(scoreTone(49)).toBe('risk')
    expect(scoreTone(1)).toBe('risk')
    // neutral at <= 0
    expect(scoreTone(0)).toBe('neutral')
    expect(scoreTone(-5)).toBe('neutral')
  })
})

describe('comparableNormValue / comparableNormGap', () => {
  it('converts xBW norms to kg using body weight', () => {
    // 1.5 x bodyweight at 80 kg => 120 kg
    expect(comparableNormValue(1.5, 'xBW', 'kg', 80)).toBe(120)
    expect(comparableNormGap(0.5, 'xBW', 'KG', 80)).toBe(40)
  })

  it('returns null for xBW->kg when body weight is missing or zero', () => {
    expect(comparableNormValue(1.5, 'xBW', 'kg', null)).toBeNull()
    expect(comparableNormValue(1.5, 'xBW', 'kg', 0)).toBeNull()
    expect(comparableNormGap(0.5, 'xBW', 'kg', null)).toBeNull()
  })

  it('passes the value through when units already match', () => {
    expect(comparableNormValue(120, 'kg', 'kg', 80)).toBe(120)
    // non-xBW norm units are returned unchanged regardless of body weight
    expect(comparableNormValue(1.85, 's', 's', 80)).toBe(1.85)
    expect(comparableNormGap(2.5, 'm', 'm', null)).toBe(2.5)
  })
})

describe('inferTeamLevel', () => {
  it('detects junior levels from the team name', () => {
    expect(inferTeamLevel('Frölunda J18')).toBe('J18')
    expect(inferTeamLevel('Skellefteå U18 Elit')).toBe('J18')
    expect(inferTeamLevel('Brynäs J20')).toBe('J20')
    expect(inferTeamLevel('Leksand u20')).toBe('J20')
  })

  it('falls back to A-team', () => {
    expect(inferTeamLevel('Luleå HF')).toBe('A-team')
    expect(inferTeamLevel('')).toBe('A-team')
  })
})

describe('buildProgressSummary', () => {
  it('counts improved vs stalled athletes and ranks top improvers by absolute delta', () => {
    const metrics: AdaptiveMetricRow[] = [
      metricRow({
        key: 'squat',
        label: 'Back Squat',
        unit: 'kg',
        athletes: [
          athlete({ clientId: 'a', name: 'Alice', delta: 10 }),  // improved
          athlete({ clientId: 'b', name: 'Bob', delta: -5 }),    // stalled (changed, not improved)
          athlete({ clientId: 'c', name: 'Cara', delta: null }), // no change -> ignored
        ],
      }),
      metricRow({
        key: 'bench',
        label: 'Bench',
        unit: 'kg',
        athletes: [
          athlete({ clientId: 'a', name: 'Alice', delta: 2 }),   // improved again
          athlete({ clientId: 'd', name: 'Dan', delta: 25 }),    // biggest improver
        ],
      }),
    ]

    const summary = buildProgressSummary(metrics)

    // a, d improved; b changed-but-stalled; c had no change
    expect(summary.improvedAthletes).toBe(2)
    expect(summary.stalledAthletes).toBe(1)
    expect(summary.improvedMetrics).toBe(3)
    expect(summary.totalMetricsWithChange).toBe(4)
    // sorted by absolute delta descending: Dan(25), Alice/Back Squat(10), Alice/Bench(2)
    expect(summary.topImprovers.map((i) => i.delta)).toEqual([25, 10, 2])
    expect(summary.topImprovers[0]).toMatchObject({ clientId: 'd', metricLabel: 'Bench' })
  })

  it('caps top improvers at 6', () => {
    const athletes = Array.from({ length: 10 }, (_, i) =>
      athlete({ clientId: `c${i}`, name: `C${i}`, delta: i + 1 })
    )
    const summary = buildProgressSummary([metricRow({ key: 'm', athletes })])
    expect(summary.topImprovers).toHaveLength(6)
    // highest deltas first
    expect(summary.topImprovers[0].delta).toBe(10)
  })
})

describe('buildGoalReadiness', () => {
  it('classifies athletes against targets and aggregates readiness', () => {
    const metrics: AdaptiveMetricRow[] = [
      // higher-is-better, target 100
      metricRow({
        key: 'squat',
        label: 'Squat',
        unit: 'kg',
        lowerIsBetter: false,
        target: 100,
        coverage: 4,
        athletes: [
          athlete({ clientId: 'a', name: 'A', latest: 120 }), // above
          athlete({ clientId: 'b', name: 'B', latest: 97 }),  // within 5% -> close
          athlete({ clientId: 'c', name: 'C', latest: 60 }),  // below
          athlete({ clientId: 'd', name: 'D', latest: null }), // missing
        ],
      }),
      // a metric with no target is excluded entirely
      metricRow({
        key: 'bench',
        label: 'Bench',
        unit: 'kg',
        target: null,
        athletes: [athlete({ clientId: 'a', name: 'A', latest: 80 })],
      }),
    ]

    const readiness = buildGoalReadiness(metrics, 'A-team')

    expect(readiness.level).toBe('A-team')
    expect(readiness.metrics).toHaveLength(1)
    const squat = readiness.metrics[0]
    expect(squat).toMatchObject({
      key: 'squat',
      aboveTarget: 1,
      closeToTarget: 1,
      belowTarget: 1,
      missing: 1,
    })
    // (above 1 + close 0.5) / 3 measured = 50%
    expect(squat.readiness).toBe(50)
    expect(readiness.overallReadiness).toBe(50)
  })

  it('respects lowerIsBetter direction (e.g. sprint times)', () => {
    const metrics: AdaptiveMetricRow[] = [
      metricRow({
        key: 'sprint',
        label: 'Sprint',
        unit: 's',
        lowerIsBetter: true,
        target: 2.0,
        coverage: 2,
        athletes: [
          athlete({ clientId: 'a', name: 'A', latest: 1.8 }), // faster than target -> above
          athlete({ clientId: 'b', name: 'B', latest: 2.5 }), // slower -> below
        ],
      }),
    ]

    const readiness = buildGoalReadiness(metrics, 'J20')
    expect(readiness.metrics[0]).toMatchObject({ aboveTarget: 1, belowTarget: 1, missing: 0 })
    // (1 above) / 2 measured = 50%
    expect(readiness.metrics[0].readiness).toBe(50)
  })

  it('returns zero overall readiness when no metric has a target', () => {
    const readiness = buildGoalReadiness(
      [metricRow({ key: 'm', target: null, athletes: [athlete({ clientId: 'a', name: 'A', latest: 1 })] })],
      'A-team'
    )
    expect(readiness.metrics).toHaveLength(0)
    expect(readiness.overallReadiness).toBe(0)
  })
})
