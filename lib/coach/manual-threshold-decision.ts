import type { Prisma } from '@prisma/client'

export const MANUAL_THRESHOLD_FIELDS = [
  'manualLT1Lactate',
  'manualLT1Intensity',
  'manualLT2Lactate',
  'manualLT2Intensity',
] as const

export const THRESHOLD_DECISION_REASON_CATEGORIES = [
  'ATHLETE_FEEDBACK',
  'FATIGUE_OBSERVED',
  'INJURY_CONCERN',
  'PROGRESSION_ADJUSTMENT',
  'COACH_INTUITION',
  'ATHLETE_PREFERENCE',
  'OTHER',
] as const

export type ManualThresholdField = (typeof MANUAL_THRESHOLD_FIELDS)[number]
export type ThresholdDecisionReasonCategory = (typeof THRESHOLD_DECISION_REASON_CATEGORIES)[number]

export type ManualThresholdSnapshot = Record<ManualThresholdField, number | null>

export interface ManualThresholdSource {
  manualLT1Lactate?: unknown
  manualLT1Intensity?: unknown
  manualLT2Lactate?: unknown
  manualLT2Intensity?: unknown
}

export interface ManualThresholdChange {
  previous: ManualThresholdSnapshot
  next: ManualThresholdSnapshot
  changedFields: ManualThresholdField[]
  modificationMagnitude: number
}

export function normalizeManualThresholdValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function manualThresholdSnapshot(source: ManualThresholdSource): ManualThresholdSnapshot {
  return {
    manualLT1Lactate: normalizeManualThresholdValue(source.manualLT1Lactate),
    manualLT1Intensity: normalizeManualThresholdValue(source.manualLT1Intensity),
    manualLT2Lactate: normalizeManualThresholdValue(source.manualLT2Lactate),
    manualLT2Intensity: normalizeManualThresholdValue(source.manualLT2Intensity),
  }
}

export function detectManualThresholdChange(
  previousSource: ManualThresholdSource,
  nextSource: ManualThresholdSource
): ManualThresholdChange | null {
  const previous = manualThresholdSnapshot(previousSource)
  const next = manualThresholdSnapshot(nextSource)
  const changedFields = MANUAL_THRESHOLD_FIELDS.filter((field) => previous[field] !== next[field])

  if (changedFields.length === 0) return null

  return {
    previous,
    next,
    changedFields,
    modificationMagnitude: changedFields.length / MANUAL_THRESHOLD_FIELDS.length,
  }
}

export function hasManualThresholdInput(source: Record<string, unknown>): boolean {
  return MANUAL_THRESHOLD_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(source, field))
}

export function mergeManualThresholdSources(
  previousSource: ManualThresholdSource,
  nextSource: ManualThresholdSource
): ManualThresholdSnapshot {
  const merged: ManualThresholdSource = { ...previousSource }

  for (const field of MANUAL_THRESHOLD_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(nextSource, field)) {
      merged[field] = nextSource[field]
    }
  }

  return manualThresholdSnapshot(merged)
}

export function buildManualThresholdCoachDecisionData(input: {
  coachId: string
  athleteId: string
  testId: string
  testType: string
  testDate: Date
  change: ManualThresholdChange
  reasonCategory: ThresholdDecisionReasonCategory
  reasonNotes: string
  calculatedThresholds: {
    aerobicThreshold: Prisma.JsonValue | null
    anaerobicThreshold: Prisma.JsonValue | null
  }
}): Prisma.CoachDecisionUncheckedCreateInput {
  return {
    coachId: input.coachId,
    athleteId: input.athleteId,
    aiSuggestionType: 'ZONE_CALCULATION',
    aiSuggestionData: {
      source: 'TEST_THRESHOLD_CALCULATION',
      testId: input.testId,
      testType: input.testType,
      calculatedThresholds: input.calculatedThresholds,
      previousManualThresholds: input.change.previous,
    },
    modificationData: {
      source: 'MANUAL_THRESHOLD_OVERRIDE',
      testId: input.testId,
      manualThresholds: input.change.next,
      changedFields: input.change.changedFields,
    },
    modificationMagnitude: input.change.modificationMagnitude,
    reasonCategory: input.reasonCategory,
    reasonNotes: input.reasonNotes,
    coachConfidence: 0.8,
    athleteContext: {
      testId: input.testId,
      testType: input.testType,
      testDate: input.testDate.toISOString(),
    },
  }
}
