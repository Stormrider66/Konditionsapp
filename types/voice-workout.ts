// types/voice-workout.ts

// ==================== VOICE WORKOUT CREATION TYPES ====================

export type VoiceWorkoutTargetType = 'ATHLETE' | 'TEAM'
export type VoiceWorkoutType = 'CARDIO' | 'STRENGTH' | 'HYBRID'
export type VoiceWorkoutStatus = 'PENDING' | 'PROCESSING' | 'PARSED' | 'CONFIRMED' | 'FAILED'

/**
 * Target information extracted from voice input
 */
export interface VoiceWorkoutTarget {
  type: VoiceWorkoutTargetType
  name: string           // Extracted name from voice (e.g., "Johan", "Team Alpha")
  resolvedId?: string    // Matched database ID
  alternatives?: Array<{ id: string; name: string }>  // Other possible matches
  confidence: number     // 0-1, how confident the match is
}

/**
 * Schedule information extracted from voice input
 */
export interface VoiceWorkoutSchedule {
  dateText: string       // Original text: "thursday", "tomorrow", "27 januari"
  timeText?: string      // Original text: "6pm", "kl 18", "morning"
  resolvedDate?: string  // ISO date string (YYYY-MM-DD)
  resolvedTime?: string  // Time string (HH:mm)
}

/**
 * Individual workout structure element (warmup, intervals, exercises, etc.)
 */
export interface VoiceWorkoutStructure {
  type: 'warmup' | 'main' | 'cooldown' | 'interval' | 'exercise' | 'rest'
  duration?: number      // minutes
  zone?: number          // 1-5 for cardio zones
  reps?: number          // for intervals (e.g., 5 x 3min)
  sets?: number          // for strength exercises
  repsCount?: string     // "10", "10-12", "AMRAP"
  exerciseName?: string  // for strength/hybrid: "back squat", "push-ups"
  rest?: number          // seconds
  description?: string   // free-form description
}

/**
 * Parsed intent from voice transcription
 */
export interface VoiceWorkoutIntent {
  transcription: string
  target: VoiceWorkoutTarget
  schedule: VoiceWorkoutSchedule
  workout: {
    type: VoiceWorkoutType
    subtype?: string        // "tempo", "intervals", "AMRAP", "lower body", etc.
    name?: string           // Optional workout name
    duration?: number       // Total duration in minutes
    structure: VoiceWorkoutStructure[]
  }
  confidence: number        // 0-1, overall confidence of parsing
  ambiguities: string[]     // List of things that need clarification
}

/**
 * Cardio session segment data
 */
export interface CardioSegmentData {
  type: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'interval'
  duration?: number    // seconds
  distance?: number    // meters
  pace?: string        // e.g., "5:00/km"
  zone?: number        // 1-5
  targetHR?: number
  notes?: string
}

/**
 * Cardio session data for generation
 */
export interface CardioSessionData {
  name: string
  description?: string
  sport: string       // RUNNING, CYCLING, etc.
  segments: CardioSegmentData[]
  totalDuration?: number  // seconds
  totalDistance?: number  // meters
  avgZone?: number
  tags?: string[]
}

/**
 * Strength exercise data
 */
export interface StrengthExerciseData {
  exerciseId?: string
  exerciseName: string
  sets: number
  reps: string         // "10", "8-12", "AMRAP"
  weight?: string      // "70kg", "bodyweight", "60-70%"
  restSeconds?: number
  notes?: string
  section?: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
}

/**
 * Strength session data for generation
 */
export interface StrengthSessionData {
  name: string
  description?: string
  phase?: string       // ANATOMICAL_ADAPTATION, MAX_STRENGTH, etc.
  exercises: StrengthExerciseData[]
  warmupData?: {
    notes?: string
    duration?: number
    exercises?: StrengthExerciseData[]
  }
  coreData?: {
    notes?: string
    duration?: number
    exercises?: StrengthExerciseData[]
  }
  cooldownData?: {
    notes?: string
    duration?: number
  }
  estimatedDuration?: number  // minutes
  tags?: string[]
}

