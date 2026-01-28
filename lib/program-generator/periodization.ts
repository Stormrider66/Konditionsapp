// lib/program-generator/periodization.ts
// Periodization logic for training programs

import { PeriodPhase } from '@/types'
import { logger } from '@/lib/logger'

export interface PhaseDistribution {
  base: number // weeks
  build: number
  peak: number
  taper: number
}

export interface WeeklyVolumeProgression {
  week: number
  phase: PeriodPhase
  volumePercentage: number // 0-100% of peak volume
  focus: string
}

/**
 * Calculate phase distribution based on total program weeks and methodology
 *
 * Each methodology has its own periodization philosophy:
 *
 * POLARIZED (Seiler 80/20):
 *   - Traditional periodization, long base phase
 *   - 40% BASE, 35% BUILD, 15% PEAK, 10% TAPER
 *
 * NORWEGIAN_SINGLE (Sub-threshold):
 *   - Threshold work starts earlier
 *   - Shorter base, longer build to accumulate threshold volume
 *   - 30% BASE, 45% BUILD, 15% PEAK, 10% TAPER
 *
 * NORWEGIAN / NORWEGIAN_DOUBLES (Elite double-threshold):
 *   - Requires solid aerobic foundation first
 *   - High threshold volume in build phase
 *   - 35% BASE, 40% BUILD, 15% PEAK, 10% TAPER
 *
 * CANOVA (Marathon specialist):
 *   - INVERTED periodization - PEAK is the LONGEST phase
 *   - Race-specific work is the main training stimulus
 *   - 25% BASE, 27% BUILD, 40% PEAK, 8% TAPER
 *
 * PYRAMIDAL (70/20/10):
 *   - Traditional with more Zone 2 (tempo) work
 *   - Longer base for aerobic capacity before tempo work
 *   - 45% BASE, 30% BUILD, 15% PEAK, 10% TAPER
 */
export function calculatePhases(totalWeeks: number, methodology?: string): PhaseDistribution {
  // Methodology-specific phase ratios
  const methodologyRatios: Record<string, { base: number; build: number; peak: number; taper: number }> = {
    'POLARIZED': { base: 0.40, build: 0.35, peak: 0.15, taper: 0.10 },
    'NORWEGIAN_SINGLE': { base: 0.30, build: 0.45, peak: 0.15, taper: 0.10 },
    'NORWEGIAN_SINGLES': { base: 0.30, build: 0.45, peak: 0.15, taper: 0.10 },
    'NORWEGIAN': { base: 0.35, build: 0.40, peak: 0.15, taper: 0.10 },
    'NORWEGIAN_DOUBLES': { base: 0.35, build: 0.40, peak: 0.15, taper: 0.10 },
    'CANOVA': { base: 0.25, build: 0.27, peak: 0.40, taper: 0.08 }, // Inverted!
    'PYRAMIDAL': { base: 0.45, build: 0.30, peak: 0.15, taper: 0.10 },
  }

  // Get ratios for methodology (default to POLARIZED)
  const ratios = methodologyRatios[methodology?.toUpperCase() || 'POLARIZED'] || methodologyRatios['POLARIZED']

  let base: number, build: number, peak: number, taper: number

  if (totalWeeks < 4) {
    // Very short program - minimal phases, ignore methodology specifics
    base = Math.max(1, Math.floor(totalWeeks * 0.5))
    build = Math.max(1, Math.floor(totalWeeks * 0.3))
    peak = Math.max(1, Math.floor(totalWeeks * 0.2))
    taper = 0
  } else {
    // Apply methodology-specific ratios
    base = Math.max(2, Math.floor(totalWeeks * ratios.base))
    build = Math.max(2, Math.floor(totalWeeks * ratios.build))
    peak = Math.max(1, Math.floor(totalWeeks * ratios.peak))
    taper = Math.max(1, Math.floor(totalWeeks * ratios.taper))

    // Ensure minimum taper for longer programs
    if (totalWeeks >= 12 && taper < 2) {
      taper = 2
    }
  }

  // Ensure phases sum to exactly totalWeeks
  const sum = base + build + peak + taper
  if (sum < totalWeeks) {
    // Add remainder to the key phase for each methodology
    if (methodology?.toUpperCase() === 'CANOVA') {
      peak += (totalWeeks - sum) // Canova: add to PEAK (main phase)
    } else if (methodology?.toUpperCase()?.includes('NORWEGIAN')) {
      build += (totalWeeks - sum) // Norwegian: add to BUILD (threshold accumulation)
    } else {
      peak += (totalWeeks - sum) // Others: add to PEAK
    }
  } else if (sum > totalWeeks) {
    // Reduce from base if over
    const diff = sum - totalWeeks
    base = Math.max(2, base - diff)
  }

  logger.debug('Phase distribution calculated', { methodology: methodology || 'POLARIZED', totalWeeks, phases: { base, build, peak, taper } })

  return { base, build, peak, taper }
}

