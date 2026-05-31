import { logger } from '@/lib/logger'
import type { Test, CreateTrainingProgramDTO } from '@/types'
import type { PaceProgression, SupplementaryTraining, MethodologyContext } from './types'
import { calculatePhases } from '../periodization'
import { calculateMethodologyPaces } from './methodology-paces'
import { formatPaceMinKm, estimateTrainingPaces } from './training-paces'
import { createPolarizedDays, createQualityWorkout, calculateVolumePercent, getWeekFocus, getIntervalPaceForDuration } from './methodologies/polarized'
import { createNorwegianSinglesDays, createNorwegianSinglesWorkout, getNorwegianWeekFocus } from './methodologies/norwegian-singles'
import { createNorwegianDoublesDays } from './methodologies/norwegian-doubles'
import { createCanovaDays, createCanovaQualityWorkout } from './methodologies/canova'
import { createPyramidalDays } from './methodologies/pyramidal'
import { text, type SportRouterLocale } from './locale'

/**
 * Calculate progressive pace for a given week within a phase
 *
 * Progression strategy (phase-aware):
 * - BASE phase: Stay at current fitness + small progression (0-20% of gap)
 * - BUILD phase: Progressive pace improvement (20-90% of gap)
 * - PEAK phase: Train at goal pace (100% of target)
 * - TAPER phase: Maintain goal pace, reduce volume
 *
 * @param progression - Pace progression configuration
 * @param weekInPhase - Which week within the current phase (1-indexed)
 * @param phaseLength - Total weeks in this phase
 * @param phase - Current training phase
 */
export function calculateProgressivePace(
  progression: PaceProgression,
  weekInPhase: number,
  phaseLength: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
): number {
  const { currentPaceKmh, targetPaceKmh } = progression

  // If no improvement needed, return current
  if (currentPaceKmh >= targetPaceKmh) {
    return currentPaceKmh
  }

  const paceGap = targetPaceKmh - currentPaceKmh // Positive = need to get faster

  // Calculate progress within the phase (0.0 to 1.0)
  const progressInPhase = Math.min((weekInPhase - 1) / Math.max(phaseLength - 1, 1), 1)

  switch (phase) {
    case 'BASE':
      // BASE: Train at current fitness + small progression (0-20% of gap)
      // Linear progression through 0-20% of pace gap
      const baseProgress = progressInPhase * 0.2
      return currentPaceKmh + (paceGap * baseProgress)

    case 'BUILD':
      // BUILD: Progressive improvement (20-90% of gap)
      // Linear progression from 20% to 90% of pace gap
      const buildProgress = 0.2 + (progressInPhase * 0.7)
      return currentPaceKmh + (paceGap * buildProgress)

    case 'PEAK':
      // PEAK: Train at goal pace (100% of target)
      return targetPaceKmh

    case 'TAPER':
      // TAPER: Maintain goal pace
      return targetPaceKmh

    default:
      return currentPaceKmh
  }
}

/**
 * Create weeks with progressive pacing - routes to methodology-specific generators
 *
 * Uses methodology-specific phase distributions:
 * - POLARIZED: 40% BASE, 35% BUILD, 15% PEAK, 10% TAPER (traditional)
 * - NORWEGIAN_SINGLE: 30% BASE, 45% BUILD, 15% PEAK, 10% TAPER (more threshold)
 * - NORWEGIAN_DOUBLES: 35% BASE, 40% BUILD, 15% PEAK, 10% TAPER (elite)
 * - CANOVA: 25% BASE, 27% BUILD, 40% PEAK, 8% TAPER (inverted - long peak!)
 * - PYRAMIDAL: 45% BASE, 30% BUILD, 15% PEAK, 10% TAPER (longer aerobic base)
 */
