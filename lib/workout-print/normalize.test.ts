import { describe, expect, it } from 'vitest'
import { normalizePrintableWorkout } from './normalize'

describe('normalizePrintableWorkout', () => {
  it('uses metcon block exerciseName and prescriptions for hybrid print rows', () => {
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
            restAfterSeconds: 180,
            movements: [
              { exerciseId: 'ski', exerciseName: 'SkiErg', distance: 250 },
              { exerciseId: 'press', exerciseName: 'Push Press', reps: 10, weightMale: 40 },
            ],
          },
        ],
      },
    }, { locale: 'sv' })

    expect(workout.sections[0].items[0].details).toContain('vila efter 3 min')
    expect(workout.sections[0].items[0].details).toContain('SkiErg 250 m')
    expect(workout.sections[0].items[0].details).toContain('Push Press 10 reps, herr 40 kg')
    expect(workout.sections[0].items[0].details).not.toContain('Rörelse')
  })
})
