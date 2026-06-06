// lib/coach/wellness-trends.ts
//
// Shared types for the coach-scoped wellness-trends surface (Phase 2 of the
// athlete-profile IA redesign). Imported by both the API route and the
// client component.

export interface WellnessPoint {
  date: string
  soreness: number | null
  energy: number | null
  mood: number | null
  stress: number | null
  sleepQuality: number | null
  sleepHours: number | null
  readiness: number | null
  wellness: number | null
}

export interface InjuryEntry {
  date: string
  bodyPart: string | null
  specificType: string | null
  side: string | null
  isIllness: boolean
  illnessType: string | null
  painLevel: number | null
}
