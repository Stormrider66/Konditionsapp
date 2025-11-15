/**
 * Multi-Race A/B/C Planning System
 *
 * Intelligent season planning with multiple races:
 * - A Races: Primary goal races (1-2 per year) - Full peak and taper
 * - B Races: Important tune-up races - Mini-taper, maintain fitness
 * - C Races: Training races - No taper, integrated as hard workouts
 *
 * Philosophy:
 * - Maximum 2 A races per year (requires 12+ week recovery between)
 * - B races 4-8 weeks before A race (tune-up)
 * - C races used as quality training stimulus
 * - Proper recovery between all race efforts
 */

import { PeriodPhase } from '@/types'

export type RacePriority = 'A' | 'B' | 'C'

export interface Race {
  id: string
  date: Date
  name: string
  distance: string // '5K', '10K', 'Half Marathon', 'Marathon', etc.
  priority: RacePriority
  goalTime?: string // Optional goal time
  notes?: string
}

export interface RacePlan {
  race: Race
  peakWeek: number // Week number to peak (race week)
  taperWeeks: number // Number of weeks to taper
  buildPhaseStart: number // When to start building for this race
  buildPhaseEnd: number // When to end build phase
  deloadBeforeRace: boolean // Extra deload week before taper
  postRaceRecovery: number // Recovery weeks after race
}

export interface MultiRaceSchedule {
  races: RacePlan[]
  conflicts: string[] // Any scheduling conflicts
  warnings: string[]
}

/**
 * Calculate multi-race schedule with intelligent phase planning
 */
export function calculateMultiRaceSchedule(
  races: Race[],
  programStartDate: Date,
  programDurationWeeks: number
): MultiRaceSchedule {
  const conflicts: string[] = []
  const warnings: string[] = []
  const racePlans: RacePlan[] = []

  // Sort races by date
  const sortedRaces = [...races].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Validate race priorities
  const aRaces = sortedRaces.filter(r => r.priority === 'A')
  if (aRaces.length > 2) {
    warnings.push(`${aRaces.length} A races detected. Maximum 2 A races per year recommended.`)
  }

  // Check spacing between A races
  if (aRaces.length === 2) {
    const weeksBetween = getWeeksBetween(aRaces[0].date, aRaces[1].date)
    if (weeksBetween < 12) {
      conflicts.push(
        `Only ${weeksBetween} weeks between A races. Minimum 12 weeks recommended for full recovery and rebuild.`
      )
    }
  }

  // Plan each race
  for (let i = 0; i < sortedRaces.length; i++) {
    const race = sortedRaces[i]
    const weekNumber = getWeekNumber(programStartDate, race.date)

    // Validate race is within program duration
    if (weekNumber < 1 || weekNumber > programDurationWeeks) {
      conflicts.push(`${race.name} (${race.priority}) is outside program duration`)
      continue
    }

    // Calculate taper based on priority and distance
    const taperWeeks = calculateTaperWeeks(race.priority, race.distance)
    const buildWeeks = calculateBuildWeeks(race.priority, race.distance)
    const recoveryWeeks = calculateRecoveryWeeks(race.priority, race.distance)

    // Check for conflicts with previous race
    if (i > 0) {
      const prevRace = racePlans[i - 1]
      const weeksSincePrevRace = weekNumber - prevRace.peakWeek

      // Check if recovery period overlaps with build phase
      if (weeksSincePrevRace < prevRace.postRaceRecovery) {
        warnings.push(
          `${race.name} build phase may overlap with recovery from ${sortedRaces[i - 1].name}`
        )
      }
    }

    // Create race plan
    const plan: RacePlan = {
      race,
      peakWeek: weekNumber,
      taperWeeks,
      buildPhaseStart: Math.max(1, weekNumber - taperWeeks - buildWeeks),
      buildPhaseEnd: weekNumber - taperWeeks,
      deloadBeforeRace: race.priority === 'A', // A races get extra deload week
      postRaceRecovery: recoveryWeeks,
    }

    racePlans.push(plan)
  }

  return {
    races: racePlans,
    conflicts,
    warnings,
  }
}

