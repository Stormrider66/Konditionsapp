/**
 * Live Voice Coaching Types
 *
 * Type definitions for the Gemini 3.1 Flash Live real-time voice coaching system.
 */

/** Session config returned to client after init */
export interface LiveVoiceSessionConfig {
  ephemeralToken: string
  sessionId: string
  model: string
  workoutContext: WorkoutContextForLive
}

/** Workout data serialized for the Live API system instruction */
export interface WorkoutContextForLive {
  sessionName: string
  sport: string
  segments: LiveSegmentInfo[]
  athleteName?: string
  coachNotes?: string
  totalDuration?: number
}

export interface LiveSegmentInfo {
  index: number
  type: string
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedZone?: number
  notes?: string
}

/** Tool function names available during live coaching */
export type LiveToolName =
  | 'skip_segment'
  | 'pause_workout'
  | 'resume_workout'
  | 'extend_segment'
  | 'mark_segment_complete'
  | 'get_current_status'
  | 'adjust_intensity'

/** Client-reported session end data */
export interface LiveSessionEndReport {
  sessionId: string
  durationSeconds: number
  audioInputSeconds: number
  audioOutputSeconds: number
  segmentsCompleted: number
  endReason: 'completed' | 'user_cancelled' | 'error' | 'timeout'
}

/** Current workout status (returned by get_current_status tool) */
export interface LiveWorkoutStatus {
  currentSegmentIndex: number
  totalSegments: number
  currentSegmentType: string
  currentSegmentTypeName: string
  timeRemainingSeconds: number | null
  isRunning: boolean
  segmentsCompleted: number
}

/** Callbacks for tool call dispatch from the Live API */
export interface LiveCoachingToolCallbacks {
  onSkipSegment: () => void
  onPauseWorkout: () => void
  onResumeWorkout: () => void
  onExtendSegment: (seconds: number) => void
  onMarkSegmentComplete: () => void
  onAdjustIntensity: (direction: 'easier' | 'harder', note?: string) => void
}

/** Live voice coach connection status */
export type LiveVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'ended'
