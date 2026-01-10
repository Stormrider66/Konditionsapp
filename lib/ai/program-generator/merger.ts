/**
 * Phase Merger Utility
 *
 * Merges individually generated phases into a complete program structure.
 */

import type { GeneratedPhase, ProgramOutline, MergedProgram, WeeklyTemplate, DayWorkout } from './types'
import { parseWeekRange } from './types'

// ============================================
// Main Merger Function
// ============================================

/**
 * Merge multiple phases into a complete program
 */
export function mergePhases(phases: GeneratedPhase[], outline: ProgramOutline): MergedProgram {
  // Sort phases by phase number
  const sortedPhases = [...phases].sort((a, b) => a.phaseNumber - b.phaseNumber)

  // Validate phase continuity
  validatePhaseContinuity(sortedPhases, outline)

  // Calculate sessions per week from first phase
  const sessionsPerWeek = calculateSessionsPerWeek(sortedPhases[0]?.weeklyTemplate)

  // Identify rest days
  const restDays = identifyRestDays(sortedPhases[0]?.weeklyTemplate)

  return {
    name: outline.programName,
    description: outline.description || generateDescription(outline, sortedPhases),
    totalWeeks: outline.totalWeeks,
    methodology: outline.methodology,
    weeklySchedule: {
      sessionsPerWeek,
      restDays,
    },
    phases: sortedPhases,
  }
}

// ============================================
// Validation
// ============================================

/**
 * Validate that phases cover all weeks without gaps or overlaps
 */
function validatePhaseContinuity(phases: GeneratedPhase[], outline: ProgramOutline): void {
  if (phases.length !== outline.phases.length) {
    console.warn(
      `Phase count mismatch: expected ${outline.phases.length}, got ${phases.length}`
    )
  }

  let expectedStartWeek = 1

  for (const phase of phases) {
    const { startWeek, endWeek } = parseWeekRange(phase.weeks)

    if (startWeek !== expectedStartWeek) {
      console.warn(
        `Phase continuity warning: Phase ${phase.phaseNumber} starts at week ${startWeek}, expected ${expectedStartWeek}`
      )
    }

    expectedStartWeek = endWeek + 1
  }

  const lastPhase = phases[phases.length - 1]
  if (lastPhase) {
    const { endWeek } = parseWeekRange(lastPhase.weeks)
    if (endWeek !== outline.totalWeeks) {
      console.warn(
        `Phase coverage warning: Last phase ends at week ${endWeek}, program is ${outline.totalWeeks} weeks`
      )
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Count training sessions in a weekly template
 */
function calculateSessionsPerWeek(template?: WeeklyTemplate): number {
  if (!template) return 5 // Default

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  let sessions = 0

  for (const day of days) {
    const workout = template[day]
    if (workout && workout.type !== 'REST') {
      sessions++
    }
  }

  return sessions
}

/**
 * Identify rest days in a weekly template
 */
function identifyRestDays(template?: WeeklyTemplate): string[] {
  if (!template) return ['sunday'] // Default

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
  const restDays: string[] = []

  for (const day of days) {
    const workout = template[day]
    if (!workout || workout.type === 'REST') {
      restDays.push(day)
    }
  }

  return restDays
}

/**
 * Generate a description from outline and phases
 */
function generateDescription(outline: ProgramOutline, phases: GeneratedPhase[]): string {
  const phaseNames = phases.map((p) => p.name).join(', ')
  return `${outline.totalWeeks}-veckors ${formatMethodology(outline.methodology)} träningsprogram med faserna: ${phaseNames}.`
}

/**
 * Format methodology name in Swedish
 */
function formatMethodology(methodology?: string): string {
  const methodNames: Record<string, string> = {
    POLARIZED: 'polariserat',
    NORWEGIAN: 'norskt',
    CANOVA: 'Canova-inspirerat',
    PYRAMIDAL: 'pyramidalt',
  }
  return methodology ? methodNames[methodology] || methodology.toLowerCase() : 'balanserat'
}

// ============================================
// Program Expansion
// ============================================

/**
 * Expand a merged program into week-by-week structure
 * Used when saving to database
 */
export function expandToWeeks(program: MergedProgram): ExpandedWeek[] {
  const weeks: ExpandedWeek[] = []

  for (const phase of program.phases) {
    const { startWeek, endWeek } = parseWeekRange(phase.weeks)

    for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
      weeks.push({
        weekNumber: weekNum,
        phase: phase.name,
        focus: phase.focus,
        days: expandWeeklyTemplate(phase.weeklyTemplate, weekNum),
      })
    }
  }

  return weeks
}

export interface ExpandedWeek {
  weekNumber: number
  phase: string
  focus: string
  days: ExpandedDay[]
}

export interface ExpandedDay {
  dayNumber: number // 1-7 (Monday-Sunday)
  dayName: string
  workout: DayWorkout | null
}

/**
 * Expand weekly template to day-by-day structure
 */
function expandWeeklyTemplate(template: WeeklyTemplate, weekNumber: number): ExpandedDay[] {
  const dayMap: Record<string, { num: number; name: string }> = {
    monday: { num: 1, name: 'Måndag' },
    tuesday: { num: 2, name: 'Tisdag' },
    wednesday: { num: 3, name: 'Onsdag' },
    thursday: { num: 4, name: 'Torsdag' },
    friday: { num: 5, name: 'Fredag' },
    saturday: { num: 6, name: 'Lördag' },
    sunday: { num: 7, name: 'Söndag' },
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

  return days.map((day) => {
    const workout = template[day]
    const { num, name } = dayMap[day]

    return {
      dayNumber: num,
      dayName: name,
      workout: workout || null,
    }
  })
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate a merged program has required fields
 */
export function validateMergedProgram(program: MergedProgram): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!program.name) errors.push('Program saknar namn')
  if (!program.totalWeeks || program.totalWeeks < 1) errors.push('Ogiltigt antal veckor')
  if (!program.phases || program.phases.length === 0) errors.push('Program saknar faser')

  // Phase validation
  program.phases.forEach((phase, index) => {
    if (!phase.weeklyTemplate) {
      errors.push(`Fas ${index + 1} saknar veckotemplet`)
    } else {
      const sessionCount = calculateSessionsPerWeek(phase.weeklyTemplate)
      if (sessionCount === 0) {
        warnings.push(`Fas ${index + 1} har inga träningspass`)
      }
    }
  })

  // Week coverage
  let totalCoveredWeeks = 0
  program.phases.forEach((phase) => {
    const { startWeek, endWeek } = parseWeekRange(phase.weeks)
    totalCoveredWeeks += endWeek - startWeek + 1
  })

  if (totalCoveredWeeks !== program.totalWeeks) {
    warnings.push(
      `Faserna täcker ${totalCoveredWeeks} veckor, programmet är ${program.totalWeeks} veckor`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
