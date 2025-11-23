// lib/training-engine/scheduling/interference-manager.ts
/**
 * Concurrent Training Interference Manager
 *
 * Scientific guidelines for scheduling strength and running:
 *
 * Beginner Rule:
 * - >24 hours separation between any quality sessions
 *
 * Intermediate Rule:
 * - Same-day protocol: 6-9 hours apart (AM strength, PM running OR vice versa)
 * - Separate days acceptable
 *
 * Advanced/Elite Rule:
 * - Same-day mandatory for hard/hard sessions (6-9h apart)
 * - <48 hours before key workout = AVOID heavy strength
 *
 * Critical Rules:
 * - NEVER heavy strength <48h before key running workout
 * - NEVER hard running immediately after heavy strength
 */

import { StrengthPhase, WorkoutIntensity } from '@prisma/client'

export interface StrengthWorkout {
  id?: string
  date: Date
  phase: StrengthPhase
  estimatedDuration: number // minutes
  intensity: 'LIGHT' | 'MODERATE' | 'HEAVY' // Based on phase
}

export interface RunningWorkout {
  id?: string
  date: Date
  type: WorkoutIntensity
  estimatedDuration: number // minutes
  isKeyWorkout: boolean // Threshold, intervals, long run
}

export interface InterferenceAnalysis {
  canSchedule: boolean
  conflictLevel: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE'
  warnings: string[]
  recommendations: string[]
  optimalTiming: string
}

/**
 * Check if strength workout conflicts with running schedule
 *
 * @param strengthWorkout - Proposed strength workout
 * @param runningWorkouts - Existing running workouts (next 7 days)
 * @param athleteLevel - Athlete experience level
 * @returns Interference analysis
 */
export function checkInterference(
  strengthWorkout: StrengthWorkout,
  runningWorkouts: RunningWorkout[],
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
): InterferenceAnalysis {
  const warnings: string[] = []
  const recommendations: string[] = []
  let conflictLevel: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' = 'NONE'

  // Determine strength workout intensity
  const strengthIntensity = getStrengthIntensity(strengthWorkout.phase)

  // Check each running workout
  for (const run of runningWorkouts) {
    const hoursBetween = getHoursBetween(strengthWorkout.date, run.date)
    const isSameDay = isSameDayCheck(strengthWorkout.date, run.date)
    const runIntensity = getRunningIntensity(run.type)

    // Critical Rule 1: <48h before key workout
    if (hoursBetween > 0 && hoursBetween < 48 && run.isKeyWorkout && strengthIntensity === 'HEAVY') {
      warnings.push(
        `CRITICAL: Heavy strength ${hoursBetween}h before key ${run.type} workout. High interference risk.`
      )
      conflictLevel = 'SEVERE'
    }

    // Critical Rule 2: Hard running immediately after heavy strength
    if (hoursBetween < 0 && Math.abs(hoursBetween) < 6 && strengthIntensity === 'HEAVY' && runIntensity === 'HARD') {
      warnings.push(`CRITICAL: Hard running ${Math.abs(hoursBetween)}h after heavy strength. Severe fatigue risk.`)
      conflictLevel = 'SEVERE'
    }

    // Beginner Rule: >24h separation
    if (athleteLevel === 'BEGINNER' && Math.abs(hoursBetween) < 24) {
      warnings.push(`Beginners need 24+ hours between quality sessions. ${Math.abs(hoursBetween)}h gap detected.`)
      if (conflictLevel === 'NONE') conflictLevel = 'MODERATE'
    }

    // Intermediate/Advanced: Same-day protocol (6-9h)
    if (
      (athleteLevel === 'INTERMEDIATE' || athleteLevel === 'ADVANCED' || athleteLevel === 'ELITE') &&
      isSameDay &&
      Math.abs(hoursBetween) < 6
    ) {
      warnings.push(`Same-day sessions require 6+ hours separation. ${Math.abs(hoursBetween)}h gap detected.`)
      if (conflictLevel === 'NONE' || conflictLevel === 'MINOR') conflictLevel = 'MODERATE'
    }

    // Check for optimal same-day timing (6-9h)
    if (isSameDay && Math.abs(hoursBetween) >= 6 && Math.abs(hoursBetween) <= 9) {
      recommendations.push(`Optimal same-day timing: ${Math.abs(hoursBetween)}h between sessions.`)
    }

    // Warn if too many hard sessions in close proximity
    if (Math.abs(hoursBetween) < 48 && strengthIntensity === 'HEAVY' && runIntensity === 'HARD') {
      warnings.push('Two hard sessions within 48h increases injury risk.')
      if (conflictLevel === 'NONE') conflictLevel = 'MINOR'
    }
  }

  // Generate recommendations
  if (warnings.length === 0) {
    recommendations.push('No conflicts detected. Strength workout can be scheduled as planned.')
  }

  // Optimal timing guidance
  let optimalTiming = 'No conflicts'
  if (conflictLevel === 'SEVERE') {
    optimalTiming = 'Reschedule: 48+ hours before key workouts, or >6 hours from quality running'
  } else if (conflictLevel === 'MODERATE') {
    optimalTiming = 'Adjust timing: Ensure 6-9 hour gap for same-day sessions'
  } else if (conflictLevel === 'MINOR') {
    optimalTiming = 'Consider adjusting: More recovery time recommended'
  }

  // Level-specific recommendations
  if (athleteLevel === 'BEGINNER') {
    recommendations.push('Beginner: Schedule strength on easy running days or completely separate days.')
  } else if (athleteLevel === 'INTERMEDIATE') {
    recommendations.push('Intermediate: Same-day protocol acceptable (AM strength, PM running recommended).')
  } else {
    recommendations.push('Advanced/Elite: Same-day mandatory for hard sessions (prevents cumulative fatigue).')
  }

  const canSchedule = conflictLevel !== 'SEVERE'

  return {
    canSchedule,
    conflictLevel,
    warnings,
    recommendations,
    optimalTiming,
  }
}

