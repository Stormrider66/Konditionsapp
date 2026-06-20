import { describe, expect, it } from 'vitest'

import {
  buildTeamCaptureTemplateFromCardioSession,
  buildTeamCaptureTemplateFromHybridWorkout,
} from './workout-template'

describe('team capture workout templates', () => {
  it('converts a Cardio repeat group into a capture template', () => {
    const template = buildTeamCaptureTemplateFromCardioSession({
      id: 'cardio-1',
      name: 'Echo / Ski / Run',
      sport: 'HYBRID',
      segments: [
        {
          type: 'REPEAT_GROUP',
          repeats: 4,
          restBetweenRounds: 60,
          steps: [
            { type: 'WORK', equipment: 'ECHO_BIKE', calories: 20, label: 'Echo Bike 20 cal' },
            { type: 'WORK', equipment: 'SKI_ERG', calories: 18, label: 'SkiErg 18 cal' },
            { type: 'WORK', equipment: 'RUN', distance: 200, label: 'Run 200 m' },
          ],
        },
      ],
    })

    expect(template).toMatchObject({
      source: 'CARDIO',
      workoutType: 'CARDIO',
      workoutId: 'cardio-1',
      roundCount: 4,
      restBetweenRoundsSeconds: 60,
    })
    expect(template?.stations.map((station) => station.equipmentKey)).toEqual([
      'ECHO_BIKE',
      'SKI_ERG',
      'RUN',
    ])
    expect(template?.stations.map((station) => station.captureMethod)).toEqual([
      'BLUETOOTH_STATION',
      'BLUETOOTH_STATION',
      'GARMIN_LAP_OR_MANUAL',
    ])
    expect(template?.summary).toMatchObject({
      bluetoothStationCount: 2,
      runStationCount: 1,
    })
  })

  it('converts a Hybrid metcon block into a capture template', () => {
    const template = buildTeamCaptureTemplateFromHybridWorkout({
      id: 'hybrid-1',
      name: 'Assault / Row / Run',
      format: 'EMOM',
      totalRounds: 10,
      restTime: 60,
      metconData: {
        blocks: [
          {
            rounds: 10,
            restAfterSeconds: 60,
            movements: [
              { equipment: 'ASSAULT_BIKE', calories: 20, label: 'AssaultBike 20 cal' },
              { equipment: 'ROW', calories: 20, label: 'RowErg 20 cal' },
              { equipment: 'RUN', distance: 200, label: 'Run 200 m' },
            ],
          },
        ],
      },
      movements: [],
    })

    expect(template).toMatchObject({
      source: 'HYBRID',
      workoutType: 'HYBRID',
      workoutId: 'hybrid-1',
      roundCount: 10,
      restBetweenRoundsSeconds: 60,
    })
    expect(template?.stations.map((station) => station.equipmentKey)).toEqual([
      'ASSAULT_BIKE',
      'ROW',
      'RUN',
    ])
    expect(template?.stations[0]).toMatchObject({
      machineType: 'ASSAULT_BIKE',
      targetCalories: 20,
    })
  })
})
