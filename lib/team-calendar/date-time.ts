export function inputDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function inputTimeValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

export function localDateTimeInputToIso(dateValue: string, timeValue = '00:00'): string {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours, minutes] = timeValue.split(':').map(Number)
  return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0).toISOString()
}

export function dbDateFromZonedCalendarDay(value: Date | string, timeZone = 'Europe/Stockholm'): Date {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return date

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  if (!year || !month || !day) return date
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
}

/**
 * Format a Date as a canonical 24-hour "HH:mm" wall-clock string in the given
 * time zone (Swedish time by default).
 *
 * Stored times — e.g. an assignment's `startTime` — are time-zone-naive "HH:mm"
 * strings, so they must be derived from the event's *local* wall clock, not the
 * server's clock. On Vercel the runtime is UTC, so `date.toLocaleTimeString()`
 * with no `timeZone` silently renders 17:00 CEST as "15:00". Always pin the zone.
 */
export function zonedTimeString(
  value: Date | string | null | undefined,
  timeZone = 'Europe/Stockholm'
): string | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
