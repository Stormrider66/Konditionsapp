/**
 * Shared types for the unified activity detail view.
 *
 * These describe the normalized shape that `buildActivityDetail` produces from
 * any of the cardio/stream sources (Garmin, Strava, Concept2, phone runs and
 * manual logs) so a single client component can render details + trends.
 *
 * Keep this file free of server-only imports (no prisma) — it is imported by
 * the client component too.
 */

export type ActivityDetailSource =
  | 'garmin'
  | 'strava'
  | 'concept2'
  | 'phonerun'
  | 'manual'
  | 'ai'

export const ACTIVITY_DETAIL_SOURCES: readonly ActivityDetailSource[] = [
  'garmin',
  'strava',
  'concept2',
  'phonerun',
  'manual',
  'ai',
]

export function isActivityDetailSource(value: string): value is ActivityDetailSource {
  return (ACTIVITY_DETAIL_SOURCES as readonly string[]).includes(value)
}

/** One point of the in-activity time series (HR / speed over elapsed time). */
export interface ActivityStreamPoint {
  elapsedSec: number
  hr?: number
  speedKmh?: number
}

/** Time-in-zone (seconds) for the 5-zone model. */
export interface ActivityZoneSeconds {
  zone1: number
  zone2: number
  zone3: number
  zone4: number
  zone5: number
  /** 'STRAVA_STREAM' | 'GARMIN_ZONES' | 'ESTIMATED' */
  source?: string
}

/** A single lap / km / 500m split row. */
export interface ActivitySplit {
  label: string
  distanceMeters?: number
  durationSec?: number
  paceSecPerKm?: number
  pace500m?: number
  avgHR?: number
  strokeRate?: number
}

/** A point in the cross-session comparison trend (chronological). */
export interface ActivityTrendPoint {
  id: string
  date: string
  /** Primary performance metric value (pace s/km, speed km/h, or pace s/500m). */
  value?: number
  avgHR?: number
  tss?: number
  distanceKm?: number
  isCurrent: boolean
}

export type TrendMetricKey = 'paceSecPerKm' | 'speedKmh' | 'pace500m'

export interface ActivityTrend {
  /** Which performance metric `value` represents; null when none derivable. */
  metricKey: TrendMetricKey | null
  /** Lower values are better (pace) vs higher better (speed). */
  lowerIsBetter: boolean
  /** Chronological ascending; the last point is the current activity. */
  points: ActivityTrendPoint[]
  /** Current activity vs the average of the other recent sessions. */
  comparison: {
    vsCount: number
    metricDeltaPct?: number
    avgHRDelta?: number
    distanceKmDelta?: number
  } | null
}

/** Per-exercise strength breakdown for a logged set-based session. */
export interface ActivityStrengthSet {
  setNumber: number
  weight: number
  repsCompleted: number
  rpe?: number
  estimated1RM?: number
}

export interface ActivityStrengthExercise {
  exerciseId: string
  name: string
  sets: ActivityStrengthSet[]
  totalVolume: number
  topSetWeight?: number
  bestEstimated1RM?: number
}

/** One historical point of an exercise's estimated-1RM progression. */
export interface ActivityProgressionPoint {
  date: string
  estimated1RM: number
  weight: number
  reps: number
}

/** Cross-session strength progression for a single exercise. */
export interface ActivityExerciseProgression {
  exerciseId: string
  name: string
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  /** kg per week. */
  progressionRate: number
  points: ActivityProgressionPoint[]
}

export interface ActivityDetailData {
  id: string
  source: ActivityDetailSource
  name: string
  /** Mapped/display activity type, e.g. RUNNING, CYCLING, ROWING, STRENGTH. */
  type: string
  sport?: string
  date: string
  deviceModel?: string
  indoor?: boolean

  // Metric grid
  durationSec?: number
  distanceMeters?: number
  avgHR?: number
  maxHR?: number
  calories?: number
  tss?: number
  trimp?: number
  paceSecPerKm?: number
  speedKmh?: number
  pace500m?: number
  elevationGainM?: number
  avgPower?: number
  normalizedPower?: number
  maxPower?: number
  cadence?: number
  strokeRate?: number
  trainingEffect?: number
  anaerobicEffect?: number
  perceivedEffort?: number

  // In-activity
  streams: ActivityStreamPoint[]
  zones: ActivityZoneSeconds | null
  splits: ActivitySplit[]

  // Cross-session
  trend: ActivityTrend

  // Strength (populated for set-based sessions)
  isStrength: boolean
  strengthExercises: ActivityStrengthExercise[]
  /** Per-exercise cross-session e1RM progression (set-based sessions only). */
  strengthProgression: ActivityExerciseProgression[]

  notes?: string
}
