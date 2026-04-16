/**
 * Tests for running economy calculations
 *
 * Covers:
 * - calculateRunningEconomy(vo2, speed) — pure math
 * - evaluateRunningEconomy(economy, gender) — threshold banding
 * - calculateAllEconomy(stages, gender) — the happy path and the
 *   skipped-stage tracking added so partial runs are distinguishable
 *   from complete ones.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateRunningEconomy,
  evaluateRunningEconomy,
  calculateAllEconomy,
  calculateWattsPerKg,
} from '@/lib/calculations/economy'
import type { TestStage } from '@/types'

const makeStage = (overrides: Partial<TestStage> & { sequence: number }): TestStage => ({
  id: `stage-${overrides.sequence}`,
  testId: 'test-1',
  duration: 4,
  heartRate: 150,
  lactate: 2,
  ...overrides,
})

describe('calculateRunningEconomy', () => {
  it('returns ml/kg/km using (vo2 * 60) / speed', () => {
    // 40 ml/kg/min at 12 km/h → (40 * 60) / 12 = 200 ml/kg/km
    expect(calculateRunningEconomy(40, 12)).toBe(200)
  })

  it('rounds to the nearest integer', () => {
    // (41 * 60) / 12 = 205 → 205 (already int)
    expect(calculateRunningEconomy(41, 12)).toBe(205)
    // (40.15 * 60) / 12 = 200.75 → rounds up to 201
    expect(calculateRunningEconomy(40.15, 12)).toBe(201)
    // (40.05 * 60) / 12 = 200.25 → rounds down to 200
    expect(calculateRunningEconomy(40.05, 12)).toBe(200)
  })
})

describe('evaluateRunningEconomy', () => {
  it('bands male economy values correctly', () => {
    expect(evaluateRunningEconomy(190, 'MALE')).toBe('Utmärkt')
    expect(evaluateRunningEconomy(205, 'MALE')).toBe('Mycket god')
    expect(evaluateRunningEconomy(215, 'MALE')).toBe('God')
    expect(evaluateRunningEconomy(230, 'MALE')).toBe('Acceptabel')
    expect(evaluateRunningEconomy(260, 'MALE')).toBe('Behöver förbättring')
  })

  it('bands female economy values correctly (shifted higher)', () => {
    expect(evaluateRunningEconomy(200, 'FEMALE')).toBe('Utmärkt')
    expect(evaluateRunningEconomy(215, 'FEMALE')).toBe('Mycket god')
    expect(evaluateRunningEconomy(230, 'FEMALE')).toBe('God')
    expect(evaluateRunningEconomy(250, 'FEMALE')).toBe('Acceptabel')
    expect(evaluateRunningEconomy(280, 'FEMALE')).toBe('Behöver förbättring')
  })
})

describe('calculateAllEconomy', () => {
  it('computes economy for every stage when vo2 and speed are present', () => {
    const stages: TestStage[] = [
      makeStage({ sequence: 1, vo2: 35, speed: 10 }),
      makeStage({ sequence: 2, vo2: 40, speed: 12 }),
      makeStage({ sequence: 3, vo2: 45, speed: 14 }),
    ]

    const result = calculateAllEconomy(stages, 'MALE')

    expect(result.data).toHaveLength(3)
    expect(result.skippedStageSequences).toEqual([])
    expect(result.data[0]).toMatchObject({ speed: 10, vo2: 35, economy: 210 })
    expect(result.data[1]).toMatchObject({ speed: 12, vo2: 40, economy: 200 })
  })

  it('skips stages missing vo2 and records their sequence numbers', () => {
    const stages: TestStage[] = [
      makeStage({ sequence: 1, vo2: 35, speed: 10 }),
      makeStage({ sequence: 2, speed: 12 }), // no vo2
      makeStage({ sequence: 3, vo2: 45, speed: 14 }),
    ]

    const result = calculateAllEconomy(stages, 'MALE')

    expect(result.data).toHaveLength(2)
    expect(result.data.map((d) => d.speed)).toEqual([10, 14])
    expect(result.skippedStageSequences).toEqual([2])
  })

  it('skips stages missing speed and records their sequence numbers', () => {
    const stages: TestStage[] = [
      makeStage({ sequence: 1, vo2: 35 }), // no speed
      makeStage({ sequence: 2, vo2: 40, speed: 12 }),
    ]

    const result = calculateAllEconomy(stages, 'FEMALE')

    expect(result.data).toHaveLength(1)
    expect(result.skippedStageSequences).toEqual([1])
  })

  it('returns empty data and full skip list when no stage has both fields', () => {
    const stages: TestStage[] = [
      makeStage({ sequence: 1, vo2: 35 }),
      makeStage({ sequence: 2, speed: 12 }),
    ]

    const result = calculateAllEconomy(stages, 'MALE')

    expect(result.data).toEqual([])
    expect(result.skippedStageSequences).toEqual([1, 2])
  })

  it('handles empty stages array', () => {
    const result = calculateAllEconomy([], 'MALE')
    expect(result.data).toEqual([])
    expect(result.skippedStageSequences).toEqual([])
  })
})

describe('calculateWattsPerKg', () => {
  it('returns power divided by weight with two decimals', () => {
    expect(calculateWattsPerKg(300, 75)).toBe(4)
    expect(calculateWattsPerKg(250, 70)).toBeCloseTo(3.57, 2)
  })
})
