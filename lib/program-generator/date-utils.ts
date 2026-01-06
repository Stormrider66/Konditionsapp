/**
 * Date utilities for program generation
 * Handles timezone-safe date calculations for programs
 */

/**
 * Get a UTC start date for a program that will be immediately active.
 * Sets to midnight UTC of the current day to avoid timezone issues.
 *
 * The issue: When using local midnight (setHours(0,0,0,0)), in European timezones
 * this becomes 23:00 UTC of the previous day. If the current time is 13:00 UTC,
 * then "tomorrow midnight CET" (23:00 UTC) is still in the future, making the
 * program not yet "active" according to startDate <= now queries.
 *
 * Solution: Use UTC midnight of TODAY, ensuring programs are active immediately.
 */
export function getProgramStartDate(): Date {
  const now = new Date()
  // Set to midnight UTC of today - ensures program is active immediately
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
}

/**
 * Calculate end date from start date and duration in weeks
 */
export function getProgramEndDate(startDate: Date, durationWeeks: number): Date {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + durationWeeks * 7)
  return endDate
}
