import { describe, expect, it } from 'vitest'
import {
  calculateStrengthSessionVolumeLoad,
  countStrengthSessionExercises,
  countStrengthSessionSets,
} from '@/lib/strength/session-sections'

describe('strength session section totals', () => {
  it('counts warm-up, main, prehab, core, and cooldown exercises', () => {
    const session = {
      exercises: [
        { sets: 4, reps: 3, weight: 50, followUps: [{ exerciseId: 'jump' }] },
        { sets: 3, reps: 8, weight: 40 },
      ],
      warmupData: {
        exercises: [
          { sets: 2, reps: 10 },
          { sets: 2, reps: 18 },
        ],
      },
      prehabData: { exercises: [{ sets: 2, reps: 12 }] },
      coreData: { exercises: [{ sets: 3, reps: 30 }] },
      cooldownData: { exercises: [{ duration: 45 }] },
    }

    expect(countStrengthSessionExercises(session)).toBe(7)
    expect(countStrengthSessionSets(session)).toBe(21)
    expect(calculateStrengthSessionVolumeLoad(session)).toBe(4 * 3 * 50 + 3 * 8 * 40)
  })
})
