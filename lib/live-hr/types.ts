/**
 * Live HR Streaming System - Type Definitions
 *
 * Types for real-time heart rate monitoring during team training sessions.
 */

// Session statuses
export type LiveHRSessionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED'

// Session creation input
export interface CreateLiveHRSessionInput {
  name?: string
  teamId?: string
  participantIds?: string[] // Initial participants to add
}

// Session update input
export interface UpdateLiveHRSessionInput {
  name?: string
  status?: LiveHRSessionStatus
}

// Participant data with latest HR info
export interface LiveHRParticipantData {
  id: string
  clientId: string
  clientName: string
  heartRate: number | null
  zone: number | null
  lastUpdated: string | null
  isStale: boolean // true if no reading in last 10 seconds
  joinedAt: string
}

// SSE stream data format
export interface LiveHRStreamData {
  sessionId: string
  sessionName: string | null
  status: LiveHRSessionStatus
  timestamp: string
  participants: LiveHRParticipantData[]
  summary: {
    totalParticipants: number
    activeParticipants: number // With recent readings
    avgHeartRate: number | null
    zoneDistribution: {
      zone1: number
      zone2: number
      zone3: number
      zone4: number
      zone5: number
    }
  }
}

// HR push input from athlete/device
export interface PushHRReadingInput {
  sessionId: string
  heartRate: number
  deviceId?: string
  timestamp?: string // ISO string, defaults to now
}

// Session with full details
export interface LiveHRSessionFull {
  id: string
  coachId: string
  name: string | null
  teamId: string | null
  teamName: string | null
  status: LiveHRSessionStatus
  startedAt: string
  endedAt: string | null
  participantCount: number
  participants: LiveHRParticipantData[]
}

// Session list item (for coach's session list)
export interface LiveHRSessionListItem {
  id: string
  name: string | null
  teamName: string | null
  status: LiveHRSessionStatus
  startedAt: string
  participantCount: number
  activeParticipants: number
}

// Zone thresholds for calculating zone from HR
export interface ZoneThresholds {
  zone1Max: number
  zone2Max: number
  zone3Max: number
  zone4Max: number
  // zone5 is anything above zone4Max
}

// Helper function to determine HR zone
export function getZoneFromHR(hr: number, thresholds: ZoneThresholds): number {
  if (hr <= thresholds.zone1Max) return 1
  if (hr <= thresholds.zone2Max) return 2
  if (hr <= thresholds.zone3Max) return 3
  if (hr <= thresholds.zone4Max) return 4
  return 5
}

// Zone colors for UI
export const ZONE_COLORS = {
  1: '#3B82F6', // blue-500 - Recovery
  2: '#22C55E', // green-500 - Aerobic
  3: '#EAB308', // yellow-500 - Tempo
  4: '#F97316', // orange-500 - Threshold
  5: '#EF4444', // red-500 - VO2max
} as const

// Zone names (Swedish)
export const ZONE_NAMES_SV = {
  1: 'Återhämtning',
  2: 'Aerob',
  3: 'Tempo',
  4: 'Tröskel',
  5: 'VO2max',
} as const

// Zone names (English)
export const ZONE_NAMES_EN = {
  1: 'Recovery',
  2: 'Aerobic',
  3: 'Tempo',
  4: 'Threshold',
  5: 'VO2max',
} as const

// Stale threshold in milliseconds (10 seconds)
export const STALE_THRESHOLD_MS = 10_000

// Stream polling interval in milliseconds (2 seconds)
export const STREAM_POLL_INTERVAL_MS = 2_000
