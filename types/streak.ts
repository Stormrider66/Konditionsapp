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

// Streak milestone thresholds with Swedish labels
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

/**
 * Get the next milestone for a given streak count
 */
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentStreak) || null
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
  personalBest: number
): StreakMotivation {
  const nextMilestone = getNextMilestone(currentStreak)
  const daysToRecord = personalBest - currentStreak
  const daysToMilestone = nextMilestone ? nextMilestone.days - currentStreak : null

  // At personal best
  if (currentStreak > 0 && currentStreak >= personalBest) {
    return {
      type: 'at_record',
      message: 'Du är på ditt rekord! Fortsätt!',
    }
  }

  // Close to personal best (within 3 days)
  if (daysToRecord > 0 && daysToRecord <= 3) {
    return {
      type: 'approaching_record',
      message: `${daysToRecord} ${daysToRecord === 1 ? 'dag' : 'dagar'} kvar till ditt rekord!`,
    }
  }

  // Close to milestone (within 3 days)
  if (daysToMilestone !== null && daysToMilestone <= 3 && daysToMilestone > 0) {
    return {
      type: 'new_milestone',
      message: `${daysToMilestone} ${daysToMilestone === 1 ? 'dag' : 'dagar'} till ${nextMilestone!.days}-dagars milestone!`,
    }
  }

  // Default encouragement
  return {
    type: 'keep_going',
    message: currentStreak > 0 ? 'Fortsätt så! Varje dag räknas.' : 'Börja din streak idag!',
  }
}
