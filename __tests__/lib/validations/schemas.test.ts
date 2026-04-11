/**
 * Tests for the lactate-curve validation added to createTestApiSchema.
 *
 * Covers:
 * - detectLactateDecreases() helper — boundary around the 0.3 mmol
 *   noise tolerance, including exact 0.3 and multi-stage drops
 * - createTestApiSchema.superRefine():
 *     * accepts a normal monotonic curve
 *     * accepts small drops under the noise threshold
 *     * rejects a significant drop with an issue anchored at the
 *       correct stages[n].lactate path
 */

import { describe, it, expect } from 'vitest'
import {
  detectLactateDecreases,
  createTestApiSchema,
} from '@/lib/validations/schemas'

interface StageInput {
  duration: number
  heartRate: number
  lactate: number
  vo2?: number
  speed?: number
  incline?: number
  power?: number
  cadence?: number
  pace?: number
}

const runningStage = (overrides: Partial<StageInput>): StageInput => ({
  duration: 4,
  heartRate: 150,
  lactate: 2,
  speed: 10,
  ...overrides,
})

const baseTest = (stages: StageInput[]) => ({
  testDate: '2024-01-15',
  testType: 'RUNNING' as const,
  stages,
})

describe('detectLactateDecreases', () => {
  it('returns no warnings for a monotonically increasing curve', () => {
    const stages = [{ lactate: 1.5 }, { lactate: 2.2 }, { lactate: 3.8 }]
    expect(detectLactateDecreases(stages)).toEqual([])
  })

  it('ignores drops at or below the 0.3 mmol noise threshold', () => {
    // 2.5 -> 2.2 is a 0.3 drop exactly, should be tolerated
    const stages = [{ lactate: 2.5 }, { lactate: 2.2 }, { lactate: 3.0 }]
    expect(detectLactateDecreases(stages)).toEqual([])
  })

  it('flags a drop greater than the noise threshold', () => {
    // 2.5 -> 2.0 is a 0.5 drop
    const stages = [{ lactate: 2.5 }, { lactate: 2.0 }, { lactate: 3.0 }]
    const warnings = detectLactateDecreases(stages)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({ fromStage: 1, toStage: 2, drop: 0.5 })
  })

  it('flags multiple drops and returns them in order', () => {
    const stages = [
      { lactate: 2.0 },
      { lactate: 3.0 },
      { lactate: 2.0 }, // drop 1.0
      { lactate: 3.5 },
      { lactate: 2.0 }, // drop 1.5
    ]
    const warnings = detectLactateDecreases(stages)
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toMatchObject({ fromStage: 2, toStage: 3, drop: 1.0 })
    expect(warnings[1]).toMatchObject({ fromStage: 4, toStage: 5, drop: 1.5 })
  })

  it('returns no warnings for fewer than two stages', () => {
    expect(detectLactateDecreases([])).toEqual([])
    expect(detectLactateDecreases([{ lactate: 2 }])).toEqual([])
  })
})

describe('createTestApiSchema — lactate monotonic validation', () => {
  it('accepts a valid non-decreasing lactate curve', () => {
    const result = createTestApiSchema.safeParse(
      baseTest([
        runningStage({ lactate: 1.2 }),
        runningStage({ lactate: 1.8 }),
        runningStage({ lactate: 2.7 }),
        runningStage({ lactate: 4.5 }),
      ])
    )
    expect(result.success).toBe(true)
  })

  it('accepts a curve with small drops within the noise threshold', () => {
    const result = createTestApiSchema.safeParse(
      baseTest([
        runningStage({ lactate: 1.2 }),
        runningStage({ lactate: 1.5 }),
        runningStage({ lactate: 1.3 }), // 0.2 drop, tolerated
        runningStage({ lactate: 2.7 }),
      ])
    )
    expect(result.success).toBe(true)
  })

  it('rejects a curve with a significant mid-test lactate drop', () => {
    const result = createTestApiSchema.safeParse(
      baseTest([
        runningStage({ lactate: 1.2 }),
        runningStage({ lactate: 3.0 }),
        runningStage({ lactate: 2.0 }), // 1.0 drop — not noise
        runningStage({ lactate: 4.5 }),
      ])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'stages' && i.path[2] === 'lactate'
      )
      expect(issue).toBeDefined()
      // Drop is between stage 2 and stage 3 (1-indexed) → path points at stage
      // index 2 (0-indexed) in the stages array
      expect(issue?.path).toEqual(['stages', 2, 'lactate'])
      expect(issue?.message).toContain('1')
      expect(issue?.message).toContain('steg 2')
      expect(issue?.message).toContain('steg 3')
    }
  })

  it('reports each offending drop when multiple exist', () => {
    const result = createTestApiSchema.safeParse(
      baseTest([
        runningStage({ lactate: 2.0 }),
        runningStage({ lactate: 3.5 }),
        runningStage({ lactate: 2.0 }), // drop
        runningStage({ lactate: 4.0 }),
        runningStage({ lactate: 2.5 }), // drop
      ])
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const lactateIssues = result.error.issues.filter(
        (i) => i.path[0] === 'stages' && i.path[2] === 'lactate'
      )
      expect(lactateIssues).toHaveLength(2)
      expect(lactateIssues.map((i) => i.path[1])).toEqual([2, 4])
    }
  })
})
