/**
 * Calendar-day helpers for nutrition logging.
 *
 * MealLog.date is `@db.Date` — stored as UTC midnight of the athlete's
 * calendar day. The seams where bugs creep in are (1) deriving "today" on a
 * server whose timezone differs from the athlete's, and (2) bucketing real
 * timestamps (workouts, scans) into calendar days. Everything here is pure
 * and safe in both client and server code.
 */

const DAY_KEY_RE = /^(\d{4}-\d{2}-\d{2})/

/** 'yyyy-MM-dd' in the runtime's local timezone (client-side "today"). */
export function localDayKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 'yyyy-MM-dd' for an instant as seen in the given IANA timezone. */
export function dayKeyInTimeZone(date: Date, timeZone: string): string {
  // sv-SE formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** UTC midnight for a 'yyyy-MM-dd' key — the canonical `@db.Date` value. */
export function utcDateFromDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`)
}

/**
 * Normalizes a client-supplied date string to a day key. Date-only strings
 * (and ISO strings with a leading date part, which all our clients send as
 * athlete-local) keep their calendar date; anything else falls back to
 * interpreting the parsed instant in the given timezone.
 */
export function dayKeyFromInput(value: string, timeZone: string): string | null {
  const match = DAY_KEY_RE.exec(value)
  if (match) return match[1]
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) return null
  return dayKeyInTimeZone(parsed, timeZone)
}
