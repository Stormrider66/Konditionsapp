import { describe, expect, it } from 'vitest'
import {
  buildManualThresholdCoachDecisionData,
  detectManualThresholdChange,
  hasManualThresholdInput,
  manualThresholdSnapshot,
  mergeManualThresholdSources,
} from './manual-threshold-decision'

describe('manual threshold decision helpers', () => {
  it('normalizes empty manual threshold values to null', () => {
    expect(manualThresholdSnapshot({
      manualLT1Lactate: '',
      manualLT1Intensity: undefined,
      manualLT2Lactate: null,
      manualLT2Intensity: Number.NaN,
    })).toEqual({
      manualLT1Lactate: null,
      manualLT1Intensity: null,
      manualLT2Lactate: null,
      manualLT2Intensity: null,
    })
  })

  it('detects real manual threshold changes after merging partial input', () => {
    const previous = {
      manualLT1Lactate: 1.8,
      manualLT1Intensity: 12.5,
      manualLT2Lactate: null,
      manualLT2Intensity: null,
    }
    const next = mergeManualThresholdSources(previous, {
      manualLT1Intensity: 13.1,
    })

    const change = detectManualThresholdChange(previous, next)

    expect(hasManualThresholdInput({ manualLT1Intensity: 13.1 })).toBe(true)
    expect(change).toEqual({
      previous,
      next: {
        manualLT1Lactate: 1.8,
        manualLT1Intensity: 13.1,
        manualLT2Lactate: null,
        manualLT2Intensity: null,
      },
      changedFields: ['manualLT1Intensity'],
      modificationMagnitude: 0.25,
    })
  })

  it('returns null when manual threshold values are unchanged', () => {
    const previous = {
      manualLT1Lactate: 1.8,
      manualLT1Intensity: 12.5,
      manualLT2Lactate: 3.9,
      manualLT2Intensity: 15.2,
    }

    expect(detectManualThresholdChange(previous, manualThresholdSnapshot(previous))).toBeNull()
  })

  it('builds a zone calculation coach decision payload', () => {
    const change = detectManualThresholdChange(
      {
        manualLT1Lactate: null,
        manualLT1Intensity: null,
        manualLT2Lactate: null,
        manualLT2Intensity: null,
      },
      {
        manualLT1Lactate: 1.7,
        manualLT1Intensity: 12.4,
        manualLT2Lactate: 3.8,
        manualLT2Intensity: 15.1,
      }
    )

    expect(change).not.toBeNull()

    const data = buildManualThresholdCoachDecisionData({
      coachId: 'coach-1',
      athleteId: 'client-1',
      testId: 'test-1',
      testType: 'RUNNING',
      testDate: new Date('2026-06-16T08:00:00.000Z'),
      change: change!,
      reasonCategory: 'COACH_INTUITION',
      reasonNotes: 'Curve shape and observed breathing pattern matched this better.',
      calculatedThresholds: {
        aerobicThreshold: { value: 12.1 },
        anaerobicThreshold: { value: 14.8 },
      },
    })

    expect(data).toMatchObject({
      coachId: 'coach-1',
      athleteId: 'client-1',
      aiSuggestionType: 'ZONE_CALCULATION',
      modificationMagnitude: 1,
      reasonCategory: 'COACH_INTUITION',
      reasonNotes: 'Curve shape and observed breathing pattern matched this better.',
      aiSuggestionData: {
        source: 'TEST_THRESHOLD_CALCULATION',
        testId: 'test-1',
      },
      modificationData: {
        source: 'MANUAL_THRESHOLD_OVERRIDE',
        changedFields: [
          'manualLT1Lactate',
          'manualLT1Intensity',
          'manualLT2Lactate',
          'manualLT2Intensity',
        ],
      },
    })
  })
})
