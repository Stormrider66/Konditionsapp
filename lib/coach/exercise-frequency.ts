// lib/coach/exercise-frequency.ts
//
// Shared types for the coach-scoped "most-trained exercises" surface
// (Phase 2 of the athlete-profile IA redesign). Ranks exercises by how often
// the athlete has performed them (ProgressionTracking rows) and shows where
// each one currently stands. Imported by both the API route and the component.

export interface ExerciseFrequencyEntry {
  exerciseId: string
  name: string
  nameSv: string | null
  nameEn: string | null
  category: string | null
  /** Number of logged sessions for this exercise. */
  sessions: number
  /** Latest estimated 1RM (kg), if tracked. */
  current1RM: number | null
  /** Latest ProgressionStatus (ON_TRACK | PLATEAU | REGRESSING | DELOAD_NEEDED). */
  status: string | null
  lastDate: string | null
}

export interface ExerciseFrequencyResponse {
  success: boolean
  data: ExerciseFrequencyEntry[]
}
