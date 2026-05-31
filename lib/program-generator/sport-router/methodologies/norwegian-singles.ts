import { logger } from '@/lib/logger'
import type { CreateTrainingProgramDTO } from '@/types'
import type { MethodologyPaces } from '../types'
import { formatPaceMinKm } from '../training-paces'
import { text, type SportRouterLocale } from '../locale'
import { calculateVolumePercent } from './polarized'


/**
 * Create weeks with Norwegian Singles workouts (sub-threshold training)
 * Norwegian Singles: 2-3 quality sessions at LT2 minus 0.7-1.7 mmol/L
 */
export function createNorwegianSinglesWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string,
  locale: SportRouterLocale = 'en'
) {
  const weeks = []

  // Calculate phase distribution (same as Polarized)
  const baseWeeks = Math.max(Math.floor(durationWeeks * 0.4), 2)
  const buildWeeks = Math.max(Math.floor(durationWeeks * 0.35), 2)
  const peakWeeks = Math.max(Math.floor(durationWeeks * 0.15), 1)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
    }

    // Volume progression
    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: getNorwegianWeekFocus(phase, locale),
      days: createNorwegianSinglesDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh, goal, locale),
    })
  }

  return weeks
}

/**
 * Get Norwegian Singles week focus description
 */
export function getNorwegianWeekFocus(phase: string, locale: SportRouterLocale = 'en'): string {
  const focusMap: Record<string, string> = {
    'BASE': text(locale, 'Aerobic base with sub-threshold intervals', 'Aerob bas med sub-tröskelintervaller'),
    'BUILD': text(locale, 'Progressive threshold sessions', 'Progressiva tröskelpass'),
    'PEAK': text(locale, 'Race-specific intensity', 'Tävlingsspecifik intensitet'),
    'TAPER': text(locale, 'Recovery while preserving speed', 'Återhämtning med fartbehållning'),
  }
  return focusMap[phase] || 'Norwegian Singles'
}

/**
 * Create 7 days with Norwegian Singles workout distribution
 * Key principle: Sub-threshold intervals (LT2 - 0.7 to 1.7 mmol/L)
 */
export function createNorwegianSinglesDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  localeOrMethodologyPaces: SportRouterLocale | MethodologyPaces = 'en',
  methodologyPaces?: MethodologyPaces
) {
  const locale = typeof localeOrMethodologyPaces === 'string' ? localeOrMethodologyPaces : 'en'
  const resolvedMethodologyPaces = typeof localeOrMethodologyPaces === 'string' ? methodologyPaces : localeOrMethodologyPaces
  const days = []

  // Norwegian Singles: 2-3 quality sessions per week
  const qualitySessions = sessionsPerWeek >= 6 ? 3 : 2
  const easySessions = Math.max(0, sessionsPerWeek - qualitySessions - 1) // -1 for long run

  // Quality days: Tuesday, Thursday, (Saturday if 3 sessions)
  const qualityDays = [2, 4, 6].slice(0, qualitySessions)
  // Easy days: Monday, Wednesday, Friday
  const easyDays = [1, 3, 5].slice(0, easySessions)
  // Long run: Sunday
  const longRunDay = 7

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === longRunDay && sessionsPerWeek >= 3) {
      // Long easy run - Daniels Easy pace is ~82-88% of marathon speed
      const baseDuration = phase === 'TAPER' ? 60 : (phase === 'BASE' ? 75 : 90)
      const duration = Math.min(baseDuration + weekInPhase * 5, 120)
      const easyPaceKmh = marathonPaceKmh * 0.85 // Long run at comfortable easy pace
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Long run - Green zone', 'Långpass - Green zone'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'Long run', 'Långpass'),
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: text(
            locale,
            `Long run in the Green zone (${formatPaceMinKm(easyPaceKmh)}/km). Strictly aerobic.`,
            `Långpass i Green zone (${formatPaceMinKm(easyPaceKmh)}/km). Strikt aerobt.`
          ),
          segments: [],
        }],
      })
    } else if (qualityDays.includes(dayNum)) {
      // Norwegian Singles quality session (sub-threshold intervals)
      const workout = createNorwegianSinglesWorkout(phase, weekInPhase, marathonPaceKmh, goal, qualityDays.indexOf(dayNum) + 1, locale, resolvedMethodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Sub-threshold intervals', 'Sub-tröskelintervaller'),
        workouts: [workout],
      })
    } else if (easyDays.includes(dayNum)) {
      // Easy recovery run - slower end of Daniels Easy zone
      const duration = phase === 'TAPER' ? 30 : 45
      const easyPaceKmh = marathonPaceKmh * 0.82 // Recovery runs slightly slower
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Easy run - Green zone', 'Lugn löpning - Green zone'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'Easy run', 'Lugn löpning'),
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: text(
            locale,
            `Easy running in the Green zone (${formatPaceMinKm(easyPaceKmh)}/km). Recovery focus.`,
            `Lätt löpning i Green zone (${formatPaceMinKm(easyPaceKmh)}/km). Återhämtning.`
          ),
          segments: [],
        }],
      })
    } else {
      // Rest day
      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Rest day', 'Vilodag'),
        workouts: [],
      })
    }
  }

  return days
}

