/**
 * Accountability Streak Types
 *
 * Type definitions for the streak tracking system.
 */

export interface StreakData {
  currentStreak: number
  personalBest: number
  personalBestDate: string | null
  hasCheckedInToday: boolean
  isNewRecord: boolean
}

export interface CheckInDay {
  date: string // YYYY-MM-DD
  checkedIn: boolean
}

export interface StreakMilestone {
  days: number
  label: string
  celebrationLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
}

export interface StreakMotivation {
  type: 'approaching_record' | 'at_record' | 'new_milestone' | 'keep_going'
  message: string
}

export interface StreakResponse {
  success: boolean
  data: {
    currentStreak: number
    personalBest: number
    personalBestDate: string | null
    hasCheckedInToday: boolean
    isNewRecord: boolean
    checkInHistory: CheckInDay[]
    nextMilestone: {
      days: number
      label: string
      celebrationLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
    } | null
    daysUntilMilestone: number | null
    motivation: StreakMotivation
  }
}

type StreakLocale = 'en' | 'sv'

// Streak milestone thresholds with Swedish labels kept as the default export.
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, label: 'En vecka stark!', celebrationLevel: 'BRONZE' },
  { days: 14, label: 'Två veckor!', celebrationLevel: 'BRONZE' },
  { days: 21, label: 'Tre veckor - vana bildas!', celebrationLevel: 'SILVER' },
  { days: 30, label: 'En hel månad!', celebrationLevel: 'SILVER' },
  { days: 60, label: 'Två månader!', celebrationLevel: 'GOLD' },
  { days: 90, label: 'Kvartalet är ditt!', celebrationLevel: 'GOLD' },
  { days: 180, label: 'Halvåret avklarat!', celebrationLevel: 'PLATINUM' },
  { days: 365, label: 'Ett helt år - legendär!', celebrationLevel: 'PLATINUM' },
]

const EN_STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, label: 'One strong week!', celebrationLevel: 'BRONZE' },
  { days: 14, label: 'Two weeks!', celebrationLevel: 'BRONZE' },
  { days: 21, label: 'Three weeks - a habit is forming!', celebrationLevel: 'SILVER' },
  { days: 30, label: 'A full month!', celebrationLevel: 'SILVER' },
  { days: 60, label: 'Two months!', celebrationLevel: 'GOLD' },
  { days: 90, label: 'The quarter is yours!', celebrationLevel: 'GOLD' },
  { days: 180, label: 'Half a year complete!', celebrationLevel: 'PLATINUM' },
  { days: 365, label: 'A full year - legendary!', celebrationLevel: 'PLATINUM' },
]

function getMilestones(locale: StreakLocale): StreakMilestone[] {
  return locale === 'sv' ? STREAK_MILESTONES : EN_STREAK_MILESTONES
}

/**
 * Get the next milestone for a given streak count
 */
export function getNextMilestone(
  currentStreak: number,
  locale: StreakLocale = 'sv'
): StreakMilestone | null {
  return getMilestones(locale).find((m) => m.days > currentStreak) || null
}

/**
 * Check if a streak count is a milestone
 */
export function isMilestone(streak: number): boolean {
  return STREAK_MILESTONES.some((m) => m.days === streak)
}

/**
 * Get milestone for a specific streak count
 */
export function getMilestoneForStreak(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days === streak) || null
}

/**
 * Generate motivation message based on streak status
 */
export function getMotivationMessage(
  currentStreak: number,
  personalBest: number,
  locale: StreakLocale = 'sv'
): StreakMotivation {
  const nextMilestone = getNextMilestone(currentStreak, locale)
  const daysToRecord = personalBest - currentStreak
  const daysToMilestone = nextMilestone ? nextMilestone.days - currentStreak : null
  const dayLabel = (days: number) => {
    if (locale === 'sv') return days === 1 ? 'dag' : 'dagar'
    return days === 1 ? 'day' : 'days'
  }

  // At personal best
  if (currentStreak > 0 && currentStreak >= personalBest) {
    return {
      type: 'at_record',
      message: locale === 'sv' ? 'Du är på ditt rekord! Fortsätt!' : 'You are at your record! Keep going!',
    }
  }

  // Close to personal best (within 3 days)
  if (daysToRecord > 0 && daysToRecord <= 3) {
    return {
      type: 'approaching_record',
      message: locale === 'sv'
        ? `${daysToRecord} ${dayLabel(daysToRecord)} kvar till ditt rekord!`
        : `${daysToRecord} ${dayLabel(daysToRecord)} left until your record!`,
    }
  }

  // Close to milestone (within 3 days)
  if (daysToMilestone !== null && daysToMilestone <= 3 && daysToMilestone > 0) {
    return {
      type: 'new_milestone',
      message: locale === 'sv'
        ? `${daysToMilestone} ${dayLabel(daysToMilestone)} till ${nextMilestone!.days}-dagars milstolpe!`
        : `${daysToMilestone} ${dayLabel(daysToMilestone)} until your ${nextMilestone!.days}-day milestone!`,
    }
  }

  // Default encouragement
  return {
    type: 'keep_going',
    message: locale === 'sv'
      ? currentStreak > 0 ? 'Fortsätt så! Varje dag räknas.' : 'Börja din streak idag!'
      : currentStreak > 0 ? 'Keep it up! Every day counts.' : 'Start your streak today!',
  }
}
