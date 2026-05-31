import { describe, expect, it } from 'vitest'
import { calculateWeeklyVolumeProgression, getPhaseFocus } from './periodization'

describe('periodization locale copy', () => {
  it('defaults weekly focus text to English', () => {
    const progression = calculateWeeklyVolumeProgression(8, 20, 40)

    expect(progression[0]?.focus).toBe('Build base fitness')
    expect(progression.some((week) => /[åäöÅÄÖ]/.test(week.focus))).toBe(false)
  })

  it('keeps Swedish weekly focus text when requested', () => {
    const progression = calculateWeeklyVolumeProgression(8, 20, 40, 'sv')

    expect(progression[0]?.focus).toBe('Bygg grundkondition')
    expect(progression.some((week) => /[åäöÅÄÖ]/.test(week.focus))).toBe(true)
  })

  it('defaults phase focus text to English', () => {
    expect(getPhaseFocus('TAPER')).toBe('Reduce volume, maintain intensity, and prepare to race')
    expect(getPhaseFocus('TAPER', 'sv')).toBe('Minska volym, behåll intensitet, förbered för tävling')
  })
})
