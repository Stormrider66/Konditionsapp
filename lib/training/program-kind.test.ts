import { describe, expect, it } from 'vitest'
import { isStructuredTrainingProgram } from './program-kind'

describe('isStructuredTrainingProgram', () => {
  it.each(['Personal Training', 'Personlig Träning', '  PERSONLIG TRÄNING  '])(
    'treats the ad-hoc WOD container %s as non-structured',
    (name) => {
      expect(isStructuredTrainingProgram({ name })).toBe(false)
    }
  )

  it('keeps real athlete programs structured', () => {
    expect(isStructuredTrainingProgram({ name: '10 km sub-40' })).toBe(true)
  })
})
