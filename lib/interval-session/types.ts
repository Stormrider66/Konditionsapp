/**
 * Live Interval Session System - Type Definitions
 *
 * Types for timed interval sessions with lap recording, lactate, and Garmin enrichment.
 */

// Session statuses
export type IntervalSessionStatus = 'SETUP' | 'ACTIVE' | 'LACTATE_ENTRY' | 'ENDED'

// Session creation input
export interface CreateIntervalSessionInput {
  name?: string
  teamId?: string
  sportType?: string
  protocol?: IntervalProtocol
  participantIds?: string[]
  scheduledDate?: string // ISO date
  scheduledTime?: string // "HH:mm"
}

// Protocol definition
export interface IntervalProtocol {
  intervalCount?: number
  targetDurationSeconds?: number
  restDurationSeconds?: number
  description?: string
}

// Session update input
export interface UpdateIntervalSessionInput {
  name?: string
  status?: IntervalSessionStatus
}

// Participant data for streaming
export interface IntervalParticipantData {
  id: string
  clientId: string
  clientName: string
  color: string
  sortOrder: number
  laps: IntervalLapData[]
  lactates: IntervalLactateData[]
  garminEnrichment: GarminEnrichmentData | null
}

export interface IntervalLapData {
  id: string
  intervalNumber: number
  splitTimeMs: number
  cumulativeMs: number
}

export interface IntervalLactateData {
  id: string
  intervalNumber: number
  lactate: number
  heartRate: number | null
  notes: string | null
}

export interface GarminEnrichmentData {
  avgHR?: number
  maxHR?: number
  avgSpeed?: number
  laps?: { lapNumber: number; durationMs: number; avgHR?: number }[]
  hrSamples?: { timestamp: number; hr: number }[]
  hrZoneSeconds?: Record<string, number>
}

// SSE stream data format
export interface IntervalSessionStreamData {
  sessionId: string
  sessionName: string | null
  status: IntervalSessionStatus
  currentInterval: number
  timerStartedAt: string | null
  timestamp: string
  protocol: IntervalProtocol | null
  participants: IntervalParticipantData[]
  summary: {
    totalParticipants: number
    tappedThisInterval: number
    avgSplitMs: number | null
  }
}

// Full session details
export interface IntervalSessionFull {
  id: string
  coachId: string
  name: string | null
  teamId: string | null
  teamName: string | null
  sportType: string | null
  status: IntervalSessionStatus
  currentInterval: number
  timerStartedAt: string | null
  protocol: IntervalProtocol | null
  scheduledDate: string | null
  scheduledTime: string | null
  startedAt: string
  endedAt: string | null
  participantCount: number
  participants: IntervalParticipantData[]
}

// Session list item
export interface IntervalSessionListItem {
  id: string
  name: string | null
  teamName: string | null
  sportType: string | null
  status: IntervalSessionStatus
  currentInterval: number
  scheduledDate: string | null
  scheduledTime: string | null
  startedAt: string
  participantCount: number
}

// Record lap input
export interface RecordLapInput {
  clientId: string
  cumulativeMs: number
}

// Record lactate input
export interface RecordLactateInput {
  clientId: string
  intervalNumber: number
  lactate: number
  heartRate?: number
  notes?: string
}

// 20 high-contrast athlete colors
export const ATHLETE_COLORS = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#22C55E', // green-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#14B8A6', // teal-500
  '#6366F1', // indigo-500
  '#A855F7', // purple-500
  '#84CC16', // lime-500
  '#E11D48', // rose-600
  '#0EA5E9', // sky-500
  '#D946EF', // fuchsia-500
  '#10B981', // emerald-500
  '#FBBF24', // amber-400
  '#7C3AED', // violet-600
  '#FB923C', // orange-400
  '#2DD4BF', // teal-400
] as const

// Stream polling interval (1s — faster than LiveHR for timing precision)
export const STREAM_POLL_INTERVAL_MS = 1_000
