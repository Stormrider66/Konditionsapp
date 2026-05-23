import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

import { evaluateWODStrategyPrompt } from './wod-autoresearch'

describe('WOD autoresearch evaluator', () => {
  it('rewards strategy prompts with candidate scoring, learning, and safety coverage', () => {
    const baseline = evaluateWODStrategyPrompt('Create a daily workout.')
    const improved = evaluateWODStrategyPrompt(`
      Generate 3 candidate blueprints.
      Use personal learning before anonymous cohort patterns.
      Safety, injury restriction, equipment, readiness, and RPE are strict vetoes.
      Adapt beginner and elite athletes differently.
      Include strength, cardio, mixed, and core coverage.
    `)

    expect(improved.score).toBeGreaterThan(baseline.score)
    expect(improved.safetyScore).toBeGreaterThanOrEqual(baseline.safetyScore)
    expect(improved.warnings).toHaveLength(0)
  })
})