/**
 * Hybrid workout movement data
 */
export interface HybridMovementData {
  exerciseId?: string
  name: string
  reps?: string        // "21", "10", "AMRAP", "max"
  weight?: string      // "70kg", "bodyweight"
  distance?: number    // meters
  duration?: number    // seconds (for holds, runs)
  calories?: number    // for cardio machines
  sequence: number
  notes?: string
}

/**
 * Hybrid workout data for generation
 */
export interface HybridWorkoutData {
  name: string
  description?: string
  format: string       // AMRAP, FOR_TIME, EMOM, etc.
  timeCap?: number     // seconds
  workTime?: number    // EMOM/Tabata work portion (seconds)
  restTime?: number    // EMOM/Tabata rest portion (seconds)
  totalRounds?: number
  totalMinutes?: number
  repScheme?: string   // "21-15-9", "10-9-8-7-6-5-4-3-2-1"
  movements: HybridMovementData[]
  warmupData?: {
    notes?: string
    movements?: HybridMovementData[]
  }
  cooldownData?: {
    notes?: string
    movements?: HybridMovementData[]
  }
  tags?: string[]
}

/**
 * Union type for generated workout data
 */
export interface GeneratedWorkoutData {
  type: VoiceWorkoutType
  name: string
  description?: string
  // Type-specific data (one will be set based on type)
  cardioData?: CardioSessionData
  strengthData?: StrengthSessionData
  hybridData?: HybridWorkoutData
}

/**
 * Athlete info with warnings for preview
 */
export interface AthleteAssignmentInfo {
  id: string
  name: string
  email?: string
  warnings?: string[]  // e.g., ["High ACWR (1.6)", "Active injury: knee"]
}

/**
 * Preview response for coach review
 */
export interface VoiceWorkoutPreview {
  sessionId: string
  parsedIntent: VoiceWorkoutIntent
  generatedWorkout: GeneratedWorkoutData
  guardrailWarnings: string[]  // AI-generated safety warnings
  targetInfo: {
    type: VoiceWorkoutTargetType
    athletes: AthleteAssignmentInfo[]
  }
  calendarPreview: {
    title: string
    date: string       // ISO date
    time?: string      // HH:mm
  }
  canSave: boolean     // Whether all required info is present
  issues?: string[]    // Blocking issues preventing save
}

/**
 * Request body for confirming voice workout
 */
export interface VoiceWorkoutConfirmRequest {
  // Allow coach to modify the workout before saving
  workout?: Partial<GeneratedWorkoutData>
  // Assignment configuration
  assignment: {
    targetType: VoiceWorkoutTargetType
    targetId: string        // Athlete or Team ID
    assignedDate: string    // ISO date
  }
  // Calendar event options
  createCalendarEvent?: boolean
  calendarEventTime?: string  // HH:mm
}

/**
 * Response from confirm endpoint
 */
export interface VoiceWorkoutConfirmResponse {
  success: boolean
  workoutId: string        // ID of created workout
  workoutType: VoiceWorkoutType
  assignmentCount: number  // Number of athletes assigned
  calendarEventId?: string // If calendar event was created
  error?: string
}

/**
 * Session details from API
 */
export interface VoiceWorkoutSessionDetails {
  id: string
  coachId: string
  audioUrl: string
  duration: number
  mimeType?: string
  status: VoiceWorkoutStatus
  transcription?: string
  parsedIntent?: VoiceWorkoutIntent
  workoutType?: VoiceWorkoutType
  targetType?: VoiceWorkoutTargetType
  targetId?: string
  assignedDate?: string
  processingTimeMs?: number
  modelUsed?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  // Resolved relations
  strengthSession?: { id: string; name: string }
  cardioSession?: { id: string; name: string }
  hybridWorkout?: { id: string; name: string }
}
