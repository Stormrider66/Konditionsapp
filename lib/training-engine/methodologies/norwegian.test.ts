import { describe, expect, it } from 'vitest'
import { getNorwegianDoublesSession, getNorwegianSinglesSession } from './norwegian'

describe('Norwegian methodology session copy', () => {
  it('defaults singles descriptions to English', () => {
    const session = getNorwegianSinglesSession('6x1K')

    expect(session.description).toBe('6 × 1000m at 10K-15K pace (85-88% of 5K pace)')
    expect(session.description).not.toContain('på')
  })

  it('keeps singles descriptions in Swedish when requested', () => {
    const session = getNorwegianSinglesSession('6x1K', 'sv')

    expect(session.description).toBe('6 × 1000m på 10K-15K-tempo (85-88% av 5K-tempo)')
  })

  it('defaults doubles descriptions to English', () => {
    const session = getNorwegianDoublesSession('PM_25x400')

    expect(session.description).toBe('Evening: 25 × 400m at high threshold (3.0-4.0 mmol/L), 30s recovery (high density)')
    expect(session.description).not.toContain('Kväll')
  })
})
