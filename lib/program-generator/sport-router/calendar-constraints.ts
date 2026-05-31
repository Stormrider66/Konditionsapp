import type { CreateTrainingProgramDTO } from '@/types'
import type { SportProgramParams } from './types'
import { resolveSportRouterLocale, text } from './locale'

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Helper to check if a date is blocked by calendar constraints
 */
export function isDateBlocked(date: Date, blockedDates: string[]): boolean {
  const dateStr = formatLocalDate(date)
  return blockedDates.includes(dateStr)
}

/**
 * Helper to check if a date has reduced capacity
 */
export function isDateReduced(date: Date, reducedDates: string[]): boolean {
  const dateStr = formatLocalDate(date)
  return reducedDates.includes(dateStr)
}

/**
 * Apply calendar constraints to a generated program
 * - Remove workouts from blocked dates
 * - Add notes for reduced capacity dates
 */
export function applyCalendarConstraints(
  program: CreateTrainingProgramDTO,
  constraints: SportProgramParams['calendarConstraints'],
  localeInput?: SportProgramParams['locale']
): CreateTrainingProgramDTO {
  if (!constraints) return program

  const locale = resolveSportRouterLocale(localeInput)
  const { blockedDates = [], reducedDates = [] } = constraints
  const blockedNote = text(locale, 'Rest day (calendar block)', 'Vilodag (kalenderblockering)')
  const reducedNote = text(locale, 'Reduced training capacity', 'Reducerad träningskapacitet')

  // Process each week and day
  const updatedWeeks = program.weeks?.map((week: any) => {
    const updatedDays = week.days.map((day: any) => {
      // Calculate the actual date for this day
      const weekStartMs = program.startDate.getTime() + (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
      const dayDate = new Date(weekStartMs + (day.dayNumber - 1) * 24 * 60 * 60 * 1000)

      // Check if this date is blocked
      if (isDateBlocked(dayDate, blockedDates)) {
        // Remove all workouts and add a note
        return {
          ...day,
          workouts: [],
          notes: day.notes
            ? `${day.notes}\n${blockedNote}`
            : blockedNote,
        }
      }

      // Check if this date has reduced capacity
      if (isDateReduced(dayDate, reducedDates)) {
        // Keep workouts but add a note about reduced capacity
        return {
          ...day,
          notes: day.notes
            ? `${day.notes}\n${reducedNote}`
            : reducedNote,
        }
      }

      return day
    })

    return {
      ...week,
      days: updatedDays,
    }
  })

  return {
    ...program,
    weeks: updatedWeeks,
  }
}
