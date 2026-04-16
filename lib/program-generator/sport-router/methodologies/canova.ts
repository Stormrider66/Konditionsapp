import { logger } from '@/lib/logger'
import type { CreateTrainingProgramDTO } from '@/types'
import type { MethodologyPaces } from '../types'
import { formatPaceMinKm } from '../training-paces'
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
  goal: string
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
      focus: canovaPhase === 'FUNDAMENTAL' ? 'Grundläggande aerob kapacitet' :
             canovaPhase === 'SPECIAL' ? 'Maratonspecifik träning' : 'Tävlingsförberedelse',
      days: createCanovaDays(sessionsPerWeek, phase, canovaPhase, weekInPhase, marathonPaceKmh, goal),
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
  methodologyPaces?: MethodologyPaces  // Optional: use calculated Canova zones
) {
  const days = []

  // Use methodology-specific pacing if available
  let mpPaceKmh: number
  let regenerationPaceKmh: number
  let fundamentalPaceKmh: number
  let generalEnduranceKmh: number  // Active recovery during intervals!
  let specialEnduranceKmh: number
  let specificPaceKmh: number
  let specialSpeedKmh: number

  if (methodologyPaces?.canovaSpecificKmh) {
    // Using Canova-calculated zones
    mpPaceKmh = methodologyPaces.marathonPaceKmh
    regenerationPaceKmh = methodologyPaces.canovaRegenerationKmh!  // 65% MP
    fundamentalPaceKmh = methodologyPaces.canovaFundamentalKmh!   // 80% MP
    generalEnduranceKmh = methodologyPaces.canovaGeneralEnduranceKmh!  // 87.5% MP
    specialEnduranceKmh = methodologyPaces.canovaSpecialEnduranceKmh!  // 92.5% MP
    specificPaceKmh = methodologyPaces.canovaSpecificKmh!  // 100% MP
    specialSpeedKmh = methodologyPaces.canovaSpecialSpeedKmh!  // 107.5% MP

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
        ? `Grundläggande långpass (${formatPaceMinKm(easyPaceKmh)}/km). Bygg aerob bas.`
        : canovaPhase === 'SPECIAL'
        ? `Progressivt långpass: Börja lugnt, avsluta sista 20-30 min @ MP (${formatPaceMinKm(mpPaceKmh)}/km).`
        : `Tävlingsförberedande långpass med MP-segment.`

      days.push({
        dayNumber: dayNum,
        notes: 'Canova Långpass',
        workouts: [{
          type: 'RUNNING' as const,
          name: canovaPhase === 'FUNDAMENTAL' ? 'Grundläggande långpass' : 'Progressivt långpass',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: longRunInstructions,
          segments: [],
        }],
      })
    } else if (dayNum === 2) {
      // Tuesday: Quality session 1
      const workout = createCanovaQualityWorkout(canovaPhase, weekInPhase, marathonPaceKmh, goal, 1, methodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: 'Kvalitetspass 1',
        workouts: [workout],
      })
    } else if (dayNum === 4) {
      // Thursday: Quality session 2
      const workout = createCanovaQualityWorkout(canovaPhase, weekInPhase, marathonPaceKmh, goal, 2, methodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: 'Kvalitetspass 2',
        workouts: [workout],
      })
    } else if (dayNum === 6 && sessionsPerWeek >= 6) {
      // Saturday: Medium long run or tempo
      const duration = phase === 'TAPER' ? 45 : 60
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Medellångt pass',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Medellångt pass',
          intensity: 'MODERATE' as const,
          duration,
          distance,
          instructions: `Medellångt pass med möjlig tempohöjning sista 15-20 min.`,
          segments: [],
        }],
      })
    } else if ([1, 3, 5].includes(dayNum) && sessionsPerWeek >= dayNum) {
      // Easy days
      const duration = phase === 'TAPER' ? 30 : 40
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Lugn löpning',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Lugn löpning',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Lätt löpning (${formatPaceMinKm(easyPaceKmh)}/km).`,
          segments: [],
        }],
      })
    } else {
      days.push({
        dayNumber: dayNum,
        notes: 'Vilodag',
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
  methodologyPaces?: MethodologyPaces
) {
  // Use Canova zones if available
  let mpPaceKmh: number
  let fundamentalPaceKmh: number
  let activeRecoveryPaceKmh: number  // 85-90% MP - Canova's key difference!
  let specialEnduranceKmh: number
  let specificPaceKmh: number
  let specialSpeedKmh: number

  if (methodologyPaces?.canovaSpecificKmh) {
    mpPaceKmh = methodologyPaces.marathonPaceKmh
    fundamentalPaceKmh = methodologyPaces.canovaFundamentalKmh!
    activeRecoveryPaceKmh = methodologyPaces.canovaGeneralEnduranceKmh!  // 87.5% MP
    specialEnduranceKmh = methodologyPaces.canovaSpecialEnduranceKmh!
    specificPaceKmh = methodologyPaces.canovaSpecificKmh!
    specialSpeedKmh = methodologyPaces.canovaSpecialSpeedKmh!
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
      name = 'Varierad fartlek'
      description = `Fartlek: 8-10 × 2-3 min @ ${formatPaceMinKm(fundamentalPaceKmh)}/km med ${formatPaceMinKm(activeRecoveryPaceKmh)}/km vila. Bygg aerob kapacitet.`
      intensity = 'MODERATE'
    } else {
      name = 'Progressiv tempo'
      description = `Progressivt tempo: Börja @ ${formatPaceMinKm(fundamentalPaceKmh)}/km, avsluta @ ${formatPaceMinKm(specialEnduranceKmh)}/km.`
      intensity = 'THRESHOLD'
    }
  } else if (canovaPhase === 'SPECIAL') {
    // Special: Marathon-specific intervals with ACTIVE RECOVERY (85-90% MP)
    if (sessionNumber === 1) {
      name = 'MP-intervaller'
      description = is10KorShorter
        ? `6-8 × 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km med 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Aktiv vila!`
        : `4-5 × 2000m @ ${formatPaceMinKm(specificPaceKmh)}/km med 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Marathon-specifik.`
      intensity = 'THRESHOLD'
    } else {
      name = 'Canova Special Block'
      description = `Special block: 3 × (3km @ ${formatPaceMinKm(specificPaceKmh)}/km + 1km @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km). Uthållighet vid MP.`
      intensity = 'THRESHOLD'
    }
  } else {
    // Competition: Race-specific at Specific pace (100% MP)
    name = 'Tävlingsförberedelse'
    description = is10KorShorter
      ? `4-5 × 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km med full vila. Tävlingskänsla.`
      : `2 × 3km @ ${formatPaceMinKm(specificPaceKmh)}/km med 5 min vila. Slipa formen.`
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

