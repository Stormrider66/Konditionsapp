import { describe, expect, it } from 'vitest'
import { normalizePrintableWorkout } from './normalize'

describe('normalizePrintableWorkout', () => {
  it('uses metcon block exerciseName values for hybrid print rows', () => {
    const workout = normalizePrintableWorkout('hybrid', {
      name: 'Hybrid 1',
      format: 'EMOM',
      metconData: {
        blocks: [
          {
            id: 'block-1',
            title: 'Block 1',
            format: 'EMOM',
            rounds: 7,
            intervalSeconds: 120,
            movements: [
              { exerciseId: 'ski', exerciseName: 'SkiErg', calories: 15 },
              { exerciseId: 'press', exerciseName: 'Push Press', reps: 10, weightMale: 40 },
            ],
          },
        ],
      },
    })

    expect(workout.sections[0].items[0].details).toContain('SkiErg')
    expect(workout.sections[0].items[0].details).toContain('Push Press')
    expect(workout.sections[0].items[0].details).not.toContain('Rörelse')
  })
})