/**
 * Calculate taper weeks based on race priority and distance
 */
function calculateTaperWeeks(priority: RacePriority, distance: string): number {
  // A races get full taper
  if (priority === 'A') {
    if (distance === 'Marathon') return 3
    if (distance === 'Half Marathon') return 2
    if (distance === '10K' || distance === '5K') return 1
    return 2 // Default
  }

  // B races get mini-taper
  if (priority === 'B') {
    if (distance === 'Marathon' || distance === 'Half Marathon') return 1
    return 0 // No taper for shorter B races
  }

  // C races get no taper (integrated as workout)
  return 0
}

/**
 * Calculate build phase duration
 */
function calculateBuildWeeks(priority: RacePriority, distance: string): number {
  if (priority === 'A') {
    if (distance === 'Marathon') return 12
    if (distance === 'Half Marathon') return 10
    if (distance === '10K') return 8
    if (distance === '5K') return 6
    return 10 // Default
  }

  if (priority === 'B') {
    if (distance === 'Marathon') return 8
    if (distance === 'Half Marathon') return 6
    return 4
  }

  // C races don't need dedicated build phase
  return 0
}

/**
 * Calculate recovery weeks after race
 */
function calculateRecoveryWeeks(priority: RacePriority, distance: string): number {
  if (priority === 'A') {
    if (distance === 'Marathon') return 4 // 1 week per 10K raced
    if (distance === 'Half Marathon') return 2
    if (distance === '10K') return 1
    return 1
  }

  if (priority === 'B') {
    if (distance === 'Marathon' || distance === 'Half Marathon') return 1
    return 0 // Quick recovery from shorter races
  }

  // C races treated as hard workout (1-2 days recovery)
  return 0
}

/**
 * Get week number within program
 */
function getWeekNumber(programStart: Date, raceDate: Date): number {
  const diffMs = raceDate.getTime() - programStart.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks + 1 // Week 1-indexed
}

/**
 * Get weeks between two dates
 */
function getWeeksBetween(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date2.getTime() - date1.getTime())
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

/**
 * Map race plan to training phases
 */
export function getRacePhases(
  racePlan: RacePlan,
  totalWeeks: number
): { week: number; phase: PeriodPhase; reason: string }[] {
  const phases: { week: number; phase: PeriodPhase; reason: string }[] = []

  // Build phase
  for (let week = racePlan.buildPhaseStart; week <= racePlan.buildPhaseEnd; week++) {
    phases.push({
      week,
      phase: 'BUILD',
      reason: `Building for ${racePlan.race.name} (${racePlan.race.priority} race)`,
    })
  }

  // Peak phase (week before taper)
  if (racePlan.taperWeeks > 0) {
    const peakWeek = racePlan.peakWeek - racePlan.taperWeeks
    phases.push({
      week: peakWeek,
      phase: 'PEAK',
      reason: `Peak week before taper for ${racePlan.race.name}`,
    })
  }

  // Taper phase
  for (let week = racePlan.peakWeek - racePlan.taperWeeks + 1; week <= racePlan.peakWeek; week++) {
    phases.push({
      week,
      phase: 'TAPER',
      reason: `Taper for ${racePlan.race.name} (${racePlan.race.priority} race)`,
    })
  }

  // Recovery phase
  for (let week = 1; week <= racePlan.postRaceRecovery; week++) {
    const recoveryWeek = racePlan.peakWeek + week
    if (recoveryWeek <= totalWeeks) {
      phases.push({
        week: recoveryWeek,
        phase: 'RECOVERY',
        reason: `Recovery from ${racePlan.race.name}`,
      })
    }
  }

  return phases
}

/**
 * Get race week workout modifications
 */
