import { logger } from '@/lib/logger'
import type { CreateTrainingProgramDTO } from '@/types'
import type { MethodologyPaces } from '../types'
import { formatPaceMinKm } from '../training-paces'
import { text, type SportRouterLocale } from '../locale'
import { calculateVolumePercent } from './polarized'

// ============================================================================

/**
 * Create weeks with Norwegian Doubles workouts (AM/PM threshold sessions)
 * Norwegian Doubles: 2x weekly double-threshold days (AM: 2-3 mmol/L, PM: 3-4 mmol/L)
 */
export function createNorwegianDoublesWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string,
  locale: SportRouterLocale = 'en'
) {
  const weeks = []
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

    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: phase === 'BASE' ? text(locale, 'Double-threshold sessions - aerobic base', 'Dubbla tröskelpass - aerob bas') :
             phase === 'BUILD' ? text(locale, 'Intensified double days', 'Intensifierade dubbeldagar') :
             phase === 'PEAK' ? text(locale, 'Race preparation', 'Tävlingsförberedelse') : text(locale, 'Taper', 'Nedtrappning'),
      days: createNorwegianDoublesDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh, locale),
    })
  }

  return weeks
}

/**
 * Create 7 days with Norwegian Doubles distribution
 * Key: Tuesday & Thursday are double-threshold days (AM + PM sessions)
 *
 * Norwegian Doubles AM/PM differentiation (from documentation):
 * - AM session (Low Zone 2): 2.0-3.0 mmol/L → ~94% of LT2 pace
 * - PM session (High Zone 2): 3.0-4.0 mmol/L → ~97% of LT2 pace
 * - Uses ACTUAL LT2 from lactate test when available
 * - Priming effect: AM primes metabolism for faster PM session
 */