/**
 * Create Norwegian Singles quality workout
 * Key: Sub-threshold at LT2 minus 0.7-1.7 mmol/L (just below lactate threshold)
 *
 * Norwegian Singles pacing system (from documentation):
 * - Uses ACTUAL LT2 from lactate test when available (gold standard)
 * - Sub-threshold = 97% of LT2 pace (trains at 2.3-3.0 mmol/L, not 4.0)
 * - Allows 3-4 quality sessions per week (vs 1-2 in traditional threshold)
 *
 * Interval paces from 5K (when no lactate data):
 * - 1K intervals: 85-88% of 5K pace
 * - 2K intervals: 83-86% of 5K pace (~ half marathon pace)
 * - 3K intervals: 80-83% of 5K pace (~ 30K pace)
 */
export function createNorwegianSinglesWorkout(
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  sessionNumber: number,
  localeOrMethodologyPaces: SportRouterLocale | MethodologyPaces = 'en',
  methodologyPaces?: MethodologyPaces  // Optional: use actual LT2 from test
) {
  const locale = typeof localeOrMethodologyPaces === 'string' ? localeOrMethodologyPaces : 'en'
  const resolvedMethodologyPaces = typeof localeOrMethodologyPaces === 'string' ? methodologyPaces : localeOrMethodologyPaces
  // Use methodology-specific pacing if available (from lactate test)
  // Otherwise fall back to estimation from marathon pace
  let subThresholdPaceKmh: number
  let thresholdPaceKmh: number
  let easyPaceKmh: number

  if (resolvedMethodologyPaces?.subThresholdPaceKmh) {
    // Using actual LT2 data from lactate test - Norwegian gold standard!
    subThresholdPaceKmh = resolvedMethodologyPaces.subThresholdPaceKmh
    thresholdPaceKmh = resolvedMethodologyPaces.thresholdPaceKmh
    easyPaceKmh = resolvedMethodologyPaces.easyPaceKmh
    logger.debug('[Norwegian Singles] Using LT2 from test', {
      thresholdPace: formatPaceMinKm(thresholdPaceKmh),
      subThresholdPace: formatPaceMinKm(subThresholdPaceKmh)
    })
  } else {
    // Fallback: estimate from marathon pace (less accurate)
    thresholdPaceKmh = marathonPaceKmh * 1.05  // Threshold ~105% marathon
    subThresholdPaceKmh = thresholdPaceKmh * 0.97  // Sub-threshold ~97% of LT2
    easyPaceKmh = marathonPaceKmh * 0.78  // Much slower for Norwegian easy
    logger.debug('[Norwegian Singles] Estimated sub-threshold (no LT2 test data)', {
      subThresholdPace: formatPaceMinKm(subThresholdPaceKmh)
    })
  }

  let reps: number, workMin: number, restMin: number, name: string, description: string

  if (phase === 'BASE') {
    // Build tolerance with shorter intervals
    if (weekInPhase <= 2) {
      reps = 5; workMin = 5; restMin = 1
      name = text(locale, '5x5 min sub-threshold', '5x5 min sub-tröskel')
    } else if (weekInPhase <= 4) {
      reps = 4; workMin = 6; restMin = 1
      name = text(locale, '4x6 min sub-threshold', '4x6 min sub-tröskel')
    } else {
      reps = 5; workMin = 6; restMin = 1
      name = text(locale, '5x6 min sub-threshold', '5x6 min sub-tröskel')
    }
    description = text(
      locale,
      `Sub-threshold intervals (${formatPaceMinKm(subThresholdPaceKmh)}/km). Just below LT2, should feel controlled.`,
      `Sub-tröskelintervaller (${formatPaceMinKm(subThresholdPaceKmh)}/km). Strax under LT2, bör kännas kontrollerat.`
    )
  } else if (phase === 'BUILD') {
    // Classic Norwegian Singles progression
    if (sessionNumber === 1) {
      reps = 5; workMin = 6; restMin = 1
      name = '5x6 min threshold minus'
    } else if (sessionNumber === 2) {
      reps = 4; workMin = 8; restMin = 1
      name = '4x8 min threshold minus'
    } else {
      reps = 3; workMin = 10; restMin = 1.5
      name = '3x10 min threshold minus'
    }
    description = text(
      locale,
      `Norwegian Singles (${formatPaceMinKm(subThresholdPaceKmh)}/km). Keep lactate just below threshold.`,
      `Norwegian Singles (${formatPaceMinKm(subThresholdPaceKmh)}/km). Håll laktat strax under tröskel.`
    )
  } else if (phase === 'PEAK') {
    // Race-specific with longer intervals
    const raceSpecificPace = goal === '5k' || goal === '10k'
      ? marathonPaceKmh * 1.12
      : marathonPaceKmh * 1.06
    reps = 4; workMin = 8; restMin = 1
    name = text(locale, 'Race-specific intervals', 'Tävlingsspecifika intervaller')
    description = text(
      locale,
      `Race-pace intervals (${formatPaceMinKm(raceSpecificPace)}/km). Close to target race pace.`,
      `Tävlingsfart intervaller (${formatPaceMinKm(raceSpecificPace)}/km). Nära målrace-tempo.`
    )
  } else {
    // Taper - maintain with reduced volume
    reps = 3; workMin = 5; restMin = 1
    name = text(locale, 'Sub-threshold maintenance', 'Underhåll sub-tröskel')
    description = text(
      locale,
      'Maintain threshold feel without fatiguing yourself.',
      'Bibehåll känslan för tröskel utan att trötta ut dig.'
    )
  }

  // Calculate total distance for the workout
  // easyPaceKmh is already defined above from methodologyPaces or fallback
  const workDistanceKm = (reps * workMin / 60) * subThresholdPaceKmh
  const restDistanceKm = ((reps - 1) * restMin / 60) * easyPaceKmh // Jogging during rest
  const warmupCooldownKm = (20 / 60) * easyPaceKmh // 20 min warmup+cooldown
  const totalDistanceKm = Math.round((workDistanceKm + restDistanceKm + warmupCooldownKm) * 10) / 10

  // Build segments array with warmup, work/rest intervals, and cooldown
  const segments = []

  // Warmup segment (10 min)
  segments.push({
    order: 1,
    type: 'warmup' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: text(locale, 'Warm-up - easy jog', 'Uppvärmning - lätt jogg'),
  })

  // Work/rest intervals
  for (let i = 0; i < reps * 2 - 1; i++) {
    segments.push({
      order: segments.length + 1,
      type: (i % 2 === 0 ? 'work' : 'rest') as 'work' | 'rest',
      duration: i % 2 === 0 ? workMin : restMin,
      distance: undefined,
      targetPace: i % 2 === 0 ? formatPaceMinKm(subThresholdPaceKmh) : undefined,
      targetHeartRateZone: i % 2 === 0 ? 3 : 1,
      notes: i % 2 === 0 ? text(locale, 'Sub-threshold', 'Sub-tröskel') : text(locale, 'Recovery jog', 'Vila (jogg)'),
    })
  }

  // Cooldown segment (10 min)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: text(locale, 'Cool-down - easy jog', 'Nedvarvning - lätt jogg'),
  })

  return {
    type: 'RUNNING' as const,
    name,
    intensity: 'THRESHOLD' as const,
    duration: (reps * workMin) + ((reps - 1) * restMin) + 20, // Add warmup/cooldown
    distance: totalDistanceKm,
    instructions: text(
      locale,
      `${reps}x${workMin} min with ${restMin} min recovery. ${description}`,
      `${reps}x${workMin} min med ${restMin} min vila. ${description}`
    ),
    segments,
  }
}

// ============================================================================
// NORWEGIAN DOUBLES METHODOLOGY
// ============================================================================
