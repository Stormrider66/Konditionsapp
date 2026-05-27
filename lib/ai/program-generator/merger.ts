/**
 * Phase Merger Utility
 *
 * Merges individually generated phases into a complete program structure.
 */

import type { GeneratedPhase, ProgramOutline, MergedProgram, WeeklyTemplate, DayWorkout } from './types'
import { parseWeekRange } from './types'

type ProgramLocale = 'en' | 'sv'

function resolveLocale(locale?: ProgramLocale): ProgramLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: ProgramLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// ============================================
// Main Merger Function
// ============================================

/**
 * Merge multiple phases into a complete program
 */
export function mergePhases(phases: GeneratedPhase[], outline: ProgramOutline, locale?: ProgramLocale): MergedProgram {
  const outputLocale = resolveLocale(locale)
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
    description: outline.description || generateDescription(outline, sortedPhases, outputLocale),
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
function generateDescription(outline: ProgramOutline, phases: GeneratedPhase[], locale: ProgramLocale): string {
  const phaseNames = phases.map((p) => p.name).join(', ')
  if (locale === 'sv') {
    return `${outline.totalWeeks}-veckors ${formatMethodology(outline.methodology, locale)} träningsprogram med faserna: ${phaseNames}.`
  }
  return `${outline.totalWeeks}-week ${formatMethodology(outline.methodology, locale)} training program with phases: ${phaseNames}.`
}

/**
 * Format methodology name for generated fallback descriptions
 */
function formatMethodology(methodology?: string, locale: ProgramLocale = 'en'): string {
  const methodNames: Record<string, Record<ProgramLocale, string>> = {
    POLARIZED: { en: 'polarized', sv: 'polariserat' },
    NORWEGIAN: { en: 'Norwegian', sv: 'norskt' },
    CANOVA: { en: 'Canova-inspired', sv: 'Canova-inspirerat' },
    PYRAMIDAL: { en: 'pyramidal', sv: 'pyramidalt' },
  }
  if (!methodology) return text(locale, 'balanced', 'balanserat')
  return methodNames[methodology]?.[locale] || methodology.toLowerCase()
}

// ============================================
// Program Expansion
// ============================================

/**
 * Expand a merged program into week-by-week structure
 * Used when saving to database
 */
export function expandToWeeks(program: MergedProgram, locale?: ProgramLocale): ExpandedWeek[] {
  const outputLocale = resolveLocale(locale)
  const weeks: ExpandedWeek[] = []

  for (const phase of program.phases) {
    const { startWeek, endWeek } = parseWeekRange(phase.weeks)

    for (let weekNum = startWeek; weekNum <= endWeek; weekNum++) {
      weeks.push({
        weekNumber: weekNum,
        phase: phase.name,
        focus: phase.focus,
        days: expandWeeklyTemplate(phase.weeklyTemplate, weekNum, outputLocale),
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
function expandWeeklyTemplate(template: WeeklyTemplate, weekNumber: number, locale: ProgramLocale): ExpandedDay[] {
  const dayMap: Record<string, { num: number; name: Record<ProgramLocale, string> }> = {
    monday: { num: 1, name: { en: 'Monday', sv: 'Måndag' } },
    tuesday: { num: 2, name: { en: 'Tuesday', sv: 'Tisdag' } },
    wednesday: { num: 3, name: { en: 'Wednesday', sv: 'Onsdag' } },
    thursday: { num: 4, name: { en: 'Thursday', sv: 'Torsdag' } },
    friday: { num: 5, name: { en: 'Friday', sv: 'Fredag' } },
    saturday: { num: 6, name: { en: 'Saturday', sv: 'Lördag' } },
    sunday: { num: 7, name: { en: 'Sunday', sv: 'Söndag' } },
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

  return days.map((day) => {
    const workout = template[day]
    const { num, name } = dayMap[day]

    return {
      dayNumber: num,
      dayName: name[locale],
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
export function validateMergedProgram(program: MergedProgram, locale?: ProgramLocale): ValidationResult {
  const outputLocale = resolveLocale(locale)
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!program.name) errors.push(text(outputLocale, 'Program is missing a name', 'Program saknar namn'))
  if (!program.totalWeeks || program.totalWeeks < 1) errors.push(text(outputLocale, 'Invalid number of weeks', 'Ogiltigt antal veckor'))
  if (!program.phases || program.phases.length === 0) errors.push(text(outputLocale, 'Program is missing phases', 'Program saknar faser'))

  // Phase validation
  program.phases.forEach((phase, index) => {
    if (!phase.weeklyTemplate) {
      errors.push(text(outputLocale, `Phase ${index + 1} is missing the weekly template`, `Fas ${index + 1} saknar veckotemplet`))
    } else {
      const sessionCount = calculateSessionsPerWeek(phase.weeklyTemplate)
      if (sessionCount === 0) {
        warnings.push(text(outputLocale, `Phase ${index + 1} has no training sessions`, `Fas ${index + 1} har inga träningspass`))
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
      text(
        outputLocale,
        `The phases cover ${totalCoveredWeeks} weeks, but the program is ${program.totalWeeks} weeks`,
        `Faserna täcker ${totalCoveredWeeks} veckor, programmet är ${program.totalWeeks} veckor`
      )
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
