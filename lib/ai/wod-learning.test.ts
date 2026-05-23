import { describe, expect, it, vi } from 'vitest'
import type { WODCandidateBlueprint, WODPreferenceProfile } from '@/types/wod'

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

import { normalizeWODFeedback, pickBestWODCandidate, scoreWODCandidates } from './wod-learning'

const profile: WODPreferenceProfile = {
  clientId: 'client-1',
  preferredDuration: 45,
  intensityTolerance: 6,
  preferredFormats: ['EMOM'],
  exerciseLikes: ['Row'],
  exerciseDislikes: ['Burpee'],
  modeAffinity: { structured: 2 },
  workoutTypeAffinity: { mixed: 2 },
  equipmentAffinity: { rower: 2 },
  structurePreference: {},
  noveltyPreference: 0.4,
  painAvoidanceSignals: {},
  promptSummary: 'Likes structured EMOM work with rowing.',
  confidence: 0.8,
  sampleSize: 8,
  feedbackCount: 8,
}

const baseCandidate: WODCandidateBlueprint = {
  id: 'candidate-1',
  title: 'Good fit',
  summary: 'Structured EMOM with rowing',
  format: 'EMOM',
  workoutType: 'mixed',
  mode: 'structured',
  duration: 45,
  intensity: 'moderate',
  equipment: ['rower'],
  sections: ['Warm-up', 'EMOM', 'Cooldown'],
  keyExercises: ['Row', 'Air squat'],
  rationale: 'Matches preference',
}

describe('WOD learning helpers', () => {
  it('normalizes valid feedback and rejects incomplete feedback', () => {
    expect(normalizeWODFeedback({
      difficultyFit: 4,
      enjoyment: 5,
      structureFit: 4,
      repeatIntent: true,
      note: 'More rowing',
    })).toEqual({
      difficultyFit: 4,
      enjoyment: 5,
      structureFit: 4,
      repeatIntent: true,
      painOrDiscomfort: null,
      note: 'More rowing',
    })

    expect(normalizeWODFeedback({ enjoyment: 5 })).toBeNull()
  })

  it('vetoes unsafe or disallowed-equipment candidates before preference fit', () => {
    const scores = scoreWODCandidates([
      baseCandidate,
      {
        ...baseCandidate,
        id: 'candidate-2',
        equipment: ['barbell'],
      },
    ], {
      request: {
        mode: 'structured',
        workoutType: 'mixed',
        duration: 45,
        equipment: ['rower'],
      },
      guardrails: {
        canGenerate: true,
        checks: {
          acwr: { passed: true },
          injury: { passed: true },
          fatigue: { passed: true },
          usageLimit: { passed: true },
          restrictions: { passed: true },
        },
        guardrailsApplied: [],
        adjustedIntensity: 'moderate',
        excludedAreas: [],
      },
      profile,
    })

    expect(scores[0].vetoed).toBe(false)
    expect(scores[1].vetoed).toBe(true)
    expect(scores[1].score).toBe(0)
  })

  it('selects the best candidate by safety and personal preference', () => {
    const result = pickBestWODCandidate([
      { ...baseCandidate, id: 'candidate-1' },
      {
        ...baseCandidate,
        id: 'candidate-2',
        format: 'For Time',
        keyExercises: ['Burpee'],
      },
      {
        ...baseCandidate,
        id: 'candidate-3',
        duration: 70,
      },
    ], {
      request: {
        mode: 'structured',
        workoutType: 'mixed',
        duration: 45,
        equipment: ['rower'],
      },
      guardrails: {
        canGenerate: true,
        checks: {
          acwr: { passed: true },
          injury: { passed: true },
          fatigue: { passed: true },
          usageLimit: { passed: true },
          restrictions: { passed: true },
        },
        guardrailsApplied: [],
        adjustedIntensity: 'moderate',
        excludedAreas: [],
      },
      profile,
    })

    expect(result.candidate.id).toBe('candidate-1')
    expect(result.score.score).toBeGreaterThan(80)
  })
})
