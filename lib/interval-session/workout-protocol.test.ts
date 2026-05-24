import { describe, expect, it } from 'vitest'
import {
  buildIntervalProtocolFromCardioSession,
  buildIntervalProtocolFromHybridWorkout,
} from './workout-protocol'

describe('interval workout protocol conversion', () => {
  it('expands cardio repeat groups into named live timing steps', () => {
    const protocol = buildIntervalProtocolFromCardioSession({
      id: 'cardio-1',
      name: 'Löpning PHC 1km, 5x300m',
      sport: 'RUNNING',
      segments: [
        { type: 'INTERVAL', distance: 1000 },
        {
          type: 'REPEAT_GROUP',
          repeats: 5,
          steps: [
            { type: 'INTERVAL', distance: 300 },
            { type: 'RECOVERY', duration: 90 },
          ],
        },
      ],
    })

    expect(protocol?.intervalCount).toBe(6)
    expect(protocol?.restDurationSeconds).toBe(90)
    expect(protocol?.steps?.map((step) => step.label)).toEqual([
      '1 km',
      '300 m 1/5',
      '300 m 2/5',
      '300 m 3/5',
      '300 m 4/5',
      '300 m 5/5',
    ])
  })

  it('builds hybrid calorie and distance stations as live timing steps', () => {
    const protocol = buildIntervalProtocolFromHybridWorkout({
      id: 'hybrid-1',
      name: 'Bike + run',
      format: 'FOR_TIME',
      totalRounds: 2,
      restTime: 60,
      movements: [
        { exercise: { name: 'Bike' }, calories: 20 },
        { exercise: { name: 'Run' }, distance: 400 },
      ],
    })

    expect(protocol?.intervalCount).toBe(4)
    expect(protocol?.restDurationSeconds).toBe(60)
    expect(protocol?.steps?.[0].label).toBe('Bike 20 cal 1/2')
    expect(protocol?.steps?.[1].label).toBe('Run 400 m 1/2')
  })
})
