import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/integrations/garmin/client', () => ({
  getValidGarminAccessToken: vi.fn(),
}))

vi.mock('@/lib/http/fetch', () => ({
  fetchWithTimeoutAndRetry: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
  parseNumberTargetBounds,
  parsePaceTargetBounds,
  serializeWorkoutToGarmin,
} from '@/lib/integrations/garmin/training'

describe('Garmin Training API serializer', () => {
  it('converts pace ranges to sorted Garmin speed bounds', () => {
    const bounds = parsePaceTargetBounds('4:00-4:30/km')

    expect(bounds.low).toBeCloseTo(1000 / 270, 5)
    expect(bounds.high).toBeCloseTo(1000 / 240, 5)
  })

  it('parses numeric target ranges for power and cadence', () => {
    expect(parseNumberTargetBounds('240-260')).toEqual({ low: 240, high: 260 })
    expect(parseNumberTargetBounds('90 rpm')).toEqual({ low: 90, high: 90 })
  })

  it('serializes running intervals with targets and repeat groups', () => {
    const workout = serializeWorkoutToGarmin({
      name: 'Threshold 6x1k',
      sportType: 'RUNNING',
      segments: [
        {
          type: 'warmup',
          durationSeconds: 900,
          description: 'Easy jog',
        },
        {
          type: 'interval',
          repeats: 6,
          steps: [
            {
              type: 'interval',
              distanceMeters: 1000,
              targetType: 'pace',
              targetLow: 1000 / 270,
              targetHigh: 1000 / 240,
              description: 'Controlled threshold',
            },
            {
              type: 'recovery',
              durationSeconds: 90,
            },
          ],
        },
        {
          type: 'cooldown',
          durationSeconds: 600,
        },
      ],
    })

    expect(workout.sport).toBe('RUNNING')
    expect(workout.steps).toHaveLength(3)
    expect(workout.steps[0]).toMatchObject({
      type: 'WorkoutStep',
      durationType: 'TIME',
      durationValue: 900,
      description: 'Easy jog',
    })
    expect(workout.steps[1]).toMatchObject({
      type: 'WorkoutRepeatStep',
      repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',
      numberOfIterations: 6,
    })

    const repeat = workout.steps[1] as { steps: Array<Record<string, unknown>> }
    expect(repeat.steps[0]).toMatchObject({
      durationType: 'DISTANCE',
      durationValue: 1000,
      targetType: 'SPEED',
      targetValueOne: 1000 / 270,
      targetValueTwo: 1000 / 240,
      description: 'Controlled threshold',
    })
    expect(repeat.steps[1]).toMatchObject({
      stepType: 'RECOVERY',
      durationType: 'TIME',
      durationValue: 90,
    })
  })

  it('serializes cycling power and cadence targets', () => {
    const workout = serializeWorkoutToGarmin({
      name: 'Bike intervals',
      sportType: 'CYCLING',
      segments: [
        {
          type: 'interval',
          durationSeconds: 300,
          targetType: 'power',
          targetLow: 250,
          targetHigh: 280,
          description: 'Wattbike',
        },
        {
          type: 'steady',
          durationSeconds: 600,
          targetType: 'cadence',
          targetLow: 85,
          targetHigh: 95,
        },
      ],
    })

    expect(workout.sport).toBe('CYCLING')
    expect(workout.steps[0]).toMatchObject({
      targetType: 'POWER',
      targetValueOne: 250,
      targetValueTwo: 280,
      description: 'Wattbike',
    })
    expect(workout.steps[1]).toMatchObject({
      targetType: 'CADENCE',
      targetValueOne: 85,
      targetValueTwo: 95,
    })
  })
})
