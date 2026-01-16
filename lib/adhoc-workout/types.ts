/**
 * Ad-Hoc Workout Logging System - Type Definitions
 *
 * Types for parsing and processing workouts logged outside of training programs.
 * Supports multiple input methods: photo, voice, text, and external imports.
 */

import type {
  WorkoutType,
  WorkoutIntensity,
  SportType,
  HybridFormat,
  AdHocInputType,
  AdHocWorkoutStatus,
} from '@prisma/client'

// ============================================
// PARSED WORKOUT TYPES
// ============================================

/**
 * Result of parsing any workout input (text, voice, image, external)
 */
export interface ParsedWorkout {
  /** Primary workout type classification */
  type: ParsedWorkoutType
  /** AI confidence in the parsing (0-1) */
  confidence: number
  /** Optional workout name */
  name?: string
  /** Duration in minutes */
  duration?: number
  /** Distance in kilometers */
  distance?: number
  /** Workout intensity level */
  intensity?: WorkoutIntensity

  // Cardio-specific fields
  /** Sport type for cardio workouts */
  sport?: SportType
  /** Structured cardio segments */
  cardioSegments?: ParsedCardioSegment[]
  /** Average heart rate (bpm) */
  avgHeartRate?: number
  /** Max heart rate (bpm) */
  maxHeartRate?: number
  /** Average pace (sec/km) */
  avgPace?: number
  /** Elevation gain (meters) */
  elevationGain?: number

  // Strength-specific fields
  /** Parsed strength exercises */
  strengthExercises?: ParsedStrengthExercise[]

  // Hybrid/functional fitness fields
  /** Hybrid workout format (AMRAP, FOR_TIME, etc.) */
  hybridFormat?: HybridFormat
  /** Time cap in seconds */
  timeCap?: number
  /** Rep scheme (e.g., "21-15-9") */
  repScheme?: string
  /** Parsed hybrid movements */
  movements?: ParsedHybridMovement[]

  // Subjective/notes
  /** Perceived effort (1-10 RPE) */
  perceivedEffort?: number
  /** How the athlete felt */
  feeling?: 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'EXHAUSTED'
  /** Additional notes from the input */
  notes?: string

  // AI interpretation metadata
  /** Raw AI explanation of what it parsed */
  rawInterpretation: string
  /** Any warnings or ambiguities detected */
  warnings?: string[]
}

/**
 * Simplified workout type for parsing classification
 */
export type ParsedWorkoutType = 'CARDIO' | 'STRENGTH' | 'HYBRID' | 'MIXED'

/**
 * A single cardio segment (warmup, interval, cooldown, etc.)
 */
export interface ParsedCardioSegment {
  /** Segment type */
  type: 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'
  /** Duration in seconds */
  duration?: number
  /** Distance in meters */
  distance?: number
  /** Pace string (e.g., "5:00/km") */
  pace?: string
  /** Training zone (1-5) */
  zone?: number
  /** Target heart rate (bpm) */
  targetHR?: number
  /** Segment notes */
  notes?: string
}

/**
 * A strength exercise parsed from input
 */
export interface ParsedStrengthExercise {
  /** Matched exercise ID from library (if found) */
  exerciseId?: string
  /** Original exercise name from input */
  exerciseName: string
  /** Confidence of exercise matching (0-1) */
  matchConfidence?: number
  /** Alternative exercise matches */
  alternatives?: ExerciseMatch[]
  /** Number of sets */
  sets: number
  /** Number of reps (can be range like "8-12") */
  reps: number | string
  /** Weight used (kg) */
  weight?: number
  /** Weight as string if not numeric (e.g., "BW", "50% 1RM") */
  weightString?: string
  /** Rest between sets (seconds) */
  rest?: number
  /** RPE for this exercise */
  rpe?: number
  /** Notes for this exercise */
  notes?: string
  /** Whether this is a custom/unmatched exercise */
  isCustom: boolean
}

/**
 * An exercise match from the library
 */
export interface ExerciseMatch {
  /** Exercise ID (null if no match found) */
  id: string | null
  /** Exercise name */
  name: string
  /** Match confidence (0-1) */
  confidence: number
}

/**
 * A movement in a hybrid/functional workout
 */
