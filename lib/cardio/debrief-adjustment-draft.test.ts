import { describe, expect, it } from 'vitest'
import type { Prisma } from '@prisma/client'
import { buildCardioFocusModeSegments } from './focus-mode-segments'
import { buildCardioDebriefAdjustmentDraft } from './debrief-adjustment-draft'
import { buildCardioSessionSummary } from './session-summary'
import { attachCardioDebriefToNotes, buildCardioPostWorkoutDebrief } from './post-workout-debrief'

const BIKE_INTERVALS = [
  {
    id: 'main',
    type: 'REPEAT_GROUP',
    repeats: 10,
    restBetweenRounds: 90,
    steps: [
      {
        id: 'bike',
        type: 'INTERVAL',
        duration: 180,
        equipment: 'WATTBIKE',
        targetType: 'power',
        targetValue: '250',
      },
    ],
  },
]

function workLog(index: number, power: number) {
  return {
    id: `work-${index}`,
    segmentIndex: index,
    actualDuration: 180,
    actualDistance: null,
    actualPace: null,
    actualAvgHR: 168,
    actualMaxHR: 176,
    actualAvgPower: power,
    actualMaxPower: power + 25,
    actualCalories: null,
    completed: true,
    skipped: false,
  }
}

function restLog(index: number) {
  return {
    id: `rest-${index}`,
    segmentIndex: index,
    actualDuration: 90,
    actualDistance: null,
    actualPace: null,
    actualAvgHR: null,
    actualMaxHR: null,
    actualAvgPower: null,
    actualMaxPower: null,
    actualCalories: null,
    completed: true,
    skipped: false,
  }
}

function intervalLogs(powers: number[]) {
  const logs = []
  for (let round = 0; round < powers.length; round++) {
    logs.push(workLog(round * 2, powers[round]))
    if (round < powers.length - 1) logs.push(restLog(round * 2 + 1))
  }
  return logs
}

function summary(notes: string | null, powers: number[]) {
  const segmentLogs = intervalLogs(powers)
  return {
    summary: buildCardioSessionSummary({
      session: {
        id: 'session-1',
        name: '10x3 Wattbike',
        description: null,
        sport: 'CYCLING',
        segments: BIKE_INTERVALS as unknown as Prisma.JsonValue,
      },
      log: {
        id: 'log-1',
        startedAt: new Date('2026-06-24T10:00:00Z'),
        completedAt: new Date('2026-06-24T10:45:00Z'),
        status: 'COMPLETED',
        actualDuration: 45 * 60,
        sessionRPE: 8,
        notes,
        avgHeartRate: null,
        maxHeartRate: null,
        segmentLogs,
      },
      locale: 'en',
    }),
    focusSegments: buildCardioFocusModeSegments({
      segments: BIKE_INTERVALS as unknown as Prisma.JsonValue,
      segmentLogs,
      locale: 'en',
    }),
  }
}

describe('buildCardioDebriefAdjustmentDraft', () => {
  it('reduces target watts and extends rest when debrief says the target was too hard', () => {
    const debrief = buildCardioPostWorkoutDebrief({
      questions: [
        {
          id: 'target_fit',
          type: 'choice',
          label: 'How did the watt target feel?',
          options: [{ value: 'too_hard', label: 'Too hard' }],
        },
        {
          id: 'recovery_feel',
          type: 'choice',
          label: 'How did the recovery feel between efforts?',
          options: [{ value: 'not_enough', label: 'Not enough' }],
        },
      ],
      answersByQuestionId: {
        target_fit: 'too_hard',
        recovery_feel: 'not_enough',
      },
      capturedAt: '2026-06-24T11:00:00.000Z',
      source: 'manual',
    })
    const data = summary(attachCardioDebriefToNotes(null, debrief) ?? null, [238, 232, 226, 224, 220, 218, 216, 214, 212, 210])

    const draft = buildCardioDebriefAdjustmentDraft({
      ...data,
      locale: 'en',
      now: new Date('2026-06-24T12:00:00Z'),
    })

    expect(draft?.adjustmentType).toBe('deload')
    expect(draft?.input.date).toBe('2026-06-25')
    expect(draft?.input.rounds).toBe(10)
    expect(draft?.input.restBetweenRoundsSeconds).toBe(120)
    expect(draft?.input.stations[0]).toMatchObject({
      equipment: 'WATTBIKE',
      durationSeconds: 180,
      targetWatts: 240,
    })
    expect(draft?.preview.details.join(' ')).toContain('Athlete reported that the target felt too hard')
  })

  it('creates a small progression when execution is strong and RPE is manageable', () => {
    const data = summary(null, [252, 251, 250, 252, 251, 250, 252, 251, 250, 252])
    data.summary.log.sessionRPE = 6

    const draft = buildCardioDebriefAdjustmentDraft({
      ...data,
      locale: 'en',
      now: new Date('2026-06-24T12:00:00Z'),
    })

    expect(draft?.adjustmentType).toBe('progression')
    expect(draft?.input.restBetweenRoundsSeconds).toBe(90)
    expect(draft?.input.stations[0].targetWatts).toBe(260)
    expect(draft?.preview.confirmLabel).toBe('Create adjusted workout')
  })
})
