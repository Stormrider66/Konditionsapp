import { describe, expect, it } from 'vitest'
import { extractApiErrorMessage } from './api-error'

describe('extractApiErrorMessage', () => {
  it('uses the first validation detail message', () => {
    expect(extractApiErrorMessage({
      error: 'Fallback',
      details: [
        { message: 'Distans krävs.' },
        { message: 'Tid krävs.' },
      ],
    })).toBe('Distans krävs.')
  })

  it('falls back to the top-level error message', () => {
    expect(extractApiErrorMessage({ error: 'Kunde inte spara planen.' })).toBe('Kunde inte spara planen.')
  })

  it('ignores malformed responses', () => {
    expect(extractApiErrorMessage(null)).toBeNull()
    expect(extractApiErrorMessage({ details: [{ message: 123 }] })).toBeNull()
  })
})
