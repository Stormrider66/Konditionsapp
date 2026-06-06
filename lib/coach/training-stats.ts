// lib/coach/training-stats.ts
//
// Shared types for the coach-scoped training-statistics surface (Phase 2 of
// the athlete-profile IA redesign). Reads the pre-computed
// WeeklyTrainingSummary rows. Imported by both the API route and the component.

export interface WeeklyStat {
  weekStart: string
  tss: number
  distanceKm: number
  durationMin: number
  /** Completed sessions (falls back to workoutCount when planned isn't tracked). */
  sessions: number
  planned: number | null
  compliance: number | null
  easyMin: number
  moderateMin: number
  hardMin: number
  polarization: number | null
  acwrZone: string | null
}

export interface TrainingStatsTotals {
  tss: number
  distanceKm: number
  durationMin: number
  sessions: number
  avgCompliance: number | null
  avgPolarization: number | null
  latestAcwrZone: string | null
}

export interface TrainingStatsResponse {
  success: boolean
  weeks: number
  hasData: boolean
  data: WeeklyStat[]
  totals: TrainingStatsTotals
}
