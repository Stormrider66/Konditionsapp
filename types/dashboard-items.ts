import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { Dumbbell, Heart, Flame, Zap, type LucideIcon } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

export type AssignmentType = 'strength' | 'cardio' | 'hybrid' | 'agility'

export interface DashboardAssignment {
  kind: 'assignment'
  assignmentType: AssignmentType
  id: string           // assignment ID
  targetId: string     // session/workout ID (for routing)
  name: string
  description?: string | null
  assignedDate: Date
  status: string
  completedAt?: Date | null
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
  notes?: string | null
  duration?: number | null   // minutes
  // Type-specific display fields
  sport?: string | null      // cardio sport
  phase?: string | null      // strength phase
  format?: string | null     // hybrid/agility format
}

export interface DashboardProgramWorkout {
  kind: 'program'
  workout: DashboardWorkoutWithContext
}

export type DashboardItem = DashboardProgramWorkout | DashboardAssignment

// ── Utility Functions ──────────────────────────────────────────────────────

export function isItemCompleted(item: DashboardItem): boolean {
  if (item.kind === 'program') {
    return !!(item.workout.logs && item.workout.logs.length > 0 && item.workout.logs[0].completed)
  }
  return item.status === 'COMPLETED'
}

export function getItemDate(item: DashboardItem): Date {
  if (item.kind === 'program') {
    return new Date(item.workout.dayDate)
  }
  return new Date(item.assignedDate)
}

export function getItemName(item: DashboardItem): string {
  if (item.kind === 'program') {
    return item.workout.name
  }
  return item.name
}

export function getItemStartTime(item: DashboardItem): string | null {
  if (item.kind === 'program') {
    return item.workout.startTime ?? null
  }
  return item.startTime ?? null
}

export function getItemLocationName(item: DashboardItem): string | null {
  if (item.kind === 'program') {
    return item.workout.locationName ?? item.workout.location?.name ?? null
  }
  return item.locationName ?? null
}

export function getAssignmentRoute(assignment: DashboardAssignment, basePath: string): string {
  switch (assignment.assignmentType) {
    case 'strength':
      return `${basePath}/athlete/workout/${assignment.targetId}`
    case 'cardio':
      return `${basePath}/athlete/cardio`
    case 'hybrid':
      return `${basePath}/athlete/hybrid/${assignment.targetId}`
    case 'agility':
      return `${basePath}/athlete/agility/${assignment.targetId}`
  }
}

export function getAssignmentTypeLabel(type: AssignmentType): string {
  switch (type) {
    case 'strength': return 'Styrka'
    case 'cardio':   return 'Cardio'
    case 'hybrid':   return 'Hybrid'
    case 'agility':  return 'Agility'
  }
}

export function getAssignmentTypeIcon(type: AssignmentType): LucideIcon {
  switch (type) {
    case 'strength': return Dumbbell
    case 'cardio':   return Heart
    case 'hybrid':   return Flame
    case 'agility':  return Zap
  }
}

export function getAssignmentTypeBadgeStyle(type: AssignmentType): string {
  switch (type) {
    case 'strength':
      return 'bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400'
    case 'cardio':
      return 'bg-rose-100 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400'
    case 'hybrid':
      return 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
    case 'agility':
      return 'bg-violet-100 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400'
  }
}

// ── Mapping Functions (raw Prisma → DashboardAssignment) ───────────────────

interface RawStrengthAssignment {
  id: string
  sessionId: string
  assignedDate: Date
  status: string
  completedAt: Date | null
  startTime: string | null
  endTime: string | null
  locationName: string | null
  notes: string | null
  duration: number | null
  session: {
    id: string
    name: string
    description: string | null
    phase: string | null
    estimatedDuration: number | null
  }
  location?: { id: string; name: string } | null
}

export function mapStrengthAssignment(raw: RawStrengthAssignment): DashboardAssignment {
  return {
    kind: 'assignment',
    assignmentType: 'strength',
    id: raw.id,
    targetId: raw.session.id,
    name: raw.session.name,
    description: raw.session.description,
    assignedDate: raw.assignedDate,
    status: raw.status,
    completedAt: raw.completedAt,
    startTime: raw.startTime,
    endTime: raw.endTime,
    locationName: raw.locationName ?? raw.location?.name ?? null,
    notes: raw.notes,
    duration: raw.duration ?? raw.session.estimatedDuration,
    phase: raw.session.phase,
  }
}

interface RawCardioAssignment {
  id: string
  sessionId: string
  assignedDate: Date
  status: string
  completedAt: Date | null
  startTime: string | null
  endTime: string | null
  locationName: string | null
  notes: string | null
  session: {
    id: string
    name: string
    description: string | null
    sport: string | null
    totalDuration: number | null
  }
  location?: { id: string; name: string } | null
}

export function mapCardioAssignment(raw: RawCardioAssignment): DashboardAssignment {
  return {
    kind: 'assignment',
    assignmentType: 'cardio',
    id: raw.id,
    targetId: raw.session.id,
    name: raw.session.name,
    description: raw.session.description,
    assignedDate: raw.assignedDate,
    status: raw.status,
    completedAt: raw.completedAt,
    startTime: raw.startTime,
    endTime: raw.endTime,
    locationName: raw.locationName ?? raw.location?.name ?? null,
    notes: raw.notes,
    duration: raw.session.totalDuration ? Math.round(raw.session.totalDuration / 60) : null,
    sport: raw.session.sport,
  }
}

interface RawHybridAssignment {
  id: string
  workoutId: string
  assignedDate: Date
  status: string
  completedAt: Date | null
  startTime: string | null
  endTime: string | null
  locationName: string | null
  notes: string | null
  workout: {
    id: string
    name: string
    description: string | null
    format: string | null
    totalMinutes: number | null
  }
  location?: { id: string; name: string } | null
}

export function mapHybridAssignment(raw: RawHybridAssignment): DashboardAssignment {
  return {
    kind: 'assignment',
    assignmentType: 'hybrid',
    id: raw.id,
    targetId: raw.workout.id,
    name: raw.workout.name,
    description: raw.workout.description,
    assignedDate: raw.assignedDate,
    status: raw.status,
    completedAt: raw.completedAt,
    startTime: raw.startTime,
    endTime: raw.endTime,
    locationName: raw.locationName ?? raw.location?.name ?? null,
    notes: raw.notes,
    duration: raw.workout.totalMinutes,
    format: raw.workout.format,
  }
}

interface RawAgilityAssignment {
  id: string
  workoutId: string
  assignedDate: Date
  status: string
  completedAt: Date | null
  startTime: string | null
  endTime: string | null
  locationName: string | null
  notes: string | null
  workout: {
    id: string
    name: string
    description: string | null
    format: string | null
    totalDuration: number | null
  }
  location?: { id: string; name: string } | null
}

export function mapAgilityAssignment(raw: RawAgilityAssignment): DashboardAssignment {
  return {
    kind: 'assignment',
    assignmentType: 'agility',
    id: raw.id,
    targetId: raw.workout.id,
    name: raw.workout.name,
    description: raw.workout.description,
    assignedDate: raw.assignedDate,
    status: raw.status,
    completedAt: raw.completedAt,
    startTime: raw.startTime,
    endTime: raw.endTime,
    locationName: raw.locationName ?? raw.location?.name ?? null,
    notes: raw.notes,
    duration: raw.workout.totalDuration,
    format: raw.workout.format,
  }
}
