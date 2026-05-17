import { describe, expect, it } from 'vitest'
import { inputDateValue, inputTimeValue, localDateTimeInputToIso } from './date-time'

describe('team calendar date/time helpers', () => {
  it('round-trips a local form time through ISO without changing the visible clock time', () => {
    const iso = localDateTimeInputToIso('2026-05-18', '17:00')

    expect(inputDateValue(new Date(iso))).toBe('2026-05-18')
    expect(inputTimeValue(iso)).toBe('17:00')
  })

  it('uses local midnight for all-day form dates', () => {
    const iso = localDateTimeInputToIso('2026-05-18')

    expect(inputDateValue(new Date(iso))).toBe('2026-05-18')
    expect(inputTimeValue(iso)).toBe('00:00')
  })
})