export function createNorwegianDoublesDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  localeOrMethodologyPaces: SportRouterLocale | MethodologyPaces = 'en',
  methodologyPaces?: MethodologyPaces  // Optional: use actual LT2 from test
) {
  const locale = typeof localeOrMethodologyPaces === 'string' ? localeOrMethodologyPaces : 'en'
  const resolvedMethodologyPaces = typeof localeOrMethodologyPaces === 'string' ? methodologyPaces : localeOrMethodologyPaces
  const days = []

  // Use methodology-specific pacing if available (from lactate test)
  let thresholdPaceKmh: number
  let lowThresholdPace: number  // AM session: 2-3 mmol/L
  let highThresholdPace: number // PM session: 3-4 mmol/L
  let easyPaceKmh: number

  if (resolvedMethodologyPaces?.norwegianAmPaceKmh && resolvedMethodologyPaces?.norwegianPmPaceKmh) {
    // Using actual LT2 data - Norwegian gold standard!
    thresholdPaceKmh = resolvedMethodologyPaces.thresholdPaceKmh
    lowThresholdPace = resolvedMethodologyPaces.norwegianAmPaceKmh   // 94% of LT2
    highThresholdPace = resolvedMethodologyPaces.norwegianPmPaceKmh  // 97% of LT2
    easyPaceKmh = resolvedMethodologyPaces.easyPaceKmh
    logger.debug('[Norwegian Doubles] Using LT2 from test', {
      thresholdPace: formatPaceMinKm(thresholdPaceKmh),
      amPace: formatPaceMinKm(lowThresholdPace),
      amLactate: '2-3 mmol/L',
      pmPace: formatPaceMinKm(highThresholdPace),
      pmLactate: '3-4 mmol/L'
    })
  } else {
    // Fallback: estimate from marathon pace
    thresholdPaceKmh = marathonPaceKmh * 1.05
    lowThresholdPace = thresholdPaceKmh * 0.94   // AM: ~6% slower than LT2
    highThresholdPace = thresholdPaceKmh * 0.97  // PM: ~3% slower than LT2
    easyPaceKmh = marathonPaceKmh * 0.78  // Norwegian easy (very slow)
    logger.debug('[Norwegian Doubles] Estimated paces (no LT2 test data)')
  }

  // Double-threshold days: Tuesday (2) and Thursday (4)
  const doubleDays = [2, 4]
  // Easy days: Monday, Wednesday, Friday
  const easyDays = [1, 3, 5]

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === 7) {
      // Sunday: Long easy run
      const duration = phase === 'TAPER' ? 70 : Math.min(90 + weekInPhase * 5, 120)
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
            `Long run in the Green zone (${formatPaceMinKm(easyPaceKmh)}/km).`,
            `Långpass i Green zone (${formatPaceMinKm(easyPaceKmh)}/km).`
          ),
          segments: [],
        }],
      })
    } else if (dayNum === 6) {
      // Saturday: Zone 4 HIT session (hill sprints)
      // ~10-15 reps x 30-45s @ ~15-17 km/h + jog back (~2 min)
      const hillReps = 12
      const hillSprintKmh = 16 // High intensity
      const postIntervalRestMin = 3 // Time-only rest after last rep before cooldown (no distance)
      const sprintDistanceKm = (hillReps * 0.6 / 60) * hillSprintKmh // ~0.6 min per rep
      const recoveryDistanceKm = ((hillReps - 1) * 2 / 60) * easyPaceKmh // ~2 min jog back between reps
      const warmupCooldownKm = (15 / 60) * easyPaceKmh // 15 min warmup+cooldown
      const hitTotalDistanceKm = Math.round((sprintDistanceKm + recoveryDistanceKm + warmupCooldownKm) * 10) / 10
      const hitTotalDurationMin = Math.round(15 + (hillReps * 0.6) + ((hillReps - 1) * 2) + postIntervalRestMin)

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Zone 4 HIT - high intensity', 'Zone 4 HIT - Hög intensitet'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'Hill intervals', 'Backintervaller'),
          intensity: 'INTERVAL' as const,
          duration: hitTotalDurationMin,
          distance: hitTotalDistanceKm,
          instructions: text(
            locale,
            `10-15 x 30-45s uphill with full recovery. Finish with ${postIntervalRestMin} min rest before the cool-down jog. Maximal intensity (>6.0 mmol/L).`,
            `10-15 × 30-45s backe med full vila. Avsluta med ${postIntervalRestMin} min vila innan nedjogg. Maximal intensitet (>6.0 mmol/L).`
          ),
          segments: [],
        }],
      })
    } else if (doubleDays.includes(dayNum) && phase !== 'TAPER') {
      // Double-threshold day: AM + PM sessions
      // lowThresholdPace and highThresholdPace are already set above from methodologyPaces

      // AM: 5×6 min with 1 min rest + warmup/cooldown
      const amWorkDistanceKm = (5 * 6 / 60) * lowThresholdPace
      const amRestDistanceKm = (4 * 1 / 60) * easyPaceKmh
      const amWarmupCooldownKm = (20 / 60) * easyPaceKmh
      const amTotalDistanceKm = Math.round((amWorkDistanceKm + amRestDistanceKm + amWarmupCooldownKm) * 10) / 10

      // PM: 4×8 min with 1.5 min rest + warmup/cooldown
      const pmWorkDistanceKm = (4 * 8 / 60) * highThresholdPace
      const pmRestDistanceKm = (3 * 1.5 / 60) * easyPaceKmh
      const pmWarmupCooldownKm = (20 / 60) * easyPaceKmh
      const pmTotalDistanceKm = Math.round((pmWorkDistanceKm + pmRestDistanceKm + pmWarmupCooldownKm) * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Double-threshold day (AM + PM)', 'Dubbel tröskeldag (FM + EM)'),
        workouts: [
          {
            type: 'RUNNING' as const,
            name: text(locale, 'AM: Low threshold (2-3 mmol/L)', 'FM: Låg tröskel (2-3 mmol/L)'),
            intensity: 'THRESHOLD' as const,
            duration: 55,
            distance: amTotalDistanceKm,
            instructions: text(
              locale,
              `AM session: 5x6 min @ ${formatPaceMinKm(lowThresholdPace)}/km with 1 min recovery. Keep lactate at 2-3 mmol/L.`,
              `FM-pass: 5×6 min @ ${formatPaceMinKm(lowThresholdPace)}/km med 1 min vila. Håll laktat 2-3 mmol/L.`
            ),
            segments: [],
          },
          {
            type: 'RUNNING' as const,
            name: text(locale, 'PM: High threshold (3-4 mmol/L)', 'EM: Hög tröskel (3-4 mmol/L)'),
            intensity: 'THRESHOLD' as const,
            duration: 55,
            distance: pmTotalDistanceKm,
            instructions: text(
              locale,
              `PM session: 4x8 min @ ${formatPaceMinKm(highThresholdPace)}/km with 90s recovery. Keep lactate at 3-4 mmol/L.`,
              `EM-pass: 4×8 min @ ${formatPaceMinKm(highThresholdPace)}/km med 90s vila. Håll laktat 3-4 mmol/L.`
            ),
            segments: [],
          },
        ],
      })
    } else if (easyDays.includes(dayNum)) {
      // Easy recovery run
      const duration = phase === 'TAPER' ? 30 : 45
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
            `Easy running in the Green zone (${formatPaceMinKm(easyPaceKmh)}/km).`,
            `Lätt löpning i Green zone (${formatPaceMinKm(easyPaceKmh)}/km).`
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

// ============================================================================
// CANOVA METHODOLOGY (Marathon-specialist)
// ============================================================================
