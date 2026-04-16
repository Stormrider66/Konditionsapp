import type { PeriodPhase } from '@/types'
import type { StrengthPhase } from '@prisma/client'
import type { AthleteType } from '../../hyrox-athlete-profiler'

export function mapHyroxWorkoutType(
  type: string
): 'RUNNING' | 'STRENGTH' | 'HYROX' | 'RECOVERY' {
  const mapping: Record<string, 'RUNNING' | 'STRENGTH' | 'HYROX' | 'RECOVERY'> = {
    running: 'RUNNING',
    strength: 'STRENGTH',
    station_practice: 'HYROX',
    hyrox_simulation: 'HYROX',
    interval: 'RUNNING',
    endurance: 'RUNNING',
    recovery: 'RECOVERY',
    mixed: 'HYROX',
  }
  return mapping[type] || 'HYROX'
}

export function mapIntensity(
  intensity: string,
  structure?: string
): 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX' {
  const isIntervalStructure = structure && (
    structure.includes('x') ||
    structure.includes('×') ||
    /\d+x\d+/.test(structure) ||
    structure.toLowerCase().includes('intervall')
  )

  const mapping: Record<string, 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'> = {
    easy: 'EASY',
    moderate: 'MODERATE',
    // 'hard' maps to INTERVAL when the structure is repetition-based, otherwise THRESHOLD.
    hard: isIntervalStructure ? 'INTERVAL' : 'THRESHOLD',
    race_pace: 'INTERVAL',
  }
  return mapping[intensity] || 'MODERATE'
}

export function mapPhase(phase: string): PeriodPhase {
  const mapping: Record<string, PeriodPhase> = {
    BASE: 'BASE',
    BUILD: 'BUILD',
    PEAK: 'PEAK',
    TAPER: 'TAPER',
    RACE: 'PEAK',
    RECOVERY: 'RECOVERY',
  }
  return mapping[phase] || 'BASE'
}

export function getHyroxPhase(weekNum: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNum / totalWeeks
  if (progress < 0.3) return 'BASE'
  if (progress < 0.7) return 'BUILD'
  if (progress < 0.9) return 'PEAK'
  return 'TAPER'
}

export function getHyroxFocus(goal: string, weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks
  if (progress < 0.25) return 'Grundkondition och teknisk inlärning av stationer'
  if (progress < 0.5) return 'Stationsspecifik träning och löpkapacitet'
  if (progress < 0.75) return 'Race-simuleringar och övergångar'
  if (progress < 0.9) return 'Tävlingstempo och finjustering'
  return 'Taper och vila'
}

export function getStrengthPhaseNameSv(phase: StrengthPhase): string {
  const names: Record<StrengthPhase, string> = {
    ANATOMICAL_ADAPTATION: 'Anatomisk anpassning',
    MAXIMUM_STRENGTH: 'Maxstyrka',
    POWER: 'Kraft',
    MAINTENANCE: 'Underhåll',
    TAPER: 'Taper',
  }
  return names[phase] || phase
}

export function getAthleteTypeLabel(athleteType: AthleteType): string {
  const labels: Record<AthleteType, string> = {
    FAST_WEAK: 'Stark löpare / Svaga stationer',
    SLOW_STRONG: 'Svag löpare / Starka stationer',
    BALANCED: 'Balanserad profil',
    NEEDS_BOTH: 'Utvecklingspotential i båda',
  }
  return labels[athleteType]
}

/** Format pace from seconds/km to MM:SS. */
export function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
