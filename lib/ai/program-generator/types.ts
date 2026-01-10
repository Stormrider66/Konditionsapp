/**
 * Multi-Part Program Generation Types
 *
 * Types for the automatic phase-by-phase program generation system.
 */

import type { ProgramGenerationStatus } from '@prisma/client'

// ============================================
// Phase Configuration
// ============================================

export interface PhaseConfig {
  phaseNumber: number
  name: string
  weeks: string // "1-4", "5-8", etc.
  startWeek: number
  endWeek: number
  focus: string
  keyWorkouts?: string[]
  volumeGuidance?: string
}

export interface ProgramOutline {
  programName: string
  description?: string
  methodology: string
  totalWeeks: number
  phases: PhaseConfig[]
}

// ============================================
// Generation Context
// ============================================

export interface GenerationContext {
  // From wizard
  sport: string
  totalWeeks: number
  sessionsPerWeek?: number
  methodology?: string
  goal?: string
  goalDate?: string

  // Athlete info
  athleteId?: string
  athleteName?: string
  athleteAge?: number
  athleteWeight?: number
  athleteHeight?: number
  experienceLevel?: string

  // Test data
  vo2max?: number
  maxHR?: number
  lactateThreshold?: {
    hr?: number
    pace?: string
    power?: number
  }
  trainingZones?: Array<{
    zone: number
    minHR?: number
    maxHR?: number
    minPace?: string
    maxPace?: string
  }>

  // Additional context
  raceResults?: Array<{
    name: string
    distance: string
    time: string
    date: string
  }>
  injuries?: Array<{
    type: string
    status: string
    notes?: string
  }>
  notes?: string
}

// ============================================
// Generated Phase Data
// ============================================

export interface WorkoutSegment {
  order: number
  type: 'warmup' | 'work' | 'interval' | 'cooldown' | 'rest' | 'exercise'
  duration?: number
  distance?: number
  pace?: string
  zone?: number
  heartRate?: { min?: number; max?: number }
  power?: number
  reps?: number
  sets?: number
  weight?: number
  tempo?: string
  rest?: number
}

export interface DayWorkout {
  type: string // 'REST' | 'RUNNING' | 'CYCLING' | etc.
  name?: string
  duration?: number
  distance?: number
  zone?: number
  intensity?: string
  description: string
  segments?: WorkoutSegment[]
}

export interface WeeklyTemplate {
  monday?: DayWorkout
  tuesday?: DayWorkout
  wednesday?: DayWorkout
  thursday?: DayWorkout
  friday?: DayWorkout
  saturday?: DayWorkout
  sunday?: DayWorkout
}

export interface GeneratedPhase {
  phaseNumber: number
  name: string
  weeks: string
  focus: string
  weeklyTemplate: WeeklyTemplate
  volumeGuidance?: string
  keyWorkouts?: string[]
  notes?: string
}

// ============================================
// Merged Program
// ============================================

export interface MergedProgram {
  name: string
  description: string
  totalWeeks: number
  methodology?: string
  weeklySchedule?: {
    sessionsPerWeek: number
    restDays: string[]
  }
  phases: GeneratedPhase[]
}

// ============================================
// Progress Events (SSE)
// ============================================

export type ProgressEventType = 'outline' | 'phase' | 'merge' | 'complete' | 'error' | 'ping'

export interface ProgressEvent {
  type: ProgressEventType
  sessionId: string
  status: ProgramGenerationStatus
  currentPhase: number
  totalPhases: number
  progressPercent: number
  progressMessage: string
  timestamp: string
  // Optional data based on type
  outline?: ProgramOutline
  phaseData?: GeneratedPhase
  program?: MergedProgram
  error?: string
}

// ============================================
// Session State
// ============================================

export interface GenerationSessionState {
  id: string
  status: ProgramGenerationStatus
  currentPhase: number
  totalPhases: number
  progressPercent: number
  progressMessage?: string
  outline?: ProgramOutline
  completedPhases: GeneratedPhase[]
  mergedProgram?: MergedProgram
  error?: string
}

// ============================================
// API Request/Response
// ============================================

export interface StartGenerationRequest {
  conversationId?: string
  programContext: GenerationContext
  totalWeeks: number
  modelId?: string
  provider?: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
}

export interface StartGenerationResponse {
  success: boolean
  sessionId: string
  totalPhases: number
  estimatedMinutes: number
  message?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate phases for a given program length
 * - <= 8 weeks: 1 phase
 * - 9-16 weeks: 4-week phases
 * - > 16 weeks: 6-week phases
 */
export function calculatePhases(totalWeeks: number): Array<{ startWeek: number; endWeek: number; weeks: number }> {
  if (totalWeeks <= 8) {
    return [{ startWeek: 1, endWeek: totalWeeks, weeks: totalWeeks }]
  }

  const phaseLength = totalWeeks <= 16 ? 4 : 6
  const phases: Array<{ startWeek: number; endWeek: number; weeks: number }> = []
  let currentWeek = 1

  while (currentWeek <= totalWeeks) {
    const remainingWeeks = totalWeeks - currentWeek + 1
    const weeks = Math.min(phaseLength, remainingWeeks)
    phases.push({
      startWeek: currentWeek,
      endWeek: currentWeek + weeks - 1,
      weeks,
    })
    currentWeek += weeks
  }

  return phases
}

/**
 * Parse week range string (e.g., "1-4") to start/end numbers
 */
export function parseWeekRange(weeks: string): { startWeek: number; endWeek: number } {
  const [start, end] = weeks.split('-').map(Number)
  return { startWeek: start, endWeek: end || start }
}

/**
 * Estimate generation time based on phases
 * ~1-2 minutes per phase
 */
export function estimateGenerationMinutes(totalPhases: number): number {
  return Math.ceil(totalPhases * 1.5)
}
