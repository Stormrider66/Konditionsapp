/**
 * Live Voice Coaching Types
 *
 * Type definitions for the Gemini 3.1 Flash Live real-time voice coaching system.
 * Supports both cardio and strength workout types.
 */

/** Session config returned to client after init */
export interface LiveVoiceSessionConfig {
  ephemeralToken: string
  sessionId: string
  model: string
  workoutType: 'cardio' | 'strength'
  workoutContext: WorkoutContextForLive | StrengthWorkoutContextForLive
}

// ─── Cardio Types ───────────────────────────────────────────────────────────

/** Cardio workout data serialized for the Live API system instruction */
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

// ─── Strength Types ─────────────────────────────────────────────────────────

/** Strength workout data serialized for the Live API system instruction */
export interface StrengthWorkoutContextForLive {
  workoutName: string
  phase?: string
  exercises: StrengthExerciseForLive[]
  athleteName?: string
  coachNotes?: string
  estimatedDuration?: number
}

export interface StrengthExerciseForLive {
  index: number
  name: string
  section: string
  sets: number
  repsTarget: string | number
  weight?: number
  tempo?: string
  restSeconds: number
  notes?: string
  completedSets: number
}

// ─── Tool Types ─────────────────────────────────────────────────────────────

/** Tool function names available during live coaching */
export type LiveToolName =
  // Shared tools
  | 'pause_workout'
  | 'resume_workout'
  | 'get_current_status'
  | 'get_heart_rate'
  | 'adjust_intensity'
  // Cardio-specific tools
  | 'skip_segment'
  | 'extend_segment'
  | 'mark_segment_complete'
  // Strength-specific tools
  | 'log_set'
  | 'get_exercise_status'
  | 'skip_exercise'
  | 'complete_exercise'
  | 'start_rest_timer'

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

/** Current strength exercise status */
export interface LiveExerciseStatus {
  exerciseName: string
  completedSets: number
  targetSets: number
  targetReps: string | number
  targetWeight: number | null
  lastSetWeight: number | null
  lastSetReps: number | null
  nextSetNumber: number
}

/** Callbacks for tool call dispatch from the Live API */
export interface LiveCoachingToolCallbacks {
  // Shared
  onPauseWorkout: () => void
  onResumeWorkout: () => void
  onAdjustIntensity: (direction: 'easier' | 'harder', note?: string) => void
  // Cardio-specific
  onSkipSegment: () => void
  onExtendSegment: (seconds: number) => void
  onMarkSegmentComplete: () => void
  // Strength-specific
  onLogSet?: (data: { weight: number; reps: number; rpe?: number }) => Promise<{
    success: boolean
    estimated1RM?: number
    setNumber?: number
    completedSets?: number
    targetSets?: number
  }>
  onSkipExercise?: () => void
  onCompleteExercise?: () => void
  onStartRestTimer?: (seconds?: number) => void
}

/** Live voice coach connection status */
export type LiveVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'ended'
