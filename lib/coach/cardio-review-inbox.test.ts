import { describe, expect, it } from 'vitest'
import type { Prisma } from '@prisma/client'
import { buildCardioSessionSummary } from '@/lib/cardio/session-summary'
import { buildCoachCardioReviewInboxItem } from './cardio-review-inbox'

const BIKE_INTERVALS = [
  {
    id: 'bike',
    type: 'INTERVAL',
    duration: 180,
    repeats: 2,
    restDuration: 60,
    power: '250',
    cadence: '90',
    equipment: 'WATTBIKE',
  },
]

function workLog(input: {
  id: string
  segmentIndex: number
  duration: number | null
  power: number | null
  cadence?: number | null
  completed?: boolean
  skipped?: boolean
}) {
  return {
    id: input.id,
    segmentIndex: input.segmentIndex,
    actualDuration: input.duration,
    actualDistance: null,
    actualPace: null,
    actualAvgHR: input.completed === false ? null : 165,
    actualMaxHR: input.completed === false ? null : 174,
    actualAvgPower: input.power,
    actualMaxPower: input.power == null ? null : input.power + 30,
    actualCalories: null,
    powerSamples: input.cadence == null
      ? null
      : {
          power: [input.power, input.power, input.power],
          cadence: [input.cadence, input.cadence, input.cadence],
          heartRate: [150, 165, 174],
        } as unknown as Prisma.JsonValue,
    completed: input.completed ?? true,
    skipped: input.skipped ?? false,
  }
}

function restLog(id: string, segmentIndex: number, heartRate: number[]) {
  return {
    id,
    segmentIndex,
    actualDuration: 60,
    actualDistance: null,
    actualPace: null,
    actualAvgHR: null,
    actualMaxHR: null,
    actualAvgPower: null,
    actualMaxPower: null,
    actualCalories: null,
    powerSamples: { heartRate } as unknown as Prisma.JsonValue,
    completed: true,
    skipped: false,
  }
}

function summary(notes: string | null, logs: ReturnType<typeof workLog>[]) {
  return buildCardioSessionSummary({
    session: {
      id: 'session-1',
      name: 'Bike intervals',
      description: null,
      sport: 'CYCLING',
      segments: BIKE_INTERVALS as never,
    },
    log: {
      id: 'log-1',
      startedAt: new Date('2026-06-13T10:00:00Z'),
      completedAt: new Date('2026-06-13T10:12:00Z'),
      status: 'COMPLETED',
      actualDuration: 720,
      sessionRPE: 8,
      notes,
      avgHeartRate: null,
      maxHeartRate: null,
      segmentLogs: logs,
    },
    locale: 'en',
  })
}

describe('coach cardio review inbox', () => {
  it('prioritizes sessions with pain notes and missed planned targets', () => {
    const item = buildCoachCardioReviewInboxItem({
      summary: summary('Pain in left calf after the second rep', [
        workLog({ id: 'work-1', segmentIndex: 0, duration: 180, power: 252, cadence: 90 }),
        restLog('rest-1', 1, [168, 160]) as ReturnType<typeof workLog>,
        workLog({
          id: 'work-2',
          segmentIndex: 2,
          duration: null,
          power: null,
          cadence: null,
          completed: false,
          skipped: true,
        }),
      ]),
      athlete: { id: 'athlete-1', name: 'Athlete One' },
      assignment: { id: 'assignment-1', assignedDate: new Date('2026-06-13T00:00:00Z') },
      log: {
        id: 'log-1',
        startedAt: new Date('2026-06-13T10:00:00Z'),
        completedAt: new Date('2026-06-13T10:12:00Z'),
        sessionRPE: 8,
      },
      locale: 'en',
    })

    expect(item.priority).toBe('urgent')
    expect(item.needsAttention).toBe(true)
    expect(item.flags.map((flag) => flag.id)).toEqual(expect.arrayContaining([
      'coach-Pain/injury mentioned',
      'off-plan',
      'missed-intervals',
      'incomplete',
    ]))
    expect(item.executionScore).toBeLessThan(80)
    expect(item.keyFindings.join(' ')).toContain('Pain or injury')
  })

  it('marks clean on-target sessions as clear', () => {
    const item = buildCoachCardioReviewInboxItem({
      summary: summary(null, [
        workLog({ id: 'work-1', segmentIndex: 0, duration: 180, power: 252, cadence: 90 }),
        restLog('rest-1', 1, [168, 145]) as ReturnType<typeof workLog>,
        workLog({ id: 'work-2', segmentIndex: 2, duration: 180, power: 248, cadence: 91 }),
      ]),
      athlete: { id: 'athlete-1', name: 'Athlete One' },
      assignment: { id: 'assignment-1', assignedDate: new Date('2026-06-13T00:00:00Z') },
      log: {
        id: 'log-1',
        startedAt: new Date('2026-06-13T10:00:00Z'),
        completedAt: new Date('2026-06-13T10:12:00Z'),
        sessionRPE: 6,
      },
      locale: 'en',
    })

    expect(item.priority).toBe('clear')
    expect(item.needsAttention).toBe(false)
    expect(item.flags).toEqual([])
    expect(item.executionScore).toBeGreaterThanOrEqual(85)
    expect(item.onTargetWindows).toBe(2)
    expect(item.analyzedWindows).toBe(2)
  })
})
