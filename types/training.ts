// types/training.ts

import type {
  PeriodPhase,
  SubscriptionStatus,
  SubscriptionTier,
  WorkoutIntensity,
  WorkoutType,
} from './core'
import type { Client, Test, User } from './testing'

// ==================== SUBSCRIPTION & BILLING ====================

export interface Subscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  maxAthletes: number
  currentAthletes: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  stripeCurrentPeriodEnd?: Date
  trialEndsAt?: Date
  cancelAt?: Date
  createdAt: Date
  updatedAt: Date
}

// ==================== ATHLETE ACCOUNTS ====================

export interface AthleteAccount {
  id: string
  clientId: string
  userId: string
  notificationPrefs?: {
    email: boolean
    push: boolean
    workoutReminders: boolean
  }
  createdAt: Date
  updatedAt: Date
  client?: Client
  user?: User
}

export interface CreateAthleteAccountDTO {
  clientId: string
  email: string
  temporaryPassword?: string
  notificationPrefs?: {
    email: boolean
    push: boolean
    workoutReminders: boolean
  }
}

// ==================== TRAINING PROGRAMS ====================

export interface TrainingProgram {
  id: string
  clientId: string
  coachId: string
  testId?: string
  name: string
  description?: string
  goalRace?: string
  goalDate?: Date
  goalType?: string
  startDate: Date
  endDate: Date
  isActive: boolean
  isTemplate: boolean
  generatedFromTest: boolean
  planningMetadata?: unknown
  createdAt: Date
  updatedAt: Date
  client?: Client
  coach?: User
  test?: Test
  weeks?: TrainingWeek[]
}

export interface TrainingWeek {
  id: string
  programId: string
  weekNumber: number
  startDate: Date
  endDate: Date
  phase: PeriodPhase
  focus?: string
  weeklyVolume?: number
  notes?: string
  program?: TrainingProgram
  days?: TrainingDay[]
}

export interface TrainingDay {
  id: string
  weekId: string
  dayNumber: number
  date: Date
  notes?: string
  week?: TrainingWeek
  workouts?: Workout[]
}