export function createProgressiveWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  paceProgression: PaceProgression,
  goal: string,
  methodology: string,
  targetRaceDate?: Date,
  supplementaryTraining?: SupplementaryTraining,
  methodologyContext?: MethodologyContext,
  locale: SportRouterLocale = 'en'
) {
  const weeks = []

  // Calculate methodology-specific paces (Norwegian uses LT2 from test, Canova uses MP-based)
  const methodologyPaces = calculateMethodologyPaces(
    methodology,
    methodologyContext?.test,
    methodologyContext?.experienceLevel,
    methodologyContext?.currentWeeklyVolume,
    methodologyContext?.recentRaceDistance,
    methodologyContext?.recentRaceTime,
    paceProgression.targetPaceKmh  // Goal marathon pace for Canova
  )

  logger.debug('[Progressive Weeks] Starting generation', {
    methodology: methodologyPaces.methodology,
    hasLT2TestData: methodologyPaces.hasLactateTestData
  })

  // Use methodology-specific phase distribution from periodization.ts
  const phaseDistribution = calculatePhases(durationWeeks, methodology)
  const baseWeeks = phaseDistribution.base
  const buildWeeks = phaseDistribution.build
  const peakWeeks = phaseDistribution.peak
  // taperWeeks is calculated as remainder

  logger.debug('[Progressive Weeks] Phase distribution', {
    methodology,
    baseWeeks,
    buildWeeks,
    peakWeeks,
    taperWeeks: phaseDistribution.taper,
    ...(targetRaceDate && { targetRaceDate: targetRaceDate.toISOString().split('T')[0] })
  })

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    let phaseLength: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
      phaseLength = baseWeeks
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
      phaseLength = buildWeeks
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
      phaseLength = peakWeeks
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
      phaseLength = phaseDistribution.taper
    }

    // Calculate progressive pace for this week (using phase-aware progression)
    const weekPaceKmh = calculateProgressivePace(paceProgression, weekInPhase, phaseLength, phase)

    // Volume progression
    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    // Get focus description based on methodology
    const focus = getProgressiveFocus(phase, methodology, weekPaceKmh, locale)

    // Generate days based on methodology (passing methodology-specific paces)
    let days
    switch (methodology) {
      case 'NORWEGIAN_SINGLE':
      case 'NORWEGIAN_SINGLES':
        days = createNorwegianSinglesDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, goal, locale, methodologyPaces)
        break
      case 'NORWEGIAN':
      case 'NORWEGIAN_DOUBLES':
        days = createNorwegianDoublesDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, locale, methodologyPaces)
        break
      case 'CANOVA':
        days = createCanovaDays(sessionsPerWeek, phase, phase === 'BASE' ? 'FUNDAMENTAL' : phase === 'BUILD' ? 'SPECIAL' : 'COMPETITION', weekInPhase, weekPaceKmh, goal, locale, methodologyPaces)
        break
      case 'PYRAMIDAL':
        days = createPyramidalDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, goal, locale)
        break
      default:
        days = createPolarizedDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, goal, locale)
    }

    // Check if race day falls in this week and mark it appropriately
    const weekStartDate = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000)
    if (targetRaceDate) {
      for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
        const dayDate = new Date(weekStartDate.getTime() + (days[dayIdx].dayNumber - 1) * 24 * 60 * 60 * 1000)
        // Compare dates (ignoring time)
        if (dayDate.toDateString() === targetRaceDate.toDateString()) {
          logger.debug('[Progressive Weeks] Found race day', { week: i + 1, day: days[dayIdx].dayNumber })
          // Replace this day with race day marker
          days[dayIdx] = {
            dayNumber: days[dayIdx].dayNumber,
            notes: text(locale, `Race day - ${goal.toUpperCase()}`, `TÄVLINGSDAG - ${goal.toUpperCase()}`),
            workouts: [], // No workouts on race day - it's race day!
          }
        }
      }
    }

    weeks.push({
      weekNumber: i + 1,
      startDate: weekStartDate,
      phase,
      volume: volumePercent,
      focus,
      days,
    })
  }

  // Add strength and core sessions if requested
  if (supplementaryTraining) {
    addSupplementaryTraining(weeks, supplementaryTraining, locale)
  }

  return weeks
}

/**
 * Add strength and core sessions to existing weeks
 */
