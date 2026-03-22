export type DashboardRecentActivitySource =
  | 'manual'
  | 'strava'
  | 'garmin'
  | 'concept2'
  | 'ai'
  | 'adhoc'

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
}