export interface Workout {
  id: string
  dayId: string
  type: WorkoutType
  name: string
  description?: string
  intensity: WorkoutIntensity
  duration?: number
  distance?: number
  instructions?: string
  coachNotes?: string
  order: number
  isCustom: boolean
  day?: TrainingDay
  segments?: WorkoutSegment[]
  logs?: WorkoutLog[]
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutSegment {
  id: string
  workoutId: string
  order: number
  type: 'warmup' | 'interval' | 'cooldown' | 'exercise' | 'rest' | 'work'
  // Running/Cycling
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  heartRate?: string
  power?: number
  reps?: number
  // Strength/Plyo/Core
  exerciseId?: string
  sets?: number
  repsCount?: string
  weight?: string
  tempo?: string
  rest?: number
  // General
  description?: string
  notes?: string
  workout?: Workout
  exercise?: Exercise
  createdAt: Date
}

export interface Exercise {
  id: string
  coachId?: string
  name: string
  category: WorkoutType
  muscleGroup?: string
  description?: string
  instructions?: string
  videoUrl?: string
  equipment?: string
  difficulty?: string
  isPublic: boolean
  nameSv?: string
  nameEn?: string
  coach?: User
  createdAt: Date
  updatedAt: Date
}

export interface WorkoutLog {
  id: string
  workoutId: string
  athleteId: string
  completed: boolean
  completedAt?: Date
  // Actual values
  duration?: number
  distance?: number
  avgPace?: string
  avgHR?: number
  maxHR?: number
  // Subjective feedback
  perceivedEffort?: number
  difficulty?: number
  feeling?: string
  notes?: string
  dataFileUrl?: string
  stravaUrl?: string
  coachFeedback?: string
  coachViewedAt?: Date
  workout?: Workout
  athlete?: User
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  subject?: string
  content: string
  workoutId?: string
  isRead: boolean
  readAt?: Date
  sender?: User
  receiver?: User
  workout?: Workout
  createdAt: Date
}

// ==================== DTOs for Training Programs ====================

export interface CreateTrainingProgramDTO {
  clientId: string
  coachId: string
  testId?: string
  name: string
  description?: string
  goalType?: string
  startDate: Date
  endDate: Date
  notes?: string
  planningMetadata?: unknown
  weeks?: CreateTrainingWeekDTO[]
}

export interface CreateTrainingWeekDTO {
  weekNumber: number
  startDate?: Date
  phase: PeriodPhase
  volume: number
  focus?: string
  days: CreateTrainingDayDTO[]
}

export interface CreateTrainingDayDTO {
  dayNumber: number
  notes?: string
  workouts: CreateWorkoutDTO[]
}

// ProgramGenerationParams is now defined in @/lib/program-generator/index.ts
// Import from there to use the correct interface

export interface CreateWorkoutDTO {
  type: WorkoutType
  name: string
  description?: string
  intensity: WorkoutIntensity
  duration?: number
  distance?: number
  instructions?: string
  segments: CreateWorkoutSegmentDTO[]
}

export interface CreateWorkoutSegmentDTO {
  order: number
  type: 'warmup' | 'interval' | 'cooldown' | 'exercise' | 'rest' | 'work'
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  heartRate?: string
  power?: number
  reps?: number
  exerciseId?: string
  sets?: number
  repsCount?: string
  weight?: string
  tempo?: string
  rest?: number
  description?: string
  notes?: string
}

export interface WorkoutLogDTO {
  workoutId: string
  completed: boolean
  completedAt?: string
  duration?: number
  distance?: number
  avgPace?: string
  avgHR?: number
  maxHR?: number
  perceivedEffort?: number
  difficulty?: number
  feeling?: string
  notes?: string
}

export interface CreateExerciseDTO {
  name: string
  category: WorkoutType
  muscleGroup?: string
  description?: string
  instructions?: string
  videoUrl?: string
  equipment?: string
  difficulty?: string
  nameSv?: string
  nameEn?: string
}

export interface CreateMessageDTO {
  receiverId: string
  subject?: string
  content: string
  workoutId?: string
}

// ==================== Hybrid Workout Section Types ====================

export type HybridFormat = 'AMRAP' | 'FOR_TIME' | 'EMOM' | 'TABATA' | 'CHIPPER' | 'LADDER' | 'INTERVALS' | 'HYROX_SIM' | 'CUSTOM'
export type ScalingLevel = 'RX' | 'SCALED' | 'FOUNDATIONS' | 'CUSTOM'
export type HybridSectionType = 'WARMUP' | 'STRENGTH' | 'METCON' | 'COOLDOWN'

export interface HybridSectionMovement {
  exerciseId: string
  exerciseName: string
  order: number
  sets?: number
  reps?: number
  duration?: number  // seconds
  distance?: number  // meters
  weightMale?: number
  weightFemale?: number
  restSeconds?: number
  notes?: string
}

export interface HybridSectionData {
  notes?: string
  duration?: number  // expected section duration in seconds
  movements?: HybridSectionMovement[]
}

export type HybridMetconBlockFormat = 'EMOM' | 'AMRAP' | 'FOR_TIME' | 'INTERVALS' | 'CUSTOM'

export interface HybridMetconBlockMovement {
  id?: string
  exerciseId: string
  exerciseName: string
  order: number
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weightMale?: number
  weightFemale?: number
  notes?: string
}

export interface HybridMetconBlock {
  id: string
  title: string
  format: HybridMetconBlockFormat
  intervalSeconds?: number
  rounds?: number
  workSeconds?: number
  restSeconds?: number
  restAfterSeconds?: number
  notes?: string
  movements: HybridMetconBlockMovement[]
}

export interface HybridMetconData {
  blocks: HybridMetconBlock[]
}

export interface HybridWorkoutWithSections {
  id: string
  name: string
  description?: string
  format: HybridFormat
  timeCap?: number
  workTime?: number
  restTime?: number
  totalRounds?: number
  totalMinutes?: number
  repScheme?: string
  scalingLevel: ScalingLevel
  isBenchmark: boolean
  benchmarkSource?: string
  teamId?: string | null
  trainingYear?: number | null
  tags: string[]
  coachId?: string
  isPublic: boolean
  // Section data
  warmupData?: HybridSectionData
  strengthData?: HybridSectionData
  metconData?: HybridMetconData
  cooldownData?: HybridSectionData
  // Metcon movements (existing)
  movements: HybridMovementData[]
  // Stats
  _count?: {
    results: number
  }
  // Versioning
  version?: number
  versionNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface HybridMovementData {
  id: string
  order: number
  roundNumber?: number | null
  setNumber?: number | null
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weightMale?: number
  weightFemale?: number
  exercise: {
    id: string
    name: string
    nameSv?: string
    nameEn?: string | null
    standardAbbreviation?: string
    equipmentTypes: string[]
    // Icon fields
    iconUrl?: string | null
    iconCategory?: string | null
    movementCategory?: string | null
  }
}

// ============================================
// STRENGTH SESSION TYPES
// ============================================

/**
 * How to interpret the `weight` value(s) on an exercise / follow-up /
 * set row.
 *   - 'kg' (default): absolute kilograms.
 *   - 'percent': percent of the assigned athlete's 1RM for the
 *     exerciseId. The runner resolves to kg per athlete at run time.
 */
export type StrengthWeightUnit = 'kg' | 'percent'

export interface StrengthSessionFollowUp {
  exerciseId: string
  exerciseName: string
  reps: number | string
  weight?: number
  weightUnit?: StrengthWeightUnit
  restBeforeSeconds?: number
  notes?: string
}

export type StrengthExerciseKind = 'strength' | 'cardio'

export type StrengthIntensity = 'EASY' | 'MODERATE' | 'HARD' | 'INTERVAL'

/**
 * Per-set override. When `setRows` is present on an exercise, the
 * runner uses `setRows[setNumber-1]` for the current round's prescribed
 * reps/weight instead of the flat `reps`/`weight` fields. Used for
 * pyramid loading and other varied-load schemes.
 *
 * `weight` is interpreted by the parent exercise's `weightUnit`.
 */
export interface StrengthSetRow {
  reps: number | string
  weight?: number
}

export interface StrengthSessionExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number
  weight?: number
  weightUnit?: StrengthWeightUnit
  restSeconds?: number
  notes?: string
  followUps?: StrengthSessionFollowUp[]
  /**
   * Discriminator. `'cardio'` swaps the runner / builder UI to use
   * duration / distance / intensity instead of sets × reps × weight.
   * Defaults to `'strength'` when undefined.
   */
  kind?: StrengthExerciseKind
  durationSeconds?: number
  distanceMeters?: number
  intensity?: StrengthIntensity | string
  /**
   * Per-set prescriptions. When present, length should equal `sets`.
   * Each entry overrides the flat `reps`/`weight` for that set.
   */
  setRows?: StrengthSetRow[]
}

export interface StrengthSessionSectionExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | string
  restSeconds?: number
  duration?: number
  notes?: string
}

