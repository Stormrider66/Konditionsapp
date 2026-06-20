import { describe, expect, it } from 'vitest'

import { buildTeamCaptureLanePlan } from './schedule'

function members(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `client-${index + 1}`,
    name: `Player ${index + 1}`,
    jerseyNumber: index + 1,
    position: index % 2 === 0 ? 'Back' : 'Forward',
  }))
}

describe('team capture lane schedule', () => {
  it('builds a 6-lane, 22-athlete hybrid startlist with 10 rounds and 1-minute rests', () => {
    const plan = buildTeamCaptureLanePlan(members(22))

    expect(plan.participants).toHaveLength(22)
    expect(plan.stations).toHaveLength(12)
    expect(plan.heatDurationSec).toBe(10 * (75 + 75 + 45) + 9 * 60)
    expect(plan.totalPlannedDurationSec).toBe(plan.heatDurationSec * 4)

    expect(plan.participants[0]).toMatchObject({
      clientId: 'client-1',
      laneNumber: 1,
      heatNumber: 1,
      expectedStartOffsetSec: 0,
    })
    expect(plan.participants[5]).toMatchObject({ clientId: 'client-6', laneNumber: 6, heatNumber: 1 })
    expect(plan.participants[6]).toMatchObject({
      clientId: 'client-7',
      laneNumber: 1,
      heatNumber: 2,
      expectedStartOffsetSec: plan.heatDurationSec,
    })

    const firstAthleteSegments = plan.segments.filter((segment) => segment.clientId === 'client-1')
    expect(firstAthleteSegments).toHaveLength(39)
    expect(firstAthleteSegments.filter((segment) => segment.machineType === 'REST')).toHaveLength(9)
    expect(firstAthleteSegments.at(-1)).toMatchObject({
      roundNumber: 10,
      machineType: 'RUN',
      targetDistanceMeters: 200,
    })
  })

  it('uses configured calories, run distance, lane count, and rest labels', () => {
    const plan = buildTeamCaptureLanePlan(members(7), {
      laneCount: 3,
      roundCount: 2,
      bikeCalories: 18,
      rowCalories: 22,
      runDistanceMeters: 150,
      restBetweenRoundsSeconds: 75,
    })

    expect(plan.participants[3]).toMatchObject({ laneNumber: 1, heatNumber: 2 })
    expect(plan.stations).toHaveLength(6)

    const labels = plan.segments
      .filter((segment) => segment.clientId === 'client-1')
      .map((segment) => segment.label)

    expect(labels).toEqual([
      'Round 1 BikeErg 18 cal',
      'Round 1 RowErg 22 cal',
      'Round 1 Run 150 m',
      'Round 1 Rest 1:15',
      'Round 2 BikeErg 18 cal',
      'Round 2 RowErg 22 cal',
      'Round 2 Run 150 m',
    ])
  })
})
