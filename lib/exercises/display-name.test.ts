import { describe, expect, it } from 'vitest'
import { getExerciseDisplayName, getOptionalExerciseDisplayName } from './display-name'

describe('exercise display name localization', () => {
  it('prefers English name fields for English UI', () => {
    expect(getExerciseDisplayName({
      name: 'Back Squat',
      nameSv: 'Knäböj',
      nameEn: 'Barbell Back Squat',
    }, 'en')).toBe('Barbell Back Squat')
  })

  it('uses the default name before Swedish fallback in English UI', () => {
    expect(getExerciseDisplayName({
      name: 'Back Squat',
      nameSv: 'Knäböj',
      nameEn: null,
    }, 'en')).toBe('Back Squat')
  })

  it('skips blank translated names', () => {
    expect(getExerciseDisplayName({
      name: 'Back Squat',
      nameSv: 'Knäböj',
      nameEn: '   ',
    }, 'en')).toBe('Back Squat')
  })

  it('prefers Swedish names for Swedish UI', () => {
    expect(getExerciseDisplayName({
      name: 'Back Squat',
      nameSv: 'Knäböj',
      nameEn: 'Barbell Back Squat',
    }, 'sv')).toBe('Knäböj')
  })

  it('returns null for optional names without an exercise', () => {
    expect(getOptionalExerciseDisplayName(null, 'en')).toBeNull()
  })
})
