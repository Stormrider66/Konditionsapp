import { describe, expect, it } from 'vitest'

import {
  PREHAB_STABILITY_FILTER,
  isStrengthStudioExercise,
  isStrengthStudioExerciseNameCandidate,
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

  it('keeps real strength rows in the Strength Studio library', () => {
    expect(isStrengthStudioExercise({
      name: 'Bent Over Row',
      category: 'STRENGTH',
      muscleGroup: 'Back',
    })).toBe(true)
    expect(isStrengthStudioExercise({
      name: 'Hantelrodd',
      category: 'STRENGTH',
      muscleGroup: 'Rygg',
    })).toBe(true)
  })

  it('removes HYROX and cardio blocks from the Strength Studio library', () => {
    expect(isStrengthStudioExercise({
      name: '1000m löpning',
      category: 'HYROX',
      iconCategory: 'cardio',
      equipmentTypes: ['RUNNING'],
    })).toBe(false)
    expect(isStrengthStudioExercise({
      name: '1000m intervaller',
      category: 'STRENGTH',
      muscleGroup: 'cardio',
    })).toBe(false)
    expect(isStrengthStudioExercise({
      name: '25 cal assault bike + 10 burpees',
      category: 'STRENGTH',
      iconCategory: 'cardio',
    })).toBe(false)
  })

  it('rejects importer placeholders and workout block labels as exercise names', () => {
    expect(isStrengthStudioExerciseNameCandidate('A1')).toBe(false)
    expect(isStrengthStudioExerciseNameCandidate('3-4 varv av')).toBe(false)
    expect(isStrengthStudioExerciseNameCandidate('1200m rodd')).toBe(false)
    expect(isStrengthStudioExerciseNameCandidate('Knäböj')).toBe(true)
  })
})
