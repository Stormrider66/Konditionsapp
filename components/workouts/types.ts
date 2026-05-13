export type WorkoutSection = 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'

export type WorkoutKind = 'strength' | 'cardio' | 'hybrid' | 'agility'

export interface PreviewSetLog {
  id: string
  setNumber: number
  weight: number
  repsCompleted: number
  rpe?: number
  meanVelocity?: number
  peakVelocity?: number
  meanPower?: number
  peakPower?: number
  meanTime?: number
  peakTime?: number
  estimated1RM?: number
  velocityZone?: string
  completedAt?: Date | string
}

export interface PreviewExercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  imageUrls?: string[]
  sets: number
  repsTarget: number | string
  weight?: number
  tempo?: string
  restSeconds: number
  notes?: string
  section: WorkoutSection
  orderIndex: number
  completedSets: number
  setLogs: PreviewSetLog[]
  /** When true, show VBT fields (speed/power) in the logging sheet. */
  supportsVbt?: boolean
}

export interface PreviewSection {
  type: WorkoutSection
  name: string
  notes?: string
  duration?: number
  exerciseCount: number
}

export interface PreviewWorkoutData {
  assignment: {
    id: string
    assignedDate?: string
    status: string
    notes?: string | null
  }
  workout: {
    id: string
    name: string
    description?: string | null
    phase?: string
    estimatedDuration?: number | null
    kind?: WorkoutKind
    tags?: string[]
    intensity?: 'LOW' | 'MODERATE' | 'HIGH' | 'MAX'
    isAiGenerated?: boolean
  }
  sections: PreviewSection[]
  exercises: PreviewExercise[]
  progress: {
    currentExerciseIndex: number
    totalExercises: number
    totalSetsTarget: number
    completedSets: number
    percentComplete: number
    isComplete: boolean
  }
  readiness?: {
    available: boolean
    score?: number
    message?: string
  }
}

export interface LoggedSetPayload {
  exerciseId: string
  setNumber: number
  weight: number
  repsCompleted: number
  repsTarget?: number
  rpe?: number
  meanVelocity?: number
  peakVelocity?: number
  meanPower?: number
  peakPower?: number
  meanTime?: number
  peakTime?: number
  restTaken?: number
  notes?: string
}

export interface CompleteSessionPayload {
  rpe?: number
  duration?: number
  notes?: string
  markUnloggedAsSkipped?: boolean
}
