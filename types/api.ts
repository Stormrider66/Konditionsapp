/**
 * Shared API Type Definitions
 *
 * Provides strict TypeScript interfaces for API requests, responses,
 * and common data structures to replace `any` usage across the codebase.
 */

import type { Gender, WorkoutType, WorkoutIntensity, SportType } from '@prisma/client'

// ==================== PAGINATION ====================

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ==================== WORKOUT TYPES ====================

export interface WorkoutSegment {
  id?: string
  order: number
  type: 'warmup' | 'main' | 'cooldown' | 'interval' | 'rest' | 'recovery'
  duration?: number // seconds
  distance?: number // meters
  pace?: number // seconds per km
  heartRateZone?: number // 1-5
  power?: number // watts
  cadence?: number
  description?: string
  sets?: number
  reps?: number
  restBetweenSets?: number // seconds
}

export interface WorkoutData {
  name: string
  type: WorkoutType
  intensity: WorkoutIntensity
  description?: string
  segments: WorkoutSegment[]
  totalDuration?: number // seconds
  totalDistance?: number // meters
  targetHeartRate?: {
    min: number
    max: number
  }
  notes?: string
}

export interface WorkoutLogEntry {
  workoutId: string
  completedAt: Date
  duration: number // actual duration in seconds
  distance?: number // actual distance in meters
  averageHeartRate?: number
  maxHeartRate?: number
  averagePower?: number
  calories?: number
  rpe?: number // 1-10
  notes?: string
  segments?: WorkoutSegmentLog[]
}

export interface WorkoutSegmentLog {
  segmentId: string
  completed: boolean
  actualDuration?: number
  actualDistance?: number
  actualPace?: number
  actualHeartRate?: number
  notes?: string
}

// ==================== METHODOLOGY TYPES ====================

export type MethodologyType = 'POLARIZED' | 'NORWEGIAN' | 'CANOVA' | 'PYRAMIDAL'

export interface MethodologyConfig {
  type: MethodologyType
  weeklyHoursTarget?: number
  intensityDistribution: {
    zone1: number // percentage
    zone2: number
    zone3: number
    zone4: number
    zone5: number
  }
  keyWorkouts: {
    longRun: boolean
    tempo: boolean
    intervals: boolean
    threshold: boolean
    recovery: boolean
  }
  periodizationPhase?: 'base' | 'build' | 'peak' | 'taper'
}

// ==================== TEST TYPES ====================

export interface TestStage {
  sequence: number
  duration: number // minutes
  speed?: number // km/h (running)
  power?: number // watts (cycling)
  pace?: number // min/km (skiing)
  incline?: number // percent
  heartRate?: number
  lactate?: number
  vo2?: number
  rpe?: number
}

export interface TestResult {
  id: string
  testDate: Date
  testType: 'RUNNING' | 'CYCLING' | 'SKIING'
  stages: TestStage[]
  calculatedThresholds?: {
    aerobicThreshold?: ThresholdValue
    anaerobicThreshold?: ThresholdValue
    vo2max?: number
    maxHeartRate?: number
  }
}

export interface ThresholdValue {
  heartRate?: number
  pace?: number // min/km
  speed?: number // km/h
  power?: number // watts
  lactate?: number // mmol/L
}

// ==================== TRAINING ZONE TYPES ====================

export interface TrainingZone {
  zone: number // 1-5
  name: string
  description: string
  heartRateMin?: number
  heartRateMax?: number
  paceMin?: number // min/km
  paceMax?: number // min/km
  powerMin?: number // watts
  powerMax?: number // watts
}

export interface TrainingZoneSet {
  id: string
  name: string
  basedOn: 'heartRate' | 'pace' | 'power'
  zones: TrainingZone[]
  createdAt: Date
  testId?: string
}

// ==================== ATHLETE TYPES ====================

export interface AthleteProfile {
  id: string
  name: string
  email?: string
  gender: Gender
  birthDate: Date
  height: number // cm
  weight: number // kg
  primarySport?: SportType
  maxHeartRate?: number
  restingHeartRate?: number
  vo2max?: number
  thresholdPace?: number // min/km
  thresholdPower?: number // watts
}

export interface AthleteStats {
  weeklyDistance?: number
  weeklyDuration?: number
  weeklyWorkouts?: number
  monthlyDistance?: number
  monthlyDuration?: number
  monthlyWorkouts?: number
  averageRPE?: number
  trainingLoad?: number
  acuteLoad?: number
  chronicLoad?: number
  acwr?: number // Acute Chronic Workload Ratio
}

// ==================== NOTIFICATION TYPES ====================

export interface NotificationPreferences {
  email: boolean
  push: boolean
  workoutReminders: boolean
  weeklyDigest?: boolean
  achievementAlerts?: boolean
  coachMessages?: boolean
}

// ==================== AI/AGENT TYPES ====================

export interface AgentDecision {
  id: string
  type: string
  reasoning: string
  confidence: number // 0-1
  proposedAction: Record<string, unknown>
  context: AgentContext
}

export interface AgentContext {
  athleteState: {
    fatigue: number // 0-10
    readiness: number // 0-10
    stress: number // 0-10
    sleep?: number // hours
    mood?: number // 1-5
  }
  trainingState: {
    currentPhase: string
    weeklyLoad: number
    acwr: number
    daysToEvent?: number
  }
  restrictions?: {
    bodyPart?: string
    maxIntensity?: number
    avoidExercises?: string[]
  }[]
}

export interface AIGeneratedContent {
  type: 'workout' | 'program' | 'analysis' | 'recommendation'
  content: Record<string, unknown>
  model: string
  tokensUsed: number
  generatedAt: Date
}

// ==================== CALENDAR TYPES ====================

export interface CalendarEventData {
  id?: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  allDay: boolean
  type: string
  trainingImpact?: 'NO_TRAINING' | 'REDUCED' | 'MODIFIED' | 'NORMAL'
  color?: string
  isReadOnly?: boolean
  externalCalendarId?: string
}

// ==================== ERROR TYPES ====================

export interface ApiError {
  success: false
  error: string
  code?: string
  details?: unknown
}

export interface ApiSuccess<T = unknown> {
  success: true
  data?: T
  message?: string
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ==================== REQUEST TYPES ====================

export interface AuthenticatedRequest {
  userId: string
  userRole: 'COACH' | 'ATHLETE' | 'ADMIN' | 'PHYSIO'
  userEmail: string
}

export interface CoachAuthenticatedRequest extends AuthenticatedRequest {
  userRole: 'COACH' | 'ADMIN'
}

export interface AthleteAuthenticatedRequest extends AuthenticatedRequest {
  userRole: 'ATHLETE'
  clientId: string
}

// ==================== EXPORT/IMPORT TYPES ====================

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf'
  dateRange?: {
    start: Date
    end: Date
  }
  includeWorkouts?: boolean
  includeTests?: boolean
  includeMetrics?: boolean
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}
