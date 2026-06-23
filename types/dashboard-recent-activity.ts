export type DashboardRecentActivitySource =
  | 'manual'
  | 'strava'
  | 'garmin'
  | 'concept2'
  | 'quickerg'
  | 'phonerun'
  | 'ai'
  | 'adhoc'
  | 'hybrid'

export interface DashboardRecentActivitySummary {
  id: string
  source: DashboardRecentActivitySource
  name: string
  type: string
  date: Date
  durationMinutes?: number
  distanceKm?: number
  avgHR?: number
  calories?: number
  tss?: number
  deviceModel?: string
  notes?: string
  /** HybridWorkout template id — the hybrid detail route is keyed by the
   * workout (not the log), so the hero needs it to deep-link correctly. */
  hybridWorkoutId?: string
}
