import { startOfDay, endOfDay, addDays } from 'date-fns'

/**
 * Training day dates may be stored at CET/CEST midnight (UTC+1/+2),
 * which shifts them to 22:00-23:00 UTC the day before.
 * Vercel servers run in UTC, so startOfDay/endOfDay use UTC boundaries
 * and can miss training days for European timezones.
 *
 * These helpers extend the range by 3 hours to safely cover UTC+1 through UTC+3.
 */

/** Start of a calendar day, shifted to cover CET/CEST midnight (UTC -3h) */
export function tzSafeDayStart(date: Date): Date {
  return new Date(startOfDay(date).getTime() - 3 * 60 * 60 * 1000)
}

/** End of a calendar day, shifted to cover CET/CEST midnight (next day UTC -3h) */
export function tzSafeDayEnd(date: Date): Date {
  return new Date(startOfDay(addDays(date, 1)).getTime() - 3 * 60 * 60 * 1000)
}
