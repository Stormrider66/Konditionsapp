import { describe, expect, it } from 'vitest'

import {
  asQuickErgCoachPlannedMatch,
  buildQuickErgCoachSignals,
  resolveQuickErgDisplayMachineType,
} from './coach-summary'

describe('quick erg coach summary helpers', () => {
  it('builds coach signals for recent PR, hard, unmatched sessions', () => {
    const signals = buildQuickErgCoachSignals({
      sessionId: 'session-1',
      machineName: 'BikeErg',
      startedAt: '2026-06-14T10:00:00.000Z',
      rpe: 9,
      likelyPlannedMatch: true,
      prBadges: [{
        key: 'avg_power',
        label: 'Avg power',
        category: 'power',
        unit: 'W',
        compare: 'higher',
        priority: 10,
        value: 220,
        machineType: 'CONCEPT2_BIKEERG',
        machineName: 'BikeErg',
        sessionId: 'session-1',
        startedAt: '2026-06-14T10:00:00.000Z',
      }],
      now: new Date('2026-06-15T10:00:00.000Z'),
    })

    expect(signals.map((signal) => signal.type)).toEqual([
      'HIGH_LOAD',
      'UNMATCHED_PLAN',
      'PERSONAL_BEST',
      'NEW_SESSION',
    ])
  })

  it('does not ask for plan matching when a session is already matched', () => {
    const signals = buildQuickErgCoachSignals({
      sessionId: 'session-1',
      machineName: 'BikeErg',
      startedAt: '2026-06-14T10:00:00.000Z',
      likelyPlannedMatch: true,
      plannedMatch: {
        assignmentId: 'assignment-1',
        sessionId: 'planned-1',
        sessionName: 'Bike tempo',
        assignedDate: '2026-06-14',
      },
      now: new Date('2026-06-15T10:00:00.000Z'),
    })

    expect(signals.some((signal) => signal.type === 'UNMATCHED_PLAN')).toBe(false)
  })

  it('parses stored planned matches defensively', () => {
    expect(asQuickErgCoachPlannedMatch({
      type: 'cardio_assignment',
      assignmentId: 'assignment-1',
      sessionId: 'planned-1',
      sessionName: 'Bike tempo',
      assignedDate: '2026-06-14',
      matchedAt: '2026-06-14T12:00:00.000Z',
    })).toEqual({
      assignmentId: 'assignment-1',
      sessionId: 'planned-1',
      sessionName: 'Bike tempo',
      assignedDate: '2026-06-14',
      matchedAt: '2026-06-14T12:00:00.000Z',
    })

    expect(asQuickErgCoachPlannedMatch({ type: 'cardio_assignment', assignmentId: 'assignment-1' })).toBeNull()
  })

  it('normalizes PM5 bike devices to BikeErg for coach display', () => {
    expect(resolveQuickErgDisplayMachineType({
      machineType: 'FTMS_BIKE',
      machineKind: 'bike',
      deviceName: 'PM5 431544933',
    })).toBe('CONCEPT2_BIKEERG')
  })
})
