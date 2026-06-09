/**
 * Session-RPE load estimation for planned team practices.
 *
 * These numbers feed athlete ACWR monitoring, so pin the sRPE convention
 * (TSS ≈ minutes × RPE/10), the intensity scaling, and the RPE clamp.
 */

import { describe, expect, it } from 'vitest'
import { estimatePracticeLoad, practiceIntensityLabel } from '@/lib/drills/practice-load'

describe('estimatePracticeLoad', () => {
  it('returns zero for an empty practice', () => {
    const result = estimatePracticeLoad([], 'moderate')
    expect(result.totalLoad).toBe(0)
    expect(result.totalMinutes).toBe(0)
    expect(result.averageRpe).toBe(0)
  })

  it('follows the sRPE convention: minutes × RPE/10', () => {
    // skill base RPE 5 at moderate (×1.0) → 20 min × 0.5 = 10 TSS
    const result = estimatePracticeLoad([{ focus: 'skill', durationMinutes: 20 }], 'moderate')
    expect(result.totalLoad).toBe(10)
    expect(result.averageRpe).toBe(5)
  })

  it('sums blocks and duration-weights the average RPE', () => {
    const result = estimatePracticeLoad(
      [
        { focus: 'warmup', durationMinutes: 10 }, // RPE 3 → 3 TSS
        { focus: 'conditioning', durationMinutes: 20 }, // RPE 8.5 → 17 TSS
      ],
      'moderate'
    )
    expect(result.totalLoad).toBe(20)
    expect(result.totalMinutes).toBe(30)
    // (3×10 + 8.5×20) / 30 ≈ 6.7
    expect(result.averageRpe).toBeCloseTo(6.7, 1)
  })

  it('scales with practice intensity', () => {
    const blocks = [{ focus: 'skating' as const, durationMinutes: 30 }]
    const low = estimatePracticeLoad(blocks, 'low')
    const matchLike = estimatePracticeLoad(blocks, 'matchLike')
    expect(low.totalLoad).toBeLessThan(matchLike.totalLoad)
    // skating base 7 × 0.8 = 5.6 → 30 × 0.56 ≈ 17
    expect(low.totalLoad).toBe(17)
  })

  it('clamps block RPE at 10 for match-like high-intensity blocks', () => {
    // conditioning 8.5 × 1.3 = 11.05 → clamped to 10
    const result = estimatePracticeLoad([{ focus: 'conditioning', durationMinutes: 10 }], 'matchLike')
    expect(result.perBlock[0].rpe).toBe(10)
    expect(result.totalLoad).toBe(10)
  })

  it('falls back to a sensible default for unknown focus values', () => {
    const result = estimatePracticeLoad([{ focus: 'mystery', durationMinutes: 10 }], 'moderate')
    expect(result.totalLoad).toBe(5) // default RPE 5
  })
})

describe('practiceIntensityLabel', () => {
  it('maps average RPE onto the TrainingLoad intensity scale', () => {
    expect(practiceIntensityLabel(2)).toBe('EASY')
    expect(practiceIntensityLabel(4.5)).toBe('MODERATE')
    expect(practiceIntensityLabel(6.5)).toBe('HARD')
    expect(practiceIntensityLabel(8)).toBe('VERY_HARD')
  })
})
