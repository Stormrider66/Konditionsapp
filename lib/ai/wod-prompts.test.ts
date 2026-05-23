import { describe, expect, it } from 'vitest'
import { buildWODCandidatePrompt } from './wod-prompts'
import type { WODAthleteContext, WODGuardrailResult, WODRequest } from '@/types/wod'

const baseContext: WODAthleteContext = {
  clientId: 'client-1',
  athleteName: 'Test Athlete',
  primarySport: 'RUNNING',
  experienceLevel: 'RECREATIONAL',
  readinessScore: null,
  fatigueLevel: null,
  sorenessLevel: null,
  sleepQuality: null,
  weeklyTSS: 0,
  acwrZone: 'OPTIMAL',
  dataPolicy: {
    mode: 'garmin_redacted',
    garminConnected: true,
    cloudAiGarminDataAllowed: false,
    withheldSignals: ['readiness', 'training_load', 'recent_garmin_workouts'],
    notice: 'Garmin-connected athlete: Garmin-origin signals are withheld from cloud AI prompts.',
  },
  activeInjuries: [],
  recentWorkouts: [],
  availableEquipment: ['none'],
}

const request: WODRequest = {
  mode: 'structured',
  workoutType: 'cardio',
  duration: 40,
  equipment: ['none'],
}

const guardrails: WODGuardrailResult = {
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
}

describe('WOD prompt data policy', () => {
  it('marks Garmin-origin signals as unavailable in cloud AI prompts', () => {
    const prompt = buildWODCandidatePrompt(baseContext, request, guardrails, 'en')

    expect(prompt).toContain('## AI DATA POLICY')
    expect(prompt).toContain('Garmin-origin data is not allowed in cloud AI')
    expect(prompt).toContain('Readiness: Not available (Garmin data withheld)')
    expect(prompt).toContain('Weekly load: Not available (Garmin data withheld)')
    expect(prompt).not.toContain('Weekly load: 0 TSS')
  })
})
