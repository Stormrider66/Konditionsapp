import {
  inferQuickErgMachineTypeFromDevice,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'
import type { QuickErgPersonalBest } from '@/lib/quick-erg/progress'

export type QuickErgCoachSignalType =
  | 'NEW_SESSION'
  | 'PERSONAL_BEST'
  | 'HIGH_LOAD'
  | 'UNMATCHED_PLAN'

export type QuickErgCoachSignalTone = 'info' | 'success' | 'warning'

export interface QuickErgCoachPlannedMatch {
  assignmentId: string
  sessionId: string
  sessionName: string
  assignedDate: string
  matchedAt?: string | null
}

export interface QuickErgCoachSignalInput {
  sessionId: string
  machineName: string
  startedAt: Date | string
  rpe?: number | null
  trainingLoad?: number | null
  plannedMatch?: QuickErgCoachPlannedMatch | null
  likelyPlannedMatch?: boolean
  prBadges?: QuickErgPersonalBest[]
  now?: Date
}

export interface QuickErgCoachSignal {
  id: string
  type: QuickErgCoachSignalType
  tone: QuickErgCoachSignalTone
  sessionId: string
  machineName: string
  startedAt: string
  metric?: string | null
}

const RECENT_SIGNAL_DAYS = 7
const HIGH_RPE = 8
const HIGH_TRAINING_LOAD = 40

const SIGNAL_PRIORITY: Record<QuickErgCoachSignalType, number> = {
  HIGH_LOAD: 0,
  UNMATCHED_PLAN: 1,
  PERSONAL_BEST: 2,
  NEW_SESSION: 3,
}

export function asQuickErgMachineKind(value?: string | null): 'bike' | 'rower' | null {
  return value === 'bike' || value === 'rower' ? value : null
}

export function resolveQuickErgDisplayMachineType(session: {
  machineType: QuickErgMachineType
  machineKind?: string | null
  deviceName?: string | null
}): QuickErgMachineType {
  return inferQuickErgMachineTypeFromDevice({
    currentMachineType: session.machineType,
    machineKind: asQuickErgMachineKind(session.machineKind),
    deviceName: session.deviceName,
  }) ?? session.machineType
}

export function asQuickErgCoachPlannedMatch(value: unknown): QuickErgCoachPlannedMatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  if (
    record.type !== 'cardio_assignment' ||
    typeof record.assignmentId !== 'string' ||
    typeof record.sessionId !== 'string' ||
    typeof record.sessionName !== 'string' ||
    typeof record.assignedDate !== 'string'
  ) {
    return null
  }

  return {
    assignmentId: record.assignmentId,
    sessionId: record.sessionId,
    sessionName: record.sessionName,
    assignedDate: record.assignedDate,
    matchedAt: typeof record.matchedAt === 'string' ? record.matchedAt : null,
  }
}

export function buildQuickErgCoachSignals(input: QuickErgCoachSignalInput): QuickErgCoachSignal[] {
  const startedAt = input.startedAt instanceof Date ? input.startedAt : new Date(input.startedAt)
  const startedAtIso = startedAt.toISOString()
  const now = input.now ?? new Date()
  const ageDays = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 86_400_000))
  const signals: QuickErgCoachSignal[] = []

  if (ageDays <= RECENT_SIGNAL_DAYS) {
    signals.push({
      id: `${input.sessionId}:new`,
      type: 'NEW_SESSION',
      tone: 'info',
      sessionId: input.sessionId,
      machineName: input.machineName,
      startedAt: startedAtIso,
    })
  }

  if (input.prBadges && input.prBadges.length > 0) {
    signals.push({
      id: `${input.sessionId}:pb`,
      type: 'PERSONAL_BEST',
      tone: 'success',
      sessionId: input.sessionId,
      machineName: input.machineName,
      startedAt: startedAtIso,
      metric: input.prBadges.length === 1 ? input.prBadges[0].label : `${input.prBadges.length} records`,
    })
  }

  if ((input.trainingLoad ?? 0) >= HIGH_TRAINING_LOAD || (input.rpe ?? 0) >= HIGH_RPE) {
    signals.push({
      id: `${input.sessionId}:load`,
      type: 'HIGH_LOAD',
      tone: 'warning',
      sessionId: input.sessionId,
      machineName: input.machineName,
      startedAt: startedAtIso,
      metric: input.rpe ? `RPE ${input.rpe}/10` : input.trainingLoad ? `${Math.round(input.trainingLoad)} TSS` : null,
    })
  }

  if (!input.plannedMatch && input.likelyPlannedMatch) {
    signals.push({
      id: `${input.sessionId}:unmatched`,
      type: 'UNMATCHED_PLAN',
      tone: 'warning',
      sessionId: input.sessionId,
      machineName: input.machineName,
      startedAt: startedAtIso,
    })
  }

  return sortQuickErgCoachSignals(signals)
}

export function sortQuickErgCoachSignals(signals: QuickErgCoachSignal[]): QuickErgCoachSignal[] {
  return [...signals].sort((a, b) => {
    const priority = SIGNAL_PRIORITY[a.type] - SIGNAL_PRIORITY[b.type]
    if (priority !== 0) return priority
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  })
}
