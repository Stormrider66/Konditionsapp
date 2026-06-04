import { describe, expect, it } from 'vitest'
import { normalizePrintableWorkout } from './normalize'

describe('normalizePrintableWorkout', () => {
  it('formats strength print doses without awkward reps suffixes', () => {
    const workout = normalizePrintableWorkout('strength', {
      name: 'Styrka 2',
      warmupData: {
        duration: 10,
        exercises: [
          { exerciseName: 'Uppvärmning valfritt redskap', sets: 1, reps: '10min', durationSeconds: 600 },
          { exerciseName: 'Utfallsrotationer', sets: 2, reps: '6/sida', restSeconds: 45 },
          { exerciseName: 'Hexabar', sets: 5, reps: 5, restSeconds: 90 },
          {
            exerciseName: 'Hängande rodd, fötter på bänk',
            sets: 4,
            reps: '6-8 + amrap',
            setRows: [{ reps: '6-8' }, { reps: 'amrap' }],
          },
        ],
      },
    }, { locale: 'sv' })

    const items = workout.sections[0].items
    expect(workout.sections[0].subtitle).toBe('10 min')
    expect(items[0].details).toEqual(['10 min'])
    expect(items[1].details).toContain('6/sida')
    expect(items[1].details).not.toContain('6/sida reps')
    expect(items[2].details).toContain('5 reps')
    expect(items[3].details).toContain('6-8 + amrap')
    expect(items[3].details).toContain('Set 2: amrap')
    expect(items[3].details).not.toContain('Set 2: amrap reps')
  })

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

    expect(workout.sections[0].items[0].details).toContain('vila 3 min efter')
    expect(workout.sections[0].items[0].details).toContain('SkiErg 250 m')
    expect(workout.sections[0].items[0].details).toContain('Push Press 10 reps, herr 40 kg')
    expect(workout.sections[0].items[0].details).not.toContain('Rörelse')
  })
})
