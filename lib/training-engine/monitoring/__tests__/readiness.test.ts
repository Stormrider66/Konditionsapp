import { describe, it, expect } from 'vitest'
import { calculateReadinessScore, type ACWRAssessment } from '../readiness-composite'
import type { HRVAssessment } from '../hrv-assessment'
import type { RHRAssessment } from '../rhr-assessment'
import type { WellnessScore } from '../wellness-scoring'

function createWellnessScore(overrides: Partial<WellnessScore> = {}): WellnessScore {
  return {
    totalScore: 9.2,
    rawScore: 92,
    categoryScores: {
      sleepQuality: 90,
      sleepDuration: 90,
      fatigue: 90,
      soreness: 90,
      stress: 90,
      mood: 90,
      motivation: 90
    },
    status: 'EXCELLENT',
    redFlags: [],
    warnings: [],
    recommendation: 'Excellent wellness - ready for planned training',
    ...overrides
  }
}

function createHRVAssessment(overrides: Partial<HRVAssessment> = {}): HRVAssessment {
  return {
    status: 'EXCELLENT',
    percentOfBaseline: 110,
    score: 10,
    trend: 'STABLE',
    consecutiveDeclines: 0,
    warnings: [],
    recommendation: 'Proceed with planned training',
    ...overrides
  }
}

function createRHRAssessment(overrides: Partial<RHRAssessment> = {}): RHRAssessment {
  return {
    status: 'NORMAL',
    deviationFromBaseline: 0,
    score: 10,
    trend: 'STABLE',
    consecutiveElevated: 0,
    warnings: [],
    recommendation: 'Normal RHR - proceed with training',
    ...overrides
  }
}

function createACWRAssessment(overrides: Partial<ACWRAssessment> = {}): ACWRAssessment {
  return {
    value: 0.95,
    status: 'OPTIMAL',
    score: 10,
    ...overrides
  }
}

describe('Readiness Assessment', () => {
  it('returns EXCELLENT readiness when all inputs are optimal', () => {
    const result = calculateReadinessScore({
      hrv: createHRVAssessment(),
      rhr: createRHRAssessment(),
      wellness: createWellnessScore(),
      acwr: createACWRAssessment(),
      methodology: 'POLARIZED'
    })

    expect(result.status).toBe('EXCELLENT')
    expect(result.score).toBeGreaterThan(9)
    expect(result.recommendation).toContain('Excellent readiness')
    expect(result.workoutModification.action).toBe('PROCEED')
  })

  it('escalates to rest recommendation when HRV red flag is present', () => {
    const result = calculateReadinessScore({
      hrv: createHRVAssessment({
        percentOfBaseline: 60,
        status: 'VERY_POOR',
        score: 2,
        warnings: ['CRITICAL: HRV <75% of baseline - mandatory rest']
      }),
      wellness: createWellnessScore({ totalScore: 7.5, rawScore: 75 }),
      methodology: 'NORWEGIAN'
    })

    expect(result.criticalFlags).toContain('CRITICAL: HRV <75% of baseline - mandatory rest')
    expect(result.workoutModification.action).toBe('REST')
    expect(result.recommendation).toContain('CRITICAL readiness issues')
  })

  it('weights HRV more heavily than other metrics in composite score', () => {
    const strongHRV = calculateReadinessScore({
      hrv: createHRVAssessment({ score: 10, percentOfBaseline: 108 }),
      wellness: createWellnessScore({ totalScore: 6.5, rawScore: 65 }),
    })

    const suppressedHRV = calculateReadinessScore({
      hrv: createHRVAssessment({
        score: 3,
        status: 'POOR',
        percentOfBaseline: 78,
        warnings: ['WARNING: HRV trending down']
      }),
      wellness: createWellnessScore({ totalScore: 8.5, rawScore: 85 }),
    })

    expect(strongHRV.score).toBeGreaterThan(suppressedHRV.score)
  })
})

