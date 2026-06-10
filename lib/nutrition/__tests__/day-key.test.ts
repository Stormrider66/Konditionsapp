import { describe, expect, it } from 'vitest'
import { dayKeyFromInput, dayKeyInTimeZone, utcDateFromDayKey } from '../day-key'

describe('dayKeyInTimeZone', () => {
  it('keeps a late Stockholm evening on the same calendar day', () => {
    // 23:30 in Stockholm (UTC+2 in summer) = 21:30 UTC same day
    const instant = new Date('2026-06-09T21:30:00.000Z')
    expect(dayKeyInTimeZone(instant, 'Europe/Stockholm')).toBe('2026-06-09')
  })

  it('rolls past-midnight Stockholm instants to the next day', () => {
    // 00:30 in Stockholm on June 10 = 22:30 UTC June 9
    const instant = new Date('2026-06-09T22:30:00.000Z')
    expect(dayKeyInTimeZone(instant, 'Europe/Stockholm')).toBe('2026-06-10')
  })

  it('handles western timezones', () => {
    // 20:00 in New York (UTC-4 in summer) = 00:00 UTC next day
    const instant = new Date('2026-06-10T00:00:00.000Z')
    expect(dayKeyInTimeZone(instant, 'America/New_York')).toBe('2026-06-09')
  })
})

describe('utcDateFromDayKey', () => {
  it('produces UTC midnight regardless of runtime timezone', () => {
    const d = utcDateFromDayKey('2026-06-09')
    expect(d.toISOString()).toBe('2026-06-09T00:00:00.000Z')
  })
})

describe('dayKeyFromInput', () => {
  it('trusts date-only strings as calendar dates', () => {
    expect(dayKeyFromInput('2026-06-09', 'America/New_York')).toBe('2026-06-09')
  })

  it('keeps the leading date part of ISO strings', () => {
    expect(dayKeyFromInput('2026-06-09T23:30:00', 'Europe/Stockholm')).toBe('2026-06-09')
  })

  it('rejects garbage', () => {
    expect(dayKeyFromInput('not-a-date', 'Europe/Stockholm')).toBeNull()
  })
})
