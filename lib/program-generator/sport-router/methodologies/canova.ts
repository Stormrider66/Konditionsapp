import { logger } from '@/lib/logger'
import type { CreateTrainingProgramDTO } from '@/types'
import type { MethodologyPaces } from '../types'
import { formatPaceMinKm } from '../training-paces'
import { text, type SportRouterLocale } from '../locale'
import { calculateVolumePercent } from './polarized'

// ============================================================================

/**
 * Create weeks with Canova methodology
 * Canova: Progressive marathon-specific work, fundamental + special blocks
 */
export function createCanovaWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string,
  locale: SportRouterLocale = 'en'
) {
  const weeks = []

  // Canova periodization: Fundamental (40%) → Special (40%) → Competition (20%)
  const fundamentalWeeks = Math.max(Math.floor(durationWeeks * 0.4), 3)
  const specialWeeks = Math.max(Math.floor(durationWeeks * 0.4), 3)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number
    let canovaPhase: string

    if (i < fundamentalWeeks) {
      phase = 'BASE'
      canovaPhase = 'FUNDAMENTAL'
      weekInPhase = i + 1
    } else if (i < fundamentalWeeks + specialWeeks) {
      phase = 'BUILD'
      canovaPhase = 'SPECIAL'
      weekInPhase = i - fundamentalWeeks + 1
    } else {
      phase = i < durationWeeks - 2 ? 'PEAK' : 'TAPER'
      canovaPhase = 'COMPETITION'
      weekInPhase = i - fundamentalWeeks - specialWeeks + 1
    }

    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: canovaPhase === 'FUNDAMENTAL' ? text(locale, 'Foundational aerobic capacity', 'Grundläggande aerob kapacitet') :
             canovaPhase === 'SPECIAL' ? text(locale, 'Marathon-specific training', 'Maratonspecifik träning') : text(locale, 'Race preparation', 'Tävlingsförberedelse'),
      days: createCanovaDays(sessionsPerWeek, phase, canovaPhase, weekInPhase, marathonPaceKmh, goal, locale),
    })
  }

  return weeks
}

/**
 * Create 7 days with Canova distribution
 * Key workouts: Long intervals at marathon pace, progressive tempo runs
 *
 * Canova MP-based pacing system (from documentation):
 * - All paces calculated as % of Goal Marathon Pace
 * - Regeneration: 60-70% MP (very slow!)
 * - Fundamental: 80% MP
 * - General Endurance: 85-90% MP (used for ACTIVE RECOVERY in intervals!)
 * - Special Endurance: 90-95% MP
 * - Specific: 95-105% MP (THE RACE ZONE)
 * - Special Speed: 105-110% MP
 */