export function addSupplementaryTraining(
  weeks: any[],
  training: SupplementaryTraining,
  locale: SportRouterLocale = 'en'
) {
  const { strengthSessionsPerWeek = 0, coreSessionsPerWeek = 0, scheduleStrengthAfterRunning = false, scheduleCoreAfterRunning = false } = training

  if (strengthSessionsPerWeek <= 0 && coreSessionsPerWeek <= 0) return

  for (const week of weeks) {
    // Find days with running workouts (for after-running scheduling)
    const runningDays = week.days.filter((d: any) =>
      d.workouts?.some((w: any) => w.type === 'RUNNING')
    )

    // Find rest days or light days for standalone sessions
    const restDays = week.days.filter((d: any) =>
      !d.workouts || d.workouts.length === 0 || d.notes?.toLowerCase().includes('vila') || d.notes?.toLowerCase().includes('rest')
    )

    // Add strength sessions
    let strengthAdded = 0
    if (strengthSessionsPerWeek > 0) {
      if (scheduleStrengthAfterRunning && runningDays.length > 0) {
        // Add to running days (PM session)
        for (let i = 0; i < Math.min(strengthSessionsPerWeek, runningDays.length); i++) {
          const day = runningDays[i]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createStrengthWorkout(week.phase, i === 0 ? 'full' : 'maintenance', locale))
          strengthAdded++
        }
      } else {
        // Add to rest days or any available day
        const availableDays = restDays.length > 0 ? restDays : week.days
        for (let i = 0; i < Math.min(strengthSessionsPerWeek, availableDays.length); i++) {
          const day = availableDays[i % availableDays.length]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createStrengthWorkout(week.phase, i === 0 ? 'full' : 'maintenance', locale))
          strengthAdded++
        }
      }
    }

    // Add core sessions
    if (coreSessionsPerWeek > 0) {
      if (scheduleCoreAfterRunning && runningDays.length > 0) {
        // Add to running days (after running)
        for (let i = 0; i < Math.min(coreSessionsPerWeek, runningDays.length); i++) {
          const day = runningDays[i]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createCoreWorkout(week.phase, locale))
        }
      } else {
        // Add to rest days or any available day
        const availableDays = restDays.length > 0 ? restDays : week.days
        for (let i = 0; i < Math.min(coreSessionsPerWeek, availableDays.length); i++) {
          const dayIndex = (i + strengthAdded) % availableDays.length
          const day = availableDays[dayIndex]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createCoreWorkout(week.phase, locale))
        }
      }
    }
  }
}

/**
 * Create a strength workout based on phase
 */
export function createStrengthWorkout(phase: string, type: 'full' | 'maintenance', locale: SportRouterLocale = 'en'): any {
  const isFullSession = type === 'full'
  const duration = isFullSession ? 45 : 30

  // Periodize based on training phase
  let focus: string
  let exercises: string
  if (phase === 'BASE') {
    focus = text(locale, 'Anatomical adaptation', 'Anatomisk anpassning')
    exercises = text(locale, 'Focus: stability, technique, lower load', 'Fokus: stabilitet, teknik, lägre belastning')
  } else if (phase === 'BUILD') {
    focus = text(locale, 'Maximum strength', 'Maximal styrka')
    exercises = text(locale, 'Focus: heavier load, fewer repetitions', 'Fokus: tyngre belastning, färre repetitioner')
  } else if (phase === 'PEAK') {
    focus = text(locale, 'Explosive power', 'Explosiv kraft')
    exercises = text(locale, 'Focus: speed, plyometrics', 'Fokus: snabbhet, plyometrics')
  } else {
    focus = text(locale, 'Maintenance', 'Underhåll')
    exercises = text(locale, 'Focus: preserve strength without fatigue', 'Fokus: bibehåll styrka utan utmattning')
  }

  return {
    type: 'STRENGTH' as const,
    name: isFullSession ? text(locale, 'Strength session', 'Styrkepass') : text(locale, 'Maintenance strength', 'Underhållsstyrka'),
    intensity: phase === 'BUILD' ? 'THRESHOLD' as const : 'MODERATE' as const,
    duration,
    instructions: `${focus}. ${exercises}. ${isFullSession ? text(locale, 'Full session with warm-up.', 'Fullständigt pass med uppvärmning.') : text(locale, 'Shorter maintenance session.', 'Kortare underhållspass.')}`,
    segments: [],
  }
}

/**
 * Create a core workout
 */
