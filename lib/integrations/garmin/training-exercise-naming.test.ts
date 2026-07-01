import { describe, expect, it } from 'vitest'
import { serializeWorkoutToGarmin, buildGarminStrengthWorkout } from './training'

/**
 * Regression guard for the "Okänd" / unnamed-interval bug: workout steps pushed
 * to Garmin must carry exerciseCategory/exerciseName (what the watch renders),
 * not just a free-text description (which it ignores).
 */
describe('serializeWorkoutToGarmin — exercise identity on EMOM repeat groups', () => {
  it('puts exerciseCategory/exerciseName/weight on repeat-group child steps', () => {
    const workout = serializeWorkoutToGarmin({
      name: 'EMOM 30',
      sportType: 'GENERAL_FITNESS',
      segments: [
        {
          type: 'interval',
          repeats: 5,
          steps: [
            { type: 'interval', durationSeconds: 60, description: '15 cal', exerciseCategory: 'INDOOR_BIKE', exerciseName: 'ASSAULT_BIKE' },
            { type: 'interval', durationSeconds: 60, description: '6 reps', exerciseCategory: 'OLYMPIC_LIFT', exerciseName: 'CLEAN_AND_JERK', weightKg: 40 },
          ],
        },
      ],
    })

    const repeat = workout.steps[0] as { type: string; steps: Array<Record<string, unknown>> }
    expect(repeat.type).toBe('WorkoutRepeatStep')
    expect(repeat.steps[0]).toMatchObject({ exerciseCategory: 'INDOOR_BIKE', exerciseName: 'ASSAULT_BIKE' })
    expect(repeat.steps[1]).toMatchObject({
      exerciseCategory: 'OLYMPIC_LIFT',
      exerciseName: 'CLEAN_AND_JERK',
      weightValue: 40,
      weightDisplayUnit: 'KILOGRAM',
    })
  })

  it('passes exercise identity through to single (non-repeat) steps', () => {
    const workout = serializeWorkoutToGarmin({
      name: 'Row',
      sportType: 'CARDIO_TRAINING',
      segments: [{ type: 'interval', durationSeconds: 60, exerciseCategory: 'ROW', exerciseName: 'INDOOR_ROW' }],
    })
    expect(workout.steps[0]).toMatchObject({ exerciseCategory: 'ROW', exerciseName: 'INDOOR_ROW' })
  })
})

describe('buildGarminStrengthWorkout — resolves names to Garmin enums', () => {
  it('sets exerciseCategory/exerciseName/weight from the free-text exercise name', () => {
    const workout = buildGarminStrengthWorkout({
      name: 'Strength',
      exercises: [
        { exerciseId: '', exerciseName: 'Clean and jerk', sets: 1, reps: 6, weight: 40 },
      ],
    })
    // sets=1, no rest → single lap-button work step
    expect(workout.steps[0]).toMatchObject({
      exerciseCategory: 'OLYMPIC_LIFT',
      exerciseName: 'CLEAN_AND_JERK',
      weightValue: 40,
      weightDisplayUnit: 'KILOGRAM',
    })
  })
})
