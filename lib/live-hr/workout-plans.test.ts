import { describe, expect, it } from 'vitest'
import {
  buildLiveHRStepsFromCardioSession,
  buildLiveHRStepsFromHybridWorkout,
} from './workout-plans'

describe('Live HR workout plan parsing', () => {
  it('expands cardio repeat groups with rest and power targets', () => {
    const steps = buildLiveHRStepsFromCardioSession({
      id: 'cardio-1',
      name: 'Bike intervals',
      segments: [
        {
          id: 'repeat',
          type: 'REPEAT_GROUP',
          repeats: 2,
          restBetweenRounds: 60,
          steps: [
            {
              id: 'work',
              type: 'INTERVAL',
              duration: 180,
              equipment: 'BIKE_ERG',
              targetType: 'power',
              targetValue: '320',
              cadence: '95',
            },
            { id: 'rest', type: 'REST', duration: 90, zone: 1 },
          ],
        },
      ],
    })

    expect(steps.map((step) => step.type)).toEqual(['INTERVAL', 'REST', 'REST', 'INTERVAL', 'REST'])
    expect(steps[0]).toMatchObject({
      label: 'R1 Interval 1',
      durationSeconds: 180,
      targetPower: 320,
      targetCadence: 95,
      equipment: 'BIKE_ERG',
    })
    expect(steps[2]).toMatchObject({ label: 'R1 Rest', durationSeconds: 60 })
  })

  it('builds hybrid movement targets from metcon blocks', () => {
    const steps = buildLiveHRStepsFromHybridWorkout({
      id: 'hybrid-1',
      name: 'Mixed erg',
      format: 'ROUNDS_FOR_TIME',
      totalRounds: 1,
      restTime: 30,
      metconData: {
        blocks: [
          {
            rounds: 2,
            restAfterSeconds: 45,
            movements: [
              {
                id: 'bike',
                name: 'BikeErg',
                type: 'INTERVAL',
                calories: 20,
                duration: 75,
                targetPower: 300,
              },
            ],
          },
        ],
      },
      movements: [],
    })

    expect(steps.map((step) => step.type)).toEqual(['INTERVAL', 'REST', 'INTERVAL'])
    expect(steps[0]).toMatchObject({
      label: 'R1 BikeErg',
      targetCalories: 20,
      targetPower: 300,
      durationSeconds: 75,
    })
    expect(steps[1]).toMatchObject({ label: 'R1 Rest', durationSeconds: 45 })
  })
})
