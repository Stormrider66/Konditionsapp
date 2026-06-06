// lib/coach/garmin-status.ts
//
// Shape of GET /api/integrations/garmin?clientId=... — coach-readable Garmin
// connection status for the athlete profile (Phase 4 of the IA redesign).
// Pairing is athlete-initiated, so the coach surfaces are read-only.

export interface GarminStatus {
  configured: boolean
  connected?: boolean
  externalUserId?: string | null
  lastSyncAt?: string | null
  lastSyncError?: string | null
  syncEnabled?: boolean | null
  connectedAt?: string | null
  metricsCount?: number
  message?: string
}

/** Sync freshness bucket for badge coloring. */
export type GarminFreshness = 'fresh' | 'stale' | 'error' | 'never'

export function garminFreshness(status: GarminStatus): GarminFreshness {
  if (status.lastSyncError) return 'error'
  if (!status.lastSyncAt) return 'never'
  const ageMs = Date.now() - new Date(status.lastSyncAt).getTime()
  return ageMs <= 48 * 60 * 60 * 1000 ? 'fresh' : 'stale'
}