export interface StrengthSessionSectionData {
  notes?: string
  duration?: number
  exercises?: StrengthSessionSectionExercise[]
}

export interface StrengthSessionData {
  id?: string
  name: string
  description?: string
  phase: string
  timingRelativeToRun?: string
  exercises: StrengthSessionExercise[]
  warmupData?: StrengthSessionSectionData
  prehabData?: StrengthSessionSectionData
  coreData?: StrengthSessionSectionData
  cooldownData?: StrengthSessionSectionData
  totalSets?: number
  totalExercises?: number
  estimatedDuration?: number
  volumeLoad?: number
  teamId?: string | null
  trainingYear?: number | null
  tags?: string[]
  coachId?: string
  isPublic?: boolean
  createdAt?: Date
  updatedAt?: Date
  _count?: {
    assignments: number
  }
}

export interface StrengthSessionAssignmentData {
  id: string
  sessionId: string
  athleteId: string
  assignedDate: Date
  assignedBy: string
  notes?: string
  status: string
  completedAt?: Date
  actualExercises?: StrengthSessionExercise[]
  rpe?: number
  duration?: number
  session?: StrengthSessionData
  athlete?: {
    id: string
    name: string
  }
}

// ============================================
// CARDIO SESSION TYPES
// ============================================

export type CardioSegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS' | 'CORE' | 'PREHAB' | 'PLYOMETRIC'

export interface CardioSegment {
  id: string
  type: CardioSegmentType
  duration?: number // seconds
  distance?: number // meters
  pace?: string
  zone?: number
  notes?: string
  exercises?: Array<{
    id?: string
    exerciseId: string
    name: string
    sets?: number
    reps?: string
    restSeconds?: number
    notes?: string
  }>
}

export interface CardioSessionData {
  id: string
  name: string
  description?: string
  sport: string
  segments: CardioSegment[]
  totalDuration?: number // seconds
  totalDistance?: number // meters
  avgZone?: number
  teamId?: string | null
  trainingYear?: number | null
  tags: string[]
  coachId: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignments: number
  }
}

export interface CardioSessionAssignmentData {
  id: string
  sessionId: string
  athleteId: string
  assignedDate: Date
  assignedBy: string
  notes?: string
  status: string
  completedAt?: Date
  actualDuration?: number
  actualDistance?: number
  avgHeartRate?: number
  actualSegments?: CardioSegment[]
  session?: CardioSessionData
  athlete?: {
    id: string
    name: string
  }
}

// ============================================
// Session Assignment Types (Shared)
// ============================================

/**
 * Generic session assignment for UI display
 * Used across Cardio, Strength, and Hybrid sessions
 */
export interface SessionAssignment {
  id: string
  athleteId: string
  assignedDate: string
  status: string
  completedAt?: string
  athlete?: {
    id: string
    name: string
  }
}

// ============================================
// Hybrid Workout Result Types
// ============================================

/**
 * Hybrid workout result for leaderboard and history display
 */
export interface HybridWorkoutResult {
  id: string
  athleteId: string
  scoreType: string
  timeScore?: number
  roundsCompleted?: number
  repsCompleted?: number
  scalingLevel: string
  completedAt: string
  isPR: boolean
  athlete?: {
    id: string
    name: string
  }
}
