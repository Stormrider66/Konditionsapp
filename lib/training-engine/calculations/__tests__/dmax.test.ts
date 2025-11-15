import { describe, it, expect } from 'vitest'
import { calculateDmax } from '../dmax'

const KNOWN_GOOD_DATA = {
  intensity: [10, 11, 12, 13, 14, 15, 16],
  lactate: [1.2, 1.5, 1.8, 2.3, 3.2, 5.1, 8.5],
  heartRate: [130, 140, 148, 158, 168, 178, 188],
  unit: 'km/h'
}

const POOR_CURVE_DATA = {
  intensity: [10, 11, 12, 13, 14],
  lactate: [2.0, 1.4, 2.8, 1.9, 2.5], // Highly irregular to force poor fit
  heartRate: [130, 138, 146, 154, 162],
  unit: 'km/h'
}

describe('D-max Algorithm', () => {
  it('detects threshold from known-good lactate curve', () => {
    const result = calculateDmax(KNOWN_GOOD_DATA)

    expect(result.method).toBe('DMAX')
    expect(result.intensity).toBeCloseTo(14.2, 0)
    expect(result.r2).toBeGreaterThan(0.9)
    expect(result.confidence).toBe('HIGH')
    expect(result.heartRate).toBeGreaterThan(160)
  })

  it('falls back to 4 mmol method when polynomial fit is poor', () => {
    const result = calculateDmax(POOR_CURVE_DATA)

    expect(result.method).toBe('FALLBACK')
    expect(result.confidence).toBe('LOW')
    expect(result.warning).toContain('4.0 mmol/L')
    expect(result.lactate).toBe(4)
  })
})

