import { inferActivityType, type QuickErgMachineType } from '@/lib/quick-erg/session-summary'

export interface QuickErgPlannedCardioCandidate {
  id: string
  sessionId: string
  sessionName: string
  assignedDate: Date | string
  status: string
  sport?: string | null
  plannedDurationSec?: number | null
  plannedDistanceMeters?: number | null
}

export interface QuickErgMatchableSession {
  id: string
  machineType: QuickErgMachineType
  startedAt: Date | string
  durationSec: number
  distanceMeters?: number | null
}

export interface QuickErgPlannedMatchSuggestion extends QuickErgPlannedCardioCandidate {
  confidence: number
  reasons: string[]
}

export interface QuickErgPlannedCardioMatch {
  type: 'cardio_assignment'
  assignmentId: string
  sessionId: string
  sessionName: string
  assignedDate: string
  previousStatus?: string
  matchedAt: string
  source: 'quick_erg_manual'
}

export interface QuickErgStoredPlannedCardioMatch {
  type: 'cardio_assignment'
  assignmentId: string
  sessionId?: string
  previousStatus?: string
}

export interface QuickErgPlanMatchLocale {
  sameDay: string
  nearbyDay: string
  matchingSport: string
  machineNameMatch: string
  similarDuration: string
  similarDistance: string
  pendingPlan: string
}

const DEFAULT_TEXT: QuickErgPlanMatchLocale = {
  sameDay: 'Same day',
  nearbyDay: 'Nearby day',
  matchingSport: 'Matching sport',
  machineNameMatch: 'Machine match',
  similarDuration: 'Similar duration',
  similarDistance: 'Similar distance',
  pendingPlan: 'Open plan',
}

function dateOnly(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}

function dayDistance(a: Date | string, b: Date | string): number {
  const aDay = new Date(`${dateOnly(a)}T00:00:00.000Z`).getTime()
  const bDay = new Date(`${dateOnly(b)}T00:00:00.000Z`).getTime()
  return Math.abs(Math.round((aDay - bDay) / 86_400_000))
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function ratioDifference(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(a, b)
}

function machineKeywords(machineType: QuickErgMachineType): string[] {
  switch (machineType) {
    case 'CONCEPT2_ROW':
      return ['row', 'rowing', 'rodd', 'roderg']
    case 'CONCEPT2_SKIERG':
      return ['ski', 'skierg', 'stak', 'skidor']
    case 'CONCEPT2_BIKEERG':
      return ['bikeerg', 'bike', 'cycling', 'cykel']
    case 'WATTBIKE':
      return ['wattbike', 'bike', 'cycling', 'cykel']
    case 'ASSAULT_BIKE':
    case 'FTMS_AIRBIKE':
      return ['airbike', 'assault', 'bike', 'cykel']
    case 'FTMS_BIKE':
      return ['bike', 'cycling', 'cykel']
    default:
      return ['erg']
  }
}

function expectedSport(machineType: QuickErgMachineType): string | null {
  const activityType = inferActivityType(machineType)
  if (activityType === 'CYCLING') return 'CYCLING'
  if (activityType === 'SKIING') return 'SKIING'
  return null
}

function nameMatchesMachine(candidate: QuickErgPlannedCardioCandidate, machineType: QuickErgMachineType): boolean {
  const name = candidate.sessionName.toLowerCase()
  return machineKeywords(machineType).some((keyword) => name.includes(keyword))
}

export function scoreQuickErgPlannedCardioCandidate(
  session: QuickErgMatchableSession,
  candidate: QuickErgPlannedCardioCandidate,
  labels: Partial<QuickErgPlanMatchLocale> = {}
): QuickErgPlannedMatchSuggestion {
  const text = { ...DEFAULT_TEXT, ...labels }
  let confidence = 0
  const reasons: string[] = []

  const daysApart = dayDistance(session.startedAt, candidate.assignedDate)
  if (daysApart === 0) {
    confidence += 0.35
    reasons.push(text.sameDay)
  } else if (daysApart === 1) {
    confidence += 0.12
    reasons.push(text.nearbyDay)
  }

  const sport = candidate.sport ?? null
  const expected = expectedSport(session.machineType)
  if (expected && sport === expected) {
    confidence += 0.2
    reasons.push(text.matchingSport)
  }

  if (nameMatchesMachine(candidate, session.machineType)) {
    confidence += 0.18
    reasons.push(text.machineNameMatch)
  }

  if (isNumber(candidate.plannedDurationSec) && candidate.plannedDurationSec > 0 && session.durationSec > 0) {
    const diff = ratioDifference(session.durationSec, candidate.plannedDurationSec)
    if (diff <= 0.2) {
      confidence += 0.2
      reasons.push(text.similarDuration)
    } else if (diff <= 0.4) {
      confidence += 0.1
      reasons.push(text.similarDuration)
    }
  }

  if (
    isNumber(candidate.plannedDistanceMeters) &&
    candidate.plannedDistanceMeters > 0 &&
    isNumber(session.distanceMeters) &&
    session.distanceMeters > 0
  ) {
    const diff = ratioDifference(session.distanceMeters, candidate.plannedDistanceMeters)
    if (diff <= 0.2) {
      confidence += 0.18
      reasons.push(text.similarDistance)
    } else if (diff <= 0.4) {
      confidence += 0.08
      reasons.push(text.similarDistance)
    }
  }

  if (candidate.status === 'PENDING' || candidate.status === 'SCHEDULED') {
    confidence += 0.05
    reasons.push(text.pendingPlan)
  }

  return {
    ...candidate,
    confidence: Math.min(1, Math.round(confidence * 100) / 100),
    reasons,
  }
}

export function buildQuickErgPlannedCardioSuggestions(
  session: QuickErgMatchableSession,
  candidates: QuickErgPlannedCardioCandidate[],
  labels?: Partial<QuickErgPlanMatchLocale>
): QuickErgPlannedMatchSuggestion[] {
  return candidates
    .map((candidate) => scoreQuickErgPlannedCardioCandidate(session, candidate, labels))
    .filter((suggestion) => suggestion.confidence >= 0.25)
    .sort((a, b) => b.confidence - a.confidence)
}

export function buildQuickErgPlannedCardioMatch(candidate: QuickErgPlannedCardioCandidate): QuickErgPlannedCardioMatch {
  return {
    type: 'cardio_assignment',
    assignmentId: candidate.id,
    sessionId: candidate.sessionId,
    sessionName: candidate.sessionName,
    assignedDate: dateOnly(candidate.assignedDate),
    previousStatus: candidate.status,
    matchedAt: new Date().toISOString(),
    source: 'quick_erg_manual',
  }
}

export function asQuickErgStoredPlannedCardioMatch(value: unknown): QuickErgStoredPlannedCardioMatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  if (record.type !== 'cardio_assignment' || typeof record.assignmentId !== 'string') {
    return null
  }

  return {
    type: 'cardio_assignment',
    assignmentId: record.assignmentId,
    sessionId: typeof record.sessionId === 'string' ? record.sessionId : undefined,
    previousStatus: typeof record.previousStatus === 'string' ? record.previousStatus : undefined,
  }
}

export function restoreQuickErgAssignmentStatus(params: {
  previousStatus?: string
  startTime?: string | null
  endTime?: string | null
  calendarEventId?: string | null
}): 'PENDING' | 'SCHEDULED' {
  if (params.previousStatus === 'PENDING' || params.previousStatus === 'SCHEDULED') {
    return params.previousStatus
  }

  return params.startTime || params.endTime || params.calendarEventId ? 'SCHEDULED' : 'PENDING'
}
