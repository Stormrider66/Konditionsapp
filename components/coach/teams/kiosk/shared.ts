export type Locale = 'en' | 'sv'
export type SectionType = 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'

export interface KioskAssignment {
  id: string
  status: string
  assignedDate: string
  startTime: string | null
  endTime: string | null
  loggedSets: number
  session: {
    id: string
    name: string
    estimatedDuration: number | null
  }
}

export interface KioskMember {
  id: string
  name: string
  jerseyNumber: number | null
  position: string | null
  photoUrl: string | null
  assignment: KioskAssignment | null
}

export interface KioskApiResponse {
  success: boolean
  data?: {
    date: string
    team: { id: string; name: string }
    members: KioskMember[]
  }
  error?: string
}

export interface FocusModeExercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  nameEn?: string
  sets: number
  repsTarget: number | string
  weight?: number
  weightPercent?: number
  oneRepMax?: number
  tempo?: string
  restSeconds: number
  notes?: string
  section: SectionType
  completedSets: number
  setRows?: Array<{ reps: number | string; weight?: number; weightPercent?: number }>
  setLogs: Array<{
    id: string
    setNumber: number
    weight: number
    repsCompleted: number
    rpe?: number
    estimated1RM?: number
    velocityZone?: string
    completedAt: string
  }>
}

export interface FocusModeData {
  assignment: {
    id: string
    assignedDate: string
    status: string
    notes?: string
  }
  workout: {
    id: string
    name: string
    description?: string
    phase: string
    estimatedDuration?: number
  }
  sections: Array<{
    type: SectionType
    name: string
    notes?: string
    duration?: number
    exerciseCount: number
  }>
  exercises: FocusModeExercise[]
  progress: {
    currentExerciseIndex: number
    totalExercises: number
    totalSetsTarget: number
    completedSets: number
    percentComplete: number
    isComplete: boolean
  }
}

export interface FocusModeApiResponse {
  success: boolean
  data?: FocusModeData
  error?: string
}

export const IDLE_TIMEOUT_MS = 60_000

export function text(locale: Locale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

export function formatToday(locale: Locale): string {
  return new Date().toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function parseTargetReps(reps: number | string): number {
  if (typeof reps === 'number') return reps
  const match = reps.match(/(\d+)/)
  return match ? Number(match[1]) : 8
}

export function exerciseName(exercise: FocusModeExercise, locale: Locale): string {
  return locale === 'sv'
    ? exercise.nameSv || exercise.name || exercise.nameEn || 'Övning'
    : exercise.nameEn || exercise.name || exercise.nameSv || 'Exercise'
}

export function statusLabel(status: string, locale: Locale): string {
  if (status === 'COMPLETED') return text(locale, 'Klar', 'Done')
  if (status === 'SCHEDULED') return text(locale, 'Pågår', 'Active')
  if (status === 'MODIFIED') return text(locale, 'Anpassad', 'Modified')
  if (status === 'SKIPPED') return text(locale, 'Skippad', 'Skipped')
  return text(locale, 'Redo', 'Ready')
}

export function statusTone(status: string) {
  if (status === 'COMPLETED') return 'bg-emerald-500'
  if (status === 'SKIPPED') return 'bg-slate-400'
  if (status === 'SCHEDULED' || status === 'MODIFIED') return 'bg-blue-500'
  return 'bg-amber-500'
}

export function buildCoachQuery(teamId: string, businessSlug: string) {
  return new URLSearchParams({ coachTeamId: teamId, businessSlug }).toString()
}
