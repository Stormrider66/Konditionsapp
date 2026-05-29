// types/agility.ts

import type { SportType } from './core'

// ==================== AGILITY STUDIO SYSTEM ====================

export type AgilityDrillCategory =
  | 'COD'
  | 'REACTIVE_AGILITY'
  | 'SPEED_ACCELERATION'
  | 'PLYOMETRICS'
  | 'FOOTWORK'
  | 'BALANCE'

export type AgilityWorkoutFormat =
  | 'CIRCUIT'
  | 'STATION_ROTATION'
  | 'INTERVAL'
  | 'PROGRESSIVE'
  | 'REACTIVE'
  | 'TESTING'

export type DevelopmentStage =
  | 'FUNDAMENTALS'        // Ages 6-9
  | 'LEARNING_TO_TRAIN'   // Ages 9-12
  | 'TRAINING_TO_TRAIN'   // Ages 12-16
  | 'TRAINING_TO_COMPETE' // Ages 16-18+
  | 'TRAINING_TO_WIN'     // Ages 18+
  | 'ELITE'               // Professional

export type TimingGateSource =
  | 'CSV_IMPORT'
  | 'VALD_API'
  | 'BROWER'
  | 'FREELAP'
  | 'WITTY'
  | 'MANUAL'

export interface AgilityDrill {
  id: string
  name: string
  nameSv?: string | null
  description?: string | null
  descriptionSv?: string | null
  category: AgilityDrillCategory
  requiredEquipment: string[]
  optionalEquipment: string[]
  distanceMeters?: number | null
  durationSeconds?: number | null
  defaultReps?: number | null
  defaultSets?: number | null
  restSeconds?: number | null
  minDevelopmentStage: DevelopmentStage
  maxDevelopmentStage: DevelopmentStage
  primarySports: SportType[]
  difficultyLevel: number
  videoUrl?: string | null
  animationUrl?: string | null
  diagramUrl?: string | null
  setupInstructions?: string | null
  executionCues: string[]
  progressionDrillId?: string | null
  regressionDrillId?: string | null
  coachId?: string | null
  isSystemDrill: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AgilityWorkout {
  id: string
  name: string
  description?: string | null
  format: AgilityWorkoutFormat
  totalDuration?: number | null
  restBetweenDrills?: number | null
  developmentStage?: DevelopmentStage | null
  targetSports: SportType[]
  primaryFocus?: AgilityDrillCategory | null
  coachId: string
  teamId?: string | null
  trainingYear?: number | null
  isTemplate: boolean
  isPublic: boolean
  tags: string[]
  drills?: AgilityWorkoutDrill[]
  createdAt: Date
  updatedAt: Date
  _count?: {
    assignments: number
    results: number
  }
}

export interface AgilityWorkoutDrill {
  id: string
  workoutId: string
  drillId: string
  order: number
  sectionType: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  sets?: number | null
  reps?: number | null
  duration?: number | null
  restSeconds?: number | null
  notes?: string | null
  drill?: AgilityDrill
  createdAt: Date
}

export interface AgilityWorkoutAssignment {
  id: string
  workoutId: string
  athleteId: string
  assignedDate: Date
  assignedBy: string
  notes?: string | null
  status: string
  startedAt?: Date | null
  completedAt?: Date | null
  teamBroadcastId?: string | null
  workout?: AgilityWorkout
  athlete?: {
    id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface AgilityWorkoutResult {
  id: string
  workoutId: string
  athleteId: string
  completedAt: Date
  totalDuration?: number | null
  perceivedEffort?: number | null
  notes?: string | null
  drillResults?: AgilityDrillResult[] | null
  workout?: AgilityWorkout
  athlete?: {
    id: string
    name: string
  }
  createdAt: Date
}

export interface AgilityDrillResult {
  drillId: string
  completed: boolean
  timeSeconds?: number | null
  notes?: string | null
}

export interface TimingGateSession {
  id: string
  coachId: string
  sessionDate: Date
  sessionName?: string | null
  importSource: TimingGateSource
  importedAt?: Date | null
  rawDataUrl?: string | null
  gateCount?: number | null
  intervalDistances: number[]
  locationId?: string | null
  notes?: string | null
  results?: TimingGateResult[]
  createdAt: Date
  updatedAt: Date
}

export interface TimingGateResult {
  id: string
  sessionId: string
  athleteId?: string | null
  unmatchedAthleteName?: string | null
  unmatchedAthleteId?: string | null
  testProtocol?: string | null
  attemptNumber: number
  splitTimes: number[]
  totalTime: number
  acceleration?: number | null
  maxVelocity?: number | null
  codDeficit?: number | null
  valid: boolean
  invalidReason?: string | null
  notes?: string | null
  athlete?: {
    id: string
    name: string
  } | null
  createdAt: Date
}

// DTOs for Agility Studio

export interface CreateAgilityDrillDTO {
  name: string
  nameSv?: string
  description?: string
  descriptionSv?: string
  category: AgilityDrillCategory
  requiredEquipment?: string[]
  optionalEquipment?: string[]
  distanceMeters?: number
  durationSeconds?: number
  defaultReps?: number
  defaultSets?: number
  restSeconds?: number
  minDevelopmentStage?: DevelopmentStage
  maxDevelopmentStage?: DevelopmentStage
  primarySports?: SportType[]
  difficultyLevel?: number
  videoUrl?: string
  animationUrl?: string
  diagramUrl?: string
  setupInstructions?: string
  executionCues?: string[]
}

export interface CreateAgilityWorkoutDTO {
  name: string
  description?: string
  format: AgilityWorkoutFormat
  totalDuration?: number
  restBetweenDrills?: number
  developmentStage?: DevelopmentStage
  targetSports?: SportType[]
  primaryFocus?: AgilityDrillCategory
  isTemplate?: boolean
  isPublic?: boolean
  tags?: string[]
  drills: CreateAgilityWorkoutDrillDTO[]
}

export interface CreateAgilityWorkoutDrillDTO {
  drillId: string
  order: number
  sectionType?: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  sets?: number
  reps?: number
  duration?: number
  restSeconds?: number
  notes?: string
}

export interface AssignAgilityWorkoutDTO {
  athleteIds: string[]
  assignedDate: string
  notes?: string
}

export interface SubmitAgilityWorkoutResultDTO {
  totalDuration?: number
  perceivedEffort?: number
  notes?: string
  drillResults?: AgilityDrillResult[]
}

export interface CreateTimingGateSessionDTO {
  sessionDate: string
  sessionName?: string
  importSource: TimingGateSource
  gateCount?: number
  intervalDistances?: number[]
  locationId?: string
  notes?: string
}

export interface CreateTimingGateResultDTO {
  athleteId?: string
  unmatchedAthleteName?: string
  testProtocol?: string
  attemptNumber?: number
  splitTimes: number[]
  totalTime: number
  acceleration?: number
  maxVelocity?: number
  codDeficit?: number
  valid?: boolean
  invalidReason?: string
  notes?: string
}