export function createCoreWorkout(phase: string, locale: SportRouterLocale = 'en'): any {
  return {
    type: 'CORE' as const,
    name: text(locale, 'Core & stability', 'Core & stabilitet'),
    intensity: 'MODERATE' as const,
    duration: 20,
    instructions: text(
      locale,
      'Runner-focused trunk stability. Focus: planks, side planks, dead bugs, bird dogs.',
      'Bålstabilitet för löpare. Fokus: plankor, sidoplankor, dead bugs, fågelräkning.'
    ),
    segments: [],
  }
}

/**
 * Get focus description with pace info
 */
export function getProgressiveFocus(phase: string, methodology: string, paceKmh: number, locale: SportRouterLocale = 'en'): string {
  const paceStr = formatPaceMinKm(paceKmh)

  const baseFocus: Record<string, Record<string, string>> = {
    'NORWEGIAN_SINGLE': {
      'BASE': text(locale, `Aerobic base - sub-threshold @ ~${paceStr}/km`, `Aerob bas - Sub-tröskel @ ~${paceStr}/km`),
      'BUILD': text(locale, `Progressive threshold sessions @ ~${paceStr}/km`, `Progressiva tröskelpass @ ~${paceStr}/km`),
      'PEAK': text(locale, `Race-specific @ ${paceStr}/km`, `Tävlingsspecifik @ ${paceStr}/km`),
      'TAPER': text(locale, `Taper - maintain ${paceStr}/km`, `Nedtrappning - bibehåll ${paceStr}/km`),
    },
    'NORWEGIAN': {
      'BASE': text(locale, `Double-threshold sessions @ ~${paceStr}/km`, `Dubbla tröskelpass @ ~${paceStr}/km`),
      'BUILD': text(locale, `Intensified double days @ ~${paceStr}/km`, `Intensifierade dubbeldagar @ ~${paceStr}/km`),
      'PEAK': text(locale, `Race preparation @ ${paceStr}/km`, `Tävlingsförberedelse @ ${paceStr}/km`),
      'TAPER': text(locale, 'Taper', 'Nedtrappning'),
    },
    'CANOVA': {
      'BASE': text(locale, `Foundational aerobic @ ~${paceStr}/km`, `Grundläggande aerob @ ~${paceStr}/km`),
      'BUILD': text(locale, `Marathon-specific @ ~${paceStr}/km`, `Maratonspecifik @ ~${paceStr}/km`),
      'PEAK': text(locale, `Race preparation @ ${paceStr}/km`, `Tävlingsförberedelse @ ${paceStr}/km`),
      'TAPER': text(locale, 'Taper', 'Nedtrappning'),
    },
    'PYRAMIDAL': {
      'BASE': text(locale, `Aerobic base 70/20/10 @ ~${paceStr}/km`, `Aerob bas 70/20/10 @ ~${paceStr}/km`),
      'BUILD': text(locale, `Progressive intensity @ ~${paceStr}/km`, `Progressiv intensitet @ ~${paceStr}/km`),
      'PEAK': text(locale, `Race-specific @ ${paceStr}/km`, `Tävlingsspecifik @ ${paceStr}/km`),
      'TAPER': text(locale, 'Taper', 'Nedtrappning'),
    },
    'POLARIZED': {
      'BASE': text(locale, `Aerobic base 80/20 @ ~${paceStr}/km`, `Aerob bas 80/20 @ ~${paceStr}/km`),
      'BUILD': text(locale, `Tempo work @ ~${paceStr}/km`, `Tempokörningar @ ~${paceStr}/km`),
      'PEAK': text(locale, `Race-specific @ ${paceStr}/km`, `Tävlingsspecifik @ ${paceStr}/km`),
      'TAPER': text(locale, 'Recovery', 'Återhämtning'),
    },
  }

  const normalizedMethodology =
    methodology === 'NORWEGIAN_SINGLES' ? 'NORWEGIAN_SINGLE' :
    methodology === 'NORWEGIAN_DOUBLES' ? 'NORWEGIAN' :
    methodology
  const methodologyFocus = baseFocus[normalizedMethodology] || baseFocus['POLARIZED']
  return methodologyFocus[phase] || `${phase} @ ${paceStr}/km`
}
