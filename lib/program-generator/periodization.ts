// lib/program-generator/periodization.ts
// Periodization logic for training programs

import { PeriodPhase } from '@/types'

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
 * Calculate phase distribution based on total program weeks
 * Uses standard periodization ratios
 */
export function calculatePhases(totalWeeks: number): PhaseDistribution {
  if (totalWeeks < 4) {
    // Very short program - minimal phases
    return {
      base: Math.max(1, Math.floor(totalWeeks * 0.5)),
      build: Math.max(1, Math.floor(totalWeeks * 0.3)),
      peak: Math.max(1, Math.floor(totalWeeks * 0.2)),
      taper: 0,
    }
  }

  if (totalWeeks <= 8) {
    // Short program (8 weeks or less)
    return {
      base: Math.floor(totalWeeks * 0.5), // 50% base
      build: Math.floor(totalWeeks * 0.3), // 30% build
      peak: Math.floor(totalWeeks * 0.15), // 15% peak
      taper: Math.max(1, Math.floor(totalWeeks * 0.05)), // 5% taper (min 1 week)
    }
  }

  if (totalWeeks <= 16) {
    // Medium program (marathon standard)
    return {
      base: Math.floor(totalWeeks * 0.55), // 55% base
      build: Math.floor(totalWeeks * 0.25), // 25% build
      peak: Math.floor(totalWeeks * 0.12), // 12% peak
      taper: Math.max(2, Math.floor(totalWeeks * 0.08)), // 8% taper (min 2 weeks)
    }
  }

  // Long program (>16 weeks)
  return {
    base: Math.floor(totalWeeks * 0.6), // 60% base
    build: Math.floor(totalWeeks * 0.25), // 25% build
    peak: Math.floor(totalWeeks * 0.1), // 10% peak
    taper: Math.max(2, Math.floor(totalWeeks * 0.05)), // 5% taper (min 2 weeks)
  }
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