/**
 * Find optimal day for strength workout in weekly schedule
 *
 * @param runningWeek - 7 days of running workouts
 * @param strengthPhase - Strength phase
 * @param athleteLevel - Athlete level
 * @returns Recommended day(s)
 */
export function findOptimalStrengthDays(
  runningWeek: Array<RunningWorkout | null>, // 7 days, null = rest day
  strengthPhase: StrengthPhase,
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
): Array<{
  dayIndex: number // 0-6 (Monday-Sunday)
  score: number // 0-100 (higher = better)
  reasoning: string
}> {
  const dayScores: Array<{ dayIndex: number; score: number; reasoning: string }> = []

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    let score = 100
    const reasons: string[] = []

    const dayWorkout = runningWeek[dayIndex]
    const nextDay = runningWeek[(dayIndex + 1) % 7]
    const prevDay = runningWeek[(dayIndex - 1 + 7) % 7]

    // Prefer rest days or easy days for beginners
    if (!dayWorkout) {
      score += 20
      reasons.push('Rest day - ideal for strength')
    } else if (dayWorkout.type === 'EASY' || dayWorkout.type === 'RECOVERY') {
      score += 15
      reasons.push('Easy running day - good for strength')
    }

    // Check next day (avoid day before key workout)
    if (nextDay && nextDay.isKeyWorkout) {
      score -= 40
      reasons.push('Day before key workout - NOT RECOMMENDED')
    }

    // Check previous day (day after key workout is OK)
    if (prevDay && prevDay.isKeyWorkout) {
      score += 10
      reasons.push('Day after key workout - recovery + strength acceptable')
    }

    // Avoid hard running on same day for beginners
    if (athleteLevel === 'BEGINNER' && dayWorkout && dayWorkout.type !== 'EASY') {
      score -= 30
      reasons.push('Beginner: avoid strength on hard running days')
    }

    // Same-day protocol for intermediate/advanced
    if (
      (athleteLevel === 'INTERMEDIATE' || athleteLevel === 'ADVANCED' || athleteLevel === 'ELITE') &&
      dayWorkout &&
      (dayWorkout.type === 'THRESHOLD' || dayWorkout.type === 'INTERVAL')
    ) {
      score += 10
      reasons.push('Same-day with quality running (6+ hours apart)')
    }

    dayScores.push({
      dayIndex,
      score,
      reasoning: reasons.join('; '),
    })
  }

  // Sort by score (descending)
  return dayScores.sort((a, b) => b.score - a.score)
}

/**
 * Get strength workout intensity category
 */
function getStrengthIntensity(phase: StrengthPhase): 'LIGHT' | 'MODERATE' | 'HEAVY' {
  switch (phase) {
    case 'ANATOMICAL_ADAPTATION':
      return 'LIGHT'
    case 'MAXIMUM_STRENGTH':
      return 'HEAVY'
    case 'POWER':
      return 'HEAVY'
    case 'MAINTENANCE':
      return 'MODERATE'
    case 'TAPER':
      return 'LIGHT'
    default:
      return 'MODERATE'
  }
}

/**
 * Get running workout intensity category
 */
function getRunningIntensity(type: WorkoutIntensity): 'EASY' | 'MODERATE' | 'HARD' {
  switch (type) {
    case 'RECOVERY':
    case 'EASY':
      return 'EASY'
    case 'MODERATE':
      return 'MODERATE'
    case 'THRESHOLD':
    case 'INTERVAL':
    case 'MAX':
      return 'HARD'
    default:
      return 'MODERATE'
  }
}