/**
 * Calculate Canova-specific phase distribution
 *
 * Canova methodology inverts traditional periodization:
 * - SPECIFIC (PEAK) is the LONGEST phase - where race-specific work happens
 * - BASE (GENERAL + FUNDAMENTAL) is shorter - just build aerobic foundation
 *
 * Canova phases mapped to our system:
 * - GENERAL (4 weeks) → BASE (early)
 * - FUNDAMENTAL (4-6 weeks) → BASE (late)
 * - SPECIAL (6-8 weeks) → BUILD
 * - SPECIFIC (8-12 weeks) → PEAK (THE LONGEST PHASE!)
 * - TAPER (2-3 weeks) → TAPER
 *
 * For a 26-week program:
 * - BASE: 6-8 weeks (25-30%) - General + Fundamental combined
 * - BUILD: 6-8 weeks (25-30%) - Special period, introduce blocks
 * - PEAK: 10-12 weeks (40-45%) - Specific period, THE MAIN PHASE
 * - TAPER: 2-3 weeks (8-12%)
 */
export function calculateCanovaPhases(totalWeeks: number): PhaseDistribution {
  let base: number, build: number, peak: number, taper: number

  if (totalWeeks < 8) {
    // Very short Canova program - minimal adaptation possible
    base = Math.max(2, Math.floor(totalWeeks * 0.25))
    build = Math.floor(totalWeeks * 0.25)
    peak = Math.max(2, Math.floor(totalWeeks * 0.40))
    taper = Math.max(1, totalWeeks - base - build - peak)
  } else if (totalWeeks <= 12) {
    // Short Canova block (8-12 weeks)
    base = 3  // Minimal base
    build = 3
    peak = Math.max(4, totalWeeks - 8)  // Rest goes to PEAK
    taper = 2
  } else if (totalWeeks <= 16) {
    // Standard Canova block (12-16 weeks)
    base = 4   // ~25%
    build = 4  // ~25%
    peak = Math.max(6, totalWeeks - 10)  // ~40%+ (THE LONGEST)
    taper = 2  // ~12%
  } else if (totalWeeks <= 20) {
    // Extended Canova block (16-20 weeks)
    base = 5   // ~25%
    build = 5  // ~25%
    peak = Math.max(8, totalWeeks - 12)  // ~40%+ (THE LONGEST)
    taper = 2  // ~10%
  } else {
    // Long Canova block (20+ weeks) - full periodization
    base = 6   // ~23% - GENERAL (3w) + FUNDAMENTAL (3w)
    build = 7  // ~27% - SPECIAL period
    peak = Math.max(10, totalWeeks - 16)  // ~40%+ - SPECIFIC (THE MAIN PHASE)
    taper = 3  // ~12%
  }

  // Ensure phases sum to exactly totalWeeks
  // Add any remainder weeks to the PEAK phase (Canova's key phase)
  const sum = base + build + peak + taper
  if (sum < totalWeeks) {
    peak += (totalWeeks - sum)
  } else if (sum > totalWeeks) {
    // Reduce from base if over
    base -= (sum - totalWeeks)
    if (base < 2) {
      base = 2
      build = Math.max(2, build - (sum - totalWeeks - 2))
    }
  }

  logger.debug('Canova phase distribution calculated', { totalWeeks, phases: { base, build, peak, taper } })

  return { base, build, peak, taper }
}

/**
 * Generate weekly volume progression
 * Gradually increases from base to peak, then tapers
 */