export interface ParsedHybridMovement {
  /** Movement order */
  order: number
  /** Matched exercise ID (if found) */
  exerciseId?: string
  /** Movement name from input */
  name: string
  /** Match confidence (0-1) */
  matchConfidence?: number
  /** Reps per round */
  reps?: number
  /** Duration in seconds (for timed movements) */
  duration?: number
  /** Distance in meters (for runs, rows, etc.) */
  distance?: number
  /** Calories (for machines) */
  calories?: number
  /** Weight/load */
  weight?: number
  /** Weight unit (kg, lb) */
  weightUnit?: 'kg' | 'lb'
  /** Movement notes */
  notes?: string
  /** Whether this is unmatched */
  isCustom: boolean
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Request to create a new ad-hoc workout
 */
export interface CreateAdHocWorkoutRequest {
  /** Input method used */
  inputType: AdHocInputType
  /** When the workout was performed */
  workoutDate: string | Date
  /** Optional workout name */
  workoutName?: string
  /** File URL for photo/voice (from upload) */
  rawInputUrl?: string
  /** Text content for TEXT input */
  rawInputText?: string
  /** Metadata for external imports */
  rawInputMetadata?: ExternalImportMetadata
}

/**
 * Metadata for external service imports
 */
export interface ExternalImportMetadata {
  /** Source service */
  source: 'strava' | 'garmin' | 'concept2'
  /** Activity ID from the source */
  activityId: string
  /** Original activity data */
  activityData: Record<string, unknown>
}

/**
 * Request to confirm/save a parsed workout
 */
export interface ConfirmAdHocWorkoutRequest {
  /** The ad-hoc workout ID */
  adHocWorkoutId: string
  /** Final parsed structure (possibly edited by athlete) */
  parsedStructure: ParsedWorkout
  /** Additional subjective data */
  perceivedEffort?: number
  feeling?: 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'EXHAUSTED'
  notes?: string
}

// ============================================
// EXTERNAL IMPORT TYPES
// ============================================

/**
 * Strava activity data for import
 */
export interface StravaActivityImport {
  id: string
  name: string
  type: string
  startDate: string
  distance: number // meters
  movingTime: number // seconds
  elapsedTime: number // seconds
  elevationGain: number // meters
  averageSpeed: number // m/s
  maxSpeed: number // m/s
  averageHeartrate?: number
  maxHeartrate?: number
  averageWatts?: number
  kilojoules?: number
  calories?: number
}

/**
 * Garmin activity data for import
 */
export interface GarminActivityImport {
  activityId: string
  activityName: string
  activityType: string
  startTimeLocal: string
  duration: number // seconds
  distance: number // meters
  elevationGain: number // meters
  averageHR?: number
  maxHR?: number
  averageSpeed?: number // m/s
  calories?: number
  trainingEffect?: number
  anaerobicEffect?: number
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * API response for ad-hoc workout operations
 */
export interface AdHocWorkoutResponse {
  success: boolean
  data?: {
    id: string
    status: AdHocWorkoutStatus
    parsedStructure?: ParsedWorkout
    createdWorkoutId?: string
    trainingLoadId?: string
  }
  error?: string
}

/**
 * API response for listing ad-hoc workouts
 */
export interface AdHocWorkoutListResponse {
  success: boolean
  data?: {
    workouts: AdHocWorkoutSummary[]
    total: number
    hasMore: boolean
  }
  error?: string
}

/**
 * Summary of an ad-hoc workout for list views
 */
export interface AdHocWorkoutSummary {
  id: string
  inputType: AdHocInputType
  workoutDate: string
  workoutName?: string
  status: AdHocWorkoutStatus
  parsedType?: WorkoutType
  duration?: number
  distance?: number
  confidence?: number
  createdAt: string
}

// ============================================
// PARSER CONFIGURATION
// ============================================

/**
 * Configuration for the workout parser
 */
export interface ParserConfig {
  /** AI model to use for parsing */
  modelId: string
  /** Provider of the AI model */
  provider: 'anthropic' | 'google' | 'openai'
  /** API model identifier */
  apiModelId: string
  /** Maximum tokens for response */
  maxTokens?: number
  /** Temperature for generation */
  temperature?: number
}

/**
 * Exercise library entry for matching
 */
export interface ExerciseLibraryEntry {
  id: string
  name: string
  nameSv?: string
  nameEn?: string
  category: WorkoutType
  muscleGroup?: string
  equipment?: string
  aliases?: string[]
}

// ============================================
// UI COMPONENT PROPS
// ============================================

/**
 * Props for the workout review component
 */
export interface WorkoutReviewProps {
  adHocWorkoutId: string
  parsedWorkout: ParsedWorkout
  onConfirm: (data: ConfirmAdHocWorkoutRequest) => Promise<void>
  onEdit: (updates: Partial<ParsedWorkout>) => void
  onCancel: () => void
  isSubmitting: boolean
}

/**
 * Props for input method components
 */
export interface InputMethodProps {
  onCapture: (data: CreateAdHocWorkoutRequest) => Promise<void>
  isProcessing: boolean
}

/**
 * Exercise match suggestion for UI
 */
export interface ExerciseMatchSuggestion {
  exercise: ExerciseLibraryEntry
  confidence: number
  reason: string
}
