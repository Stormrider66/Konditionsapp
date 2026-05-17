import { describe, expect, it } from 'vitest'

import {
  PREHAB_STABILITY_FILTER,
  isPrehabStabilityExercise,
  matchesStrengthLibraryCategoryFilter,
} from '../exercise-library-filters'

describe('strength exercise library filters', () => {
  it('matches explicit rehab exercises as stability/prehab', () => {
    expect(isPrehabStabilityExercise({ name: 'Copenhagen plank', category: 'CORE', isRehabExercise: true })).toBe(true)
  })

  it('matches rehab phase and target body part metadata', () => {
    expect(
      isPrehabStabilityExercise({
        name: 'Band external rotation',
        category: 'WARMUP',
        rehabPhases: ['FUNCTIONAL'],
        targetBodyParts: ['shoulder', 'rotator cuff'],
      })
    ).toBe(true)
  })

  it('matches older stability exercises using conservative keywords', () => {
    expect(
      isPrehabStabilityExercise({
        name: 'Bench Bird Dog',
        category: 'CORE',
        description: 'Bål- och höftstabilitet med liten belastning.',
      })
    ).toBe(true)
  })

  it('keeps normal main lifts out of the prehab filter', () => {
    expect(
      matchesStrengthLibraryCategoryFilter(
        { name: 'Back Squat', category: 'STRENGTH', muscleGroup: 'Legs', progressionLevel: 'LEVEL_2' },
        PREHAB_STABILITY_FILTER
      )
    ).toBe(false)
  })

  it('preserves normal category matching', () => {
    expect(matchesStrengthLibraryCategoryFilter({ name: 'Box Jump', category: 'PLYOMETRIC' }, 'PLYOMETRIC')).toBe(true)
    expect(matchesStrengthLibraryCategoryFilter({ name: 'Box Jump', category: 'PLYOMETRIC' }, 'CORE')).toBe(false)
  })
})