export function calculateWeeklyVolumeProgression(
  totalWeeks: number,
  baseVolume: number, // Starting weekly volume (hours or km)
  peakVolume: number // Maximum weekly volume
): WeeklyVolumeProgression[] {
  const phases = calculatePhases(totalWeeks)
  const progression: WeeklyVolumeProgression[] = []

  let currentWeek = 1

  // BASE PHASE - gradual increase
  for (let i = 0; i < phases.base; i++) {
    const progress = i / phases.base
    const volume = baseVolume + (peakVolume - baseVolume) * progress * 0.6 // Reach 60% of peak

    progression.push({
      week: currentWeek++,
      phase: 'BASE',
      volumePercentage: (volume / peakVolume) * 100,
      focus: i < phases.base / 2 ? 'Bygg grundkondition' : 'Öka volym gradvis',
    })
  }

  // BUILD PHASE - increase intensity while maintaining volume
  for (let i = 0; i < phases.build; i++) {
    const progress = i / phases.build
    const volume = (peakVolume * 0.6) + (peakVolume * 0.35 * progress) // 60% to 95% of peak

    progression.push({
      week: currentWeek++,
      phase: 'BUILD',
      volumePercentage: (volume / peakVolume) * 100,
      focus: 'Öka intensitet, tempopass och intervaller',
    })
  }

  // PEAK PHASE - max volume and race-specific training
  for (let i = 0; i < phases.peak; i++) {
    const volume = peakVolume * (0.95 + 0.05 * (i / phases.peak)) // 95-100% of peak

    progression.push({
      week: currentWeek++,
      phase: 'PEAK',
      volumePercentage: (volume / peakVolume) * 100,
      focus: 'Maximal volym, tävlingsspecifik träning',
    })
  }

  // TAPER PHASE - reduce volume, maintain intensity
  for (let i = 0; i < phases.taper; i++) {
    const progress = i / phases.taper
    const volume = peakVolume * (1 - 0.4 * progress) // Reduce to 60% of peak

    progression.push({
      week: currentWeek++,
      phase: 'TAPER',
      volumePercentage: (volume / peakVolume) * 100,
      focus: i < phases.taper - 1 ? 'Minska volym, behåll intensitet' : 'Slutlig nedtrappning inför tävling',
    })
  }

  return progression
}

/**
 * Apply 3:1 progression (3 weeks hard, 1 week recovery)
 * Returns adjusted volume percentage
 */
export function applyRecoveryWeeks(
  week: number,
  volumePercentage: number
): number {
  // Every 4th week is a recovery week (reduce volume by 20-30%)
  if (week % 4 === 0) {
    return volumePercentage * 0.75 // 25% reduction
  }
  return volumePercentage
}

/**
 * Calculate training days per week based on experience level and phase
 */
export function calculateTrainingDaysPerWeek(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  phase: PeriodPhase,
  requestedDays: number
): number {
  const maxDays = {
    beginner: 4,
    intermediate: 6,
    advanced: 7,
  }

  // In taper phase, reduce training days
  if (phase === 'TAPER') {
    return Math.min(requestedDays - 1, maxDays[experienceLevel])
  }

  return Math.min(requestedDays, maxDays[experienceLevel])
}

/**
 * Get focus description for a specific phase
 */
export function getPhaseFocus(phase: PeriodPhase): string {
  const focuses = {
    BASE: 'Bygg aerob grund med lätta till måttliga löppass',
    BUILD: 'Öka intensitet med tempopass och intervaller',
    PEAK: 'Maximal volym och tävlingsspecifik träning',
    TAPER: 'Minska volym, behåll intensitet, förbered för tävling',
    RECOVERY: 'Aktiv återhämtning efter tävling',
    TRANSITION: 'Off-season, allmän kondition och styrka',
  }
  return focuses[phase]
}

/**
 * Calculate when to schedule long runs (typically weekends)
 * Returns day numbers: 1=Monday, 7=Sunday
 */
export function getLongRunDay(trainingDaysPerWeek: number): number {
  // Long runs typically on weekends
  return trainingDaysPerWeek >= 5 ? 7 : 6 // Sunday if 5+ days, Saturday if fewer
}

/**
 * Calculate long run distance as percentage of weekly volume
 */
export function getLongRunPercentage(
  phase: PeriodPhase,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): number {
  const percentages = {
    beginner: { BASE: 0.25, BUILD: 0.28, PEAK: 0.30, TAPER: 0.20 },
    intermediate: { BASE: 0.28, BUILD: 0.30, PEAK: 0.33, TAPER: 0.22 },
    advanced: { BASE: 0.30, BUILD: 0.32, PEAK: 0.35, TAPER: 0.25 },
  }

  return percentages[experienceLevel][phase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'] || 0.30
}
