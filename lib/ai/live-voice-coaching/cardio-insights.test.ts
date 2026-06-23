import { describe, expect, it } from 'vitest'
import {
  createCardioLiveInsightState,
  evaluateCardioLiveInsight,
  formatCardioLiveInsightForCoach,
} from './cardio-insights'
import type { LiveMachineMetrics } from './types'

function metrics(overrides: Partial<LiveMachineMetrics> = {}): LiveMachineMetrics {
  return {
    available: true,
    connected: true,
    equipment: 'WATTBIKE',
    power: null,
    targetPower: null,
    averagePower: null,
    cadence: 90,
    heartRate: null,
    heartRateZone: null,
    timeRemainingSeconds: 120,
    isTimerRunning: true,
    ...overrides,
  }
}

describe('cardio live coaching insights', () => {
  it('flags sustained power above target', () => {
    const state = createCardioLiveInsightState()
    const input = {
      nowMs: 0,
      metrics: metrics({ power: 230, targetPower: 200 }),
      segmentIndex: 2,
      segmentType: 'INTERVAL',
      segmentTypeName: 'Interval',
      isWorkSegment: true,
      segmentElapsedSeconds: 35,
    }

    expect(evaluateCardioLiveInsight(input, state)).toBeNull()

    const insight = evaluateCardioLiveInsight({ ...input, nowMs: 21_000 }, state)
    expect(insight).toMatchObject({ kind: 'POWER_TARGET', severity: 'info' })
    expect(insight?.message).toContain('above target')
    expect(formatCardioLiveInsightForCoach(insight!)).toContain('[COACHING INSIGHT] POWER_TARGET')
  })

  it('flags low bike cadence with high torque', () => {
    const state = createCardioLiveInsightState()
    const input = {
      nowMs: 0,
      metrics: metrics({ cadence: 68, power: 195, targetPower: 200 }),
      segmentIndex: 1,
      segmentType: 'INTERVAL',
      segmentTypeName: 'Interval',
      isWorkSegment: true,
      segmentElapsedSeconds: 30,
    }

    expect(evaluateCardioLiveInsight(input, state)).toBeNull()

    const insight = evaluateCardioLiveInsight({ ...input, nowMs: 21_000 }, state)
    expect(insight).toMatchObject({ kind: 'CADENCE' })
    expect(insight?.message).toContain('smoother spinning')
    expect(insight?.message).toContain('68 rpm')
  })

  it('flags high heart rate late in recovery', () => {
    const state = createCardioLiveInsightState()
    const input = {
      nowMs: 0,
      metrics: metrics({
        cadence: null,
        heartRate: 168,
        heartRateZone: 4,
        timeRemainingSeconds: 25,
      }),
      segmentIndex: 3,
      segmentType: 'RECOVERY',
      segmentTypeName: 'Recovery',
      isWorkSegment: false,
      segmentElapsedSeconds: 45,
    }

    expect(evaluateCardioLiveInsight(input, state)).toBeNull()

    const insight = evaluateCardioLiveInsight({ ...input, nowMs: 16_000 }, state)
    expect(insight).toMatchObject({ kind: 'RECOVERY', severity: 'warning' })
    expect(insight?.message).toContain('late in recovery')
  })

  it('flags interval consistency drift against previous reps', () => {
    const state = createCardioLiveInsightState()
    const insight = evaluateCardioLiveInsight({
      nowMs: 60_000,
      metrics: metrics({ power: 276, targetPower: null, cadence: 91 }),
      segmentIndex: 6,
      segmentType: 'INTERVAL',
      segmentTypeName: 'Interval',
      isWorkSegment: true,
      segmentElapsedSeconds: 55,
      currentSegmentAvgPower: 276,
      previousWorkAvgPowers: [250, 252, 248, 251],
    }, state)

    expect(insight).toMatchObject({ kind: 'CONSISTENCY' })
    expect(insight?.message).toContain('above recent reps')
  })

  it('prioritizes fatigue and pain guardrails', () => {
    const state = createCardioLiveInsightState()
    const input = {
      nowMs: 0,
      metrics: metrics({
        power: 210,
        targetPower: 250,
        cadence: 65,
        heartRate: 181,
        heartRateZone: 5,
      }),
      segmentIndex: 4,
      segmentType: 'INTERVAL',
      segmentTypeName: 'Interval',
      isWorkSegment: true,
      segmentElapsedSeconds: 50,
      currentSegmentAvgPower: 210,
    }

    expect(evaluateCardioLiveInsight(input, state)).toBeNull()

    const fatigue = evaluateCardioLiveInsight({ ...input, nowMs: 21_000 }, state)
    expect(fatigue).toMatchObject({ kind: 'GUARDRAIL', severity: 'warning' })
    expect(fatigue?.message).toContain('Fatigue markers')

    const painState = createCardioLiveInsightState()
    const pain = evaluateCardioLiveInsight({
      ...input,
      nowMs: 30_000,
      metrics: metrics({ power: 250, targetPower: 250, cadence: 90 }),
      segmentType: 'RECOVERY',
      isWorkSegment: false,
      painMentioned: true,
    }, painState)
    expect(pain).toMatchObject({ kind: 'GUARDRAIL', severity: 'urgent' })
    expect(pain?.message).toContain('Pain or injury')
  })
})