export function createCanovaDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  canovaPhase: string,
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  localeOrMethodologyPaces: SportRouterLocale | MethodologyPaces = 'en',
  methodologyPaces?: MethodologyPaces  // Optional: use calculated Canova zones
) {
  const locale = typeof localeOrMethodologyPaces === 'string' ? localeOrMethodologyPaces : 'en'
  const resolvedMethodologyPaces = typeof localeOrMethodologyPaces === 'string' ? methodologyPaces : localeOrMethodologyPaces
  const days = []

  // Use methodology-specific pacing if available
  let mpPaceKmh: number
  let regenerationPaceKmh: number
  let fundamentalPaceKmh: number
  let generalEnduranceKmh: number  // Active recovery during intervals!
  let specialEnduranceKmh: number
  let specificPaceKmh: number
  let specialSpeedKmh: number

  if (resolvedMethodologyPaces?.canovaSpecificKmh) {
    // Using Canova-calculated zones
    mpPaceKmh = resolvedMethodologyPaces.marathonPaceKmh
    regenerationPaceKmh = resolvedMethodologyPaces.canovaRegenerationKmh!  // 65% MP
    fundamentalPaceKmh = resolvedMethodologyPaces.canovaFundamentalKmh!   // 80% MP
    generalEnduranceKmh = resolvedMethodologyPaces.canovaGeneralEnduranceKmh!  // 87.5% MP
    specialEnduranceKmh = resolvedMethodologyPaces.canovaSpecialEnduranceKmh!  // 92.5% MP
    specificPaceKmh = resolvedMethodologyPaces.canovaSpecificKmh!  // 100% MP
    specialSpeedKmh = resolvedMethodologyPaces.canovaSpecialSpeedKmh!  // 107.5% MP

    logger.debug('[Canova] Using MP-based zones', {
      marathonPace: formatPaceMinKm(mpPaceKmh),
      regeneration: { pace: formatPaceMinKm(regenerationPaceKmh), percentMP: 65 },
      activeRecovery: { pace: formatPaceMinKm(generalEnduranceKmh), percentMP: 87.5, note: 'NOT jogging' }
    })
  } else {
    // Fallback: calculate from marathon pace
    mpPaceKmh = marathonPaceKmh
    regenerationPaceKmh = mpPaceKmh * 0.65     // 65% MP (very slow!)
    fundamentalPaceKmh = mpPaceKmh * 0.80      // 80% MP
    generalEnduranceKmh = mpPaceKmh * 0.875    // 87.5% MP (active recovery!)
    specialEnduranceKmh = mpPaceKmh * 0.925    // 92.5% MP
    specificPaceKmh = mpPaceKmh                 // 100% MP
    specialSpeedKmh = mpPaceKmh * 1.075         // 107.5% MP
  }

  // Canova key principle: "Easy" days are REGENERATION (very slow), not Daniels Easy
  const easyPaceKmh = regenerationPaceKmh

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === 7) {
      // Sunday: Canova Long Run (progressive or with MP segments)
      const baseDuration = phase === 'TAPER' ? 60 : (canovaPhase === 'FUNDAMENTAL' ? 90 : 105)
      const duration = Math.min(baseDuration + weekInPhase * 5, 150)
      const distance = Math.round((duration / 60) * (easyPaceKmh * 0.85) * 10) / 10

      const longRunInstructions = canovaPhase === 'FUNDAMENTAL'
        ? text(
            locale,
            `Foundational long run (${formatPaceMinKm(easyPaceKmh)}/km). Build aerobic base.`,
            `Grundläggande långpass (${formatPaceMinKm(easyPaceKmh)}/km). Bygg aerob bas.`
          )
        : canovaPhase === 'SPECIAL'
        ? text(
            locale,
            `Progressive long run: start easy, finish the final 20-30 min @ MP (${formatPaceMinKm(mpPaceKmh)}/km).`,
            `Progressivt långpass: Börja lugnt, avsluta sista 20-30 min @ MP (${formatPaceMinKm(mpPaceKmh)}/km).`
          )
        : text(locale, 'Race-preparation long run with MP segments.', 'Tävlingsförberedande långpass med MP-segment.')

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Canova long run', 'Canova Långpass'),
        workouts: [{
          type: 'RUNNING' as const,
          name: canovaPhase === 'FUNDAMENTAL'
            ? text(locale, 'Foundational long run', 'Grundläggande långpass')
            : text(locale, 'Progressive long run', 'Progressivt långpass'),
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: longRunInstructions,
          segments: [],
        }],
      })
    } else if (dayNum === 2) {
      // Tuesday: Quality session 1
      const workout = createCanovaQualityWorkout(canovaPhase, weekInPhase, marathonPaceKmh, goal, 1, locale, resolvedMethodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Quality session 1', 'Kvalitetspass 1'),
        workouts: [workout],
      })
    } else if (dayNum === 4) {
      // Thursday: Quality session 2
      const workout = createCanovaQualityWorkout(canovaPhase, weekInPhase, marathonPaceKmh, goal, 2, locale, resolvedMethodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Quality session 2', 'Kvalitetspass 2'),
        workouts: [workout],
      })
    } else if (dayNum === 6 && sessionsPerWeek >= 6) {
      // Saturday: Medium long run or tempo
      const duration = phase === 'TAPER' ? 45 : 60
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Medium-long session', 'Medellångt pass'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'Medium-long session', 'Medellångt pass'),
          intensity: 'MODERATE' as const,
          duration,
          distance,
          instructions: text(
            locale,
            'Medium-long session with an optional tempo lift during the final 15-20 min.',
            'Medellångt pass med möjlig tempohöjning sista 15-20 min.'
          ),
          segments: [],
        }],
      })
    } else if ([1, 3, 5].includes(dayNum) && sessionsPerWeek >= dayNum) {
      // Easy days
      const duration = phase === 'TAPER' ? 30 : 40
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: text(locale, 'Easy run', 'Lugn löpning'),
        workouts: [{
          type: 'RUNNING' as const,
          name: text(locale, 'Easy run', 'Lugn löpning'),
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: text(
            locale,
            `Easy running (${formatPaceMinKm(easyPaceKmh)}/km).`,
            `Lätt löpning (${formatPaceMinKm(easyPaceKmh)}/km).`
          ),
          segments: [],
        }],
      })
    } else {
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
 * Create Canova quality workout
 *
 * Canova workout principles (from documentation):
 * - ACTIVE RECOVERY during intervals at 85-90% MP (NOT easy jog!)
 * - Extension principle: Run MORE distance at same pace, not faster
 * - "Specific Endurance" is the primary training zone (95-105% MP)
 */
export function createCanovaQualityWorkout(
  canovaPhase: string,
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  sessionNumber: number,
  localeOrMethodologyPaces: SportRouterLocale | MethodologyPaces = 'en',
  methodologyPaces?: MethodologyPaces
) {
  const locale = typeof localeOrMethodologyPaces === 'string' ? localeOrMethodologyPaces : 'en'
  const resolvedMethodologyPaces = typeof localeOrMethodologyPaces === 'string' ? methodologyPaces : localeOrMethodologyPaces
  // Use Canova zones if available
  let mpPaceKmh: number
  let fundamentalPaceKmh: number
  let activeRecoveryPaceKmh: number  // 85-90% MP - Canova's key difference!
  let specialEnduranceKmh: number
  let specificPaceKmh: number
  let specialSpeedKmh: number

  if (resolvedMethodologyPaces?.canovaSpecificKmh) {
    mpPaceKmh = resolvedMethodologyPaces.marathonPaceKmh
    fundamentalPaceKmh = resolvedMethodologyPaces.canovaFundamentalKmh!
    activeRecoveryPaceKmh = resolvedMethodologyPaces.canovaGeneralEnduranceKmh!  // 87.5% MP
    specialEnduranceKmh = resolvedMethodologyPaces.canovaSpecialEnduranceKmh!
    specificPaceKmh = resolvedMethodologyPaces.canovaSpecificKmh!
    specialSpeedKmh = resolvedMethodologyPaces.canovaSpecialSpeedKmh!
  } else {
    mpPaceKmh = marathonPaceKmh
    fundamentalPaceKmh = mpPaceKmh * 0.80
    activeRecoveryPaceKmh = mpPaceKmh * 0.875  // 87.5% MP - NOT easy jog!
    specialEnduranceKmh = mpPaceKmh * 0.925
    specificPaceKmh = mpPaceKmh
    specialSpeedKmh = mpPaceKmh * 1.075
  }

  const is10KorShorter = goal === '5k' || goal === '10k'

  let name: string, description: string, intensity: 'THRESHOLD' | 'INTERVAL' | 'MODERATE'

  if (canovaPhase === 'FUNDAMENTAL') {
    // Fundamental: Build aerobic capacity at 80% MP with varied fartlek
    if (sessionNumber === 1) {
      name = text(locale, 'Varied fartlek', 'Varierad fartlek')
      description = text(
        locale,
        `Fartlek: 8-10 x 2-3 min @ ${formatPaceMinKm(fundamentalPaceKmh)}/km with ${formatPaceMinKm(activeRecoveryPaceKmh)}/km recovery. Build aerobic capacity.`,
        `Fartlek: 8-10 × 2-3 min @ ${formatPaceMinKm(fundamentalPaceKmh)}/km med ${formatPaceMinKm(activeRecoveryPaceKmh)}/km vila. Bygg aerob kapacitet.`
      )
      intensity = 'MODERATE'
    } else {
      name = text(locale, 'Progressive tempo', 'Progressiv tempo')
      description = text(
        locale,
        `Progressive tempo: start @ ${formatPaceMinKm(fundamentalPaceKmh)}/km, finish @ ${formatPaceMinKm(specialEnduranceKmh)}/km.`,
        `Progressivt tempo: Börja @ ${formatPaceMinKm(fundamentalPaceKmh)}/km, avsluta @ ${formatPaceMinKm(specialEnduranceKmh)}/km.`
      )
      intensity = 'THRESHOLD'
    }
  } else if (canovaPhase === 'SPECIAL') {
    // Special: Marathon-specific intervals with ACTIVE RECOVERY (85-90% MP)
    if (sessionNumber === 1) {
      name = text(locale, 'MP intervals', 'MP-intervaller')
      description = is10KorShorter
        ? text(
            locale,
            `6-8 x 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km with 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Active recovery.`,
            `6-8 × 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km med 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Aktiv vila!`
          )
        : text(
            locale,
            `4-5 x 2000m @ ${formatPaceMinKm(specificPaceKmh)}/km with 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Marathon-specific.`,
            `4-5 × 2000m @ ${formatPaceMinKm(specificPaceKmh)}/km med 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Marathon-specifik.`
          )
      intensity = 'THRESHOLD'
    } else {
      name = 'Canova Special Block'
      description = text(
        locale,
        `Special block: 3 x (3km @ ${formatPaceMinKm(specificPaceKmh)}/km + 1km @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km). Endurance at MP.`,
        `Special block: 3 × (3km @ ${formatPaceMinKm(specificPaceKmh)}/km + 1km @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km). Uthållighet vid MP.`
      )
      intensity = 'THRESHOLD'
    }
  } else {
    // Competition: Race-specific at Specific pace (100% MP)
    name = text(locale, 'Race preparation', 'Tävlingsförberedelse')
    description = is10KorShorter
      ? text(
          locale,
          `4-5 x 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km with full recovery. Race feel.`,
          `4-5 × 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km med full vila. Tävlingskänsla.`
        )
      : text(
          locale,
          `2 x 3km @ ${formatPaceMinKm(specificPaceKmh)}/km with 5 min recovery. Sharpen form.`,
          `2 × 3km @ ${formatPaceMinKm(specificPaceKmh)}/km med 5 min vila. Slipa formen.`
        )
    intensity = 'INTERVAL'
  }

  // Estimate distance: Canova workouts include active recovery at 87.5% MP
  const avgPaceKmh = intensity === 'THRESHOLD' ? specialEnduranceKmh :
                      intensity === 'INTERVAL' ? specificPaceKmh :
                      fundamentalPaceKmh
  const estimatedDistanceKm = Math.round((60 / 60) * avgPaceKmh * 10) / 10

  return {
    type: 'RUNNING' as const,
    name,
    intensity,
    duration: 60,
    distance: estimatedDistanceKm,
    instructions: description,
    segments: [],
  }
}

// ============================================================================
// PYRAMIDAL METHODOLOGY (70/20/10)
// ============================================================================