/**
 * Calculate hours between two dates
 *
 * @returns Positive if strength is before running, negative if after
 */
function getHoursBetween(strengthDate: Date, runningDate: Date): number {
  const diffMs = runningDate.getTime() - strengthDate.getTime()
  return diffMs / (1000 * 60 * 60)
}

/**
 * Check if two dates are on the same day
 */
function isSameDayCheck(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Generate weekly strength/running integration schedule
 *
 * @param runningWeek - Running schedule
 * @param strengthPhase - Strength phase
 * @param frequencyPerWeek - Strength sessions per week (1-3)
 * @param athleteLevel - Athlete level
 * @returns Recommended strength days with timing
 */
export function generateIntegratedSchedule(
  runningWeek: Array<RunningWorkout | null>,
  strengthPhase: StrengthPhase,
  frequencyPerWeek: number,
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
): Array<{
  dayIndex: number
  strengthTiming: 'MORNING' | 'AFTERNOON' | 'EVENING'
  runningTiming: 'MORNING' | 'AFTERNOON' | 'EVENING' | null
  reasoning: string
}> {
  const optimalDays = findOptimalStrengthDays(runningWeek, strengthPhase, athleteLevel)

  // Take top N days based on frequency
  const selectedDays = optimalDays.slice(0, frequencyPerWeek)

  return selectedDays.map((day) => {
    const runWorkout = runningWeek[day.dayIndex]

    // Determine timing
    let strengthTiming: 'MORNING' | 'AFTERNOON' | 'EVENING'
    let runningTiming: 'MORNING' | 'AFTERNOON' | 'EVENING' | null = null

    if (!runWorkout) {
      // Rest day: Anytime OK
      strengthTiming = 'AFTERNOON'
    } else if (runWorkout.type === 'EASY' || runWorkout.type === 'RECOVERY') {
      // Easy running: Strength first, then easy run
      strengthTiming = 'MORNING'
      runningTiming = 'EVENING'
    } else {
      // Quality running: Run first (fresher), strength 6+ hours later
      strengthTiming = 'EVENING'
      runningTiming = 'MORNING'
    }

    return {
      dayIndex: day.dayIndex,
      strengthTiming,
      runningTiming,
      reasoning: day.reasoning,
    }
  })
}

/**
 * Validate entire weekly schedule for interference
 *
 * @param weekSchedule - Complete week with both strength and running
 * @param athleteLevel - Athlete level
 * @returns Overall schedule quality assessment
 */
export function validateWeeklySchedule(
  weekSchedule: Array<{
    day: number
    strength: StrengthWorkout | null
    running: RunningWorkout | null
  }>,
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
): {
  isValid: boolean
  qualityScore: number // 0-100
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let qualityScore = 100

  // Check each day
  for (let i = 0; i < weekSchedule.length; i++) {
    const { strength, running } = weekSchedule[i]

    if (strength && running) {
      // Same-day session
      const analysis = checkInterference(strength, [running], athleteLevel)

      if (analysis.conflictLevel === 'SEVERE') {
        issues.push(`Day ${i + 1}: ${analysis.warnings.join(', ')}`)
        qualityScore -= 30
      } else if (analysis.conflictLevel === 'MODERATE') {
        issues.push(`Day ${i + 1}: ${analysis.warnings.join(', ')}`)
        qualityScore -= 15
      }
    }

    // Check next day for key workout conflicts
    if (strength && i < weekSchedule.length - 1) {
      const nextDay = weekSchedule[i + 1]
      if (nextDay.running && nextDay.running.isKeyWorkout) {
        const hoursBefore = 24 // Assume next day
        if (getStrengthIntensity(strength.phase) === 'HEAVY') {
          issues.push(`Day ${i + 1}: Heavy strength <48h before key workout on day ${i + 2}`)
          qualityScore -= 25
        }
      }
    }
  }

  // Count total sessions
  const strengthSessions = weekSchedule.filter((d) => d.strength).length
  const runningSessions = weekSchedule.filter((d) => d.running).length

  // Recommendations
  if (strengthSessions < 2) {
    recommendations.push('Consider 2x weekly strength for optimal gains.')
  }

  if (strengthSessions > 3) {
    recommendations.push('More than 3x weekly strength may interfere with running recovery.')
  }

  const isValid = qualityScore >= 60 && issues.length === 0

  return {
    isValid,
    qualityScore,
    issues,
    recommendations,
  }
}

/**
 * TypeScript types
 */
export interface SchedulingConstraints {
  minimumRestDays: number // Per week
  maxConsecutiveHardDays: number
  preferredStrengthDays: number[] // 0-6 (Mon-Sun)
  avoidStrengthDays: number[]
}
