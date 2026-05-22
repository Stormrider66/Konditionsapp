import { describe, expect, it } from 'vitest'
import {
  dbDateFromZonedCalendarDay,
  inputDateValue,
  inputTimeValue,
  localDateTimeInputToIso,
} from './date-time'

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

  it('stores Stockholm all-day events on the visible calendar date', () => {
    const date = dbDateFromZonedCalendarDay('2026-05-28T22:00:00.000Z')

    expect(date.toISOString().slice(0, 10)).toBe('2026-05-29')
  })
})