export function getRaceWeekWorkouts(
  racePlan: RacePlan,
  weekInRacePhase: number // 1 = race week, -1 = week before, etc.
): {
  includeRace: boolean
  raceDay: number // Day of week (1-7)
  preRaceWorkouts: string[]
  postRaceWorkouts: string[]
} {
  const priority = racePlan.race.priority

  if (weekInRacePhase === 0) {
    // Race week
    if (priority === 'A') {
      return {
        includeRace: true,
        raceDay: 7, // Sunday (typical race day)
        preRaceWorkouts: ['2x easy 30min', '3x recovery 20min', '5x short shakeout 15min'],
        postRaceWorkouts: [], // No workouts after A race
      }
    } else if (priority === 'B') {
      return {
        includeRace: true,
        raceDay: 7,
        preRaceWorkouts: ['2x easy 40min', '4x easy 30min', '6x shakeout 20min'],
        postRaceWorkouts: ['1x easy 30min'], // Light recovery next day
      }
    } else {
      // C race - treat as hard workout
      return {
        includeRace: true,
        raceDay: 7,
        preRaceWorkouts: ['2x easy 45min', '4x easy 40min', '5x easy 30min'],
        postRaceWorkouts: ['1x recovery 30min', '3x easy 40min'], // Resume training
      }
    }
  }

  // Not race week
  return {
    includeRace: false,
    raceDay: 7,
    preRaceWorkouts: [],
    postRaceWorkouts: [],
  }
}

/**
 * Validate multi-race schedule
 */
export function validateMultiRaceSchedule(schedule: MultiRaceSchedule): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings = [...schedule.warnings]

  // Critical conflicts
  if (schedule.conflicts.length > 0) {
    errors.push(...schedule.conflicts)
  }

  // Check for overlapping phases
  const allPhases: { week: number; race: string }[] = []
  for (const plan of schedule.races) {
    for (let week = plan.buildPhaseStart; week <= plan.peakWeek + plan.postRaceRecovery; week++) {
      const existing = allPhases.find(p => p.week === week)
      if (existing) {
        warnings.push(
          `Week ${week}: Overlapping race preparation for ${plan.race.name} and ${existing.race}`
        )
      }
      allPhases.push({ week, race: plan.race.name })
    }
  }

  // Check for insufficient base building
  const firstRace = schedule.races[0]
  if (firstRace && firstRace.buildPhaseStart < 4) {
    warnings.push('First race starts very early - ensure adequate base phase before build.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get race recommendations for UI
 */
export function getRaceRecommendations(
  priority: RacePriority,
  distance: string
): {
  taperSuggestion: string
  buildSuggestion: string
  recoverySuggestion: string
  tips: string[]
} {
  const tips: string[] = []

  let taperSuggestion = ''
  let buildSuggestion = ''
  let recoverySuggestion = ''

  if (priority === 'A') {
    taperSuggestion = `${calculateTaperWeeks('A', distance)} weeks - Full taper with significant volume reduction`
    buildSuggestion = `${calculateBuildWeeks('A', distance)} weeks - Focused build phase with progressive overload`
    recoverySuggestion = `${calculateRecoveryWeeks('A', distance)} weeks - Complete recovery before resuming training`

    tips.push('Prioritize sleep and nutrition during taper')
    tips.push('No new workouts or experiments in final 2 weeks')
    tips.push('Trust your training - avoid last-minute panic workouts')
    tips.push('Full recovery after race - resist urge to train too soon')
  } else if (priority === 'B') {
    taperSuggestion = `${calculateTaperWeeks('B', distance)} weeks - Mini-taper to freshen up`
    buildSuggestion = `${calculateBuildWeeks('B', distance)} weeks - Tune-up preparation`
    recoverySuggestion = `${calculateRecoveryWeeks('B', distance)} weeks - Quick recovery, resume training`

    tips.push('Use as race-pace practice for A race')
    tips.push('Test nutrition and pacing strategy')
    tips.push('Light taper - maintain fitness for upcoming A race')
  } else {
    taperSuggestion = 'No taper - integrate race as quality workout'
    buildSuggestion = 'No dedicated build - part of regular training'
    recoverySuggestion = '1-2 days easy recovery, then resume training'

    tips.push('Treat as hard workout - no pressure for result')
    tips.push('Good practice for race environment and pacing')
    tips.push('Resume normal training 1-2 days after')
  }

  return {
    taperSuggestion,
    buildSuggestion,
    recoverySuggestion,
    tips,
  }
}
