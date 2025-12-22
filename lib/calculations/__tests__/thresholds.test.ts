import { describe, it, expect } from 'vitest'
import type { TestStage, Threshold } from '@/types'
import { calculateDmaxForVisualization, calculateAerobicThreshold, calculateAnaerobicThreshold } from '../thresholds'

describe('Threshold Calculations', () => {
  describe('calculateDmaxForVisualization', () => {
    it('should return null when fewer than 4 stages are provided', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, speed: 10, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, speed: 12, heartRate: 140, lactate: 2.0 },
        { id: '3', testId: 't1', sequence: 3, speed: 14, heartRate: 160, lactate: 4.0 },
      ]

      const result = calculateDmaxForVisualization(stages)
      expect(result).toBeNull()
    })

    it('should calculate D-max for running test with speed values', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, speed: 10, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, speed: 12, heartRate: 140, lactate: 1.5 },
        { id: '3', testId: 't1', sequence: 3, speed: 14, heartRate: 160, lactate: 3.0 },
        { id: '4', testId: 't1', sequence: 4, speed: 16, heartRate: 180, lactate: 6.0 },
      ]

      const result = calculateDmaxForVisualization(stages)

      expect(result).not.toBeNull()
      expect(result?.unit).toBe('km/h')
      expect(result?.intensity).toBeGreaterThan(0)
      expect(result?.lactate).toBeGreaterThan(0)
    })

    it('should calculate D-max for cycling test with power values', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, power: 150, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, power: 200, heartRate: 140, lactate: 1.5 },
        { id: '3', testId: 't1', sequence: 3, power: 250, heartRate: 160, lactate: 3.0 },
        { id: '4', testId: 't1', sequence: 4, power: 300, heartRate: 180, lactate: 6.0 },
      ]

      const result = calculateDmaxForVisualization(stages)

      expect(result).not.toBeNull()
      expect(result?.unit).toBe('watt')
    })

    it('should return null when no valid intensity data exists', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, heartRate: 140, lactate: 2.0 },
        { id: '3', testId: 't1', sequence: 3, heartRate: 160, lactate: 4.0 },
        { id: '4', testId: 't1', sequence: 4, heartRate: 180, lactate: 6.0 },
      ]

      const result = calculateDmaxForVisualization(stages)
      expect(result).toBeNull()
    })
  })

  describe('calculateAerobicThreshold', () => {
    it('should calculate aerobic threshold for running test data', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, speed: 10, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, speed: 12, heartRate: 135, lactate: 1.8 },
        { id: '3', testId: 't1', sequence: 3, speed: 13, heartRate: 145, lactate: 2.2 },
        { id: '4', testId: 't1', sequence: 4, speed: 14, heartRate: 155, lactate: 3.0 },
        { id: '5', testId: 't1', sequence: 5, speed: 15, heartRate: 165, lactate: 4.5 },
        { id: '6', testId: 't1', sequence: 6, speed: 16, heartRate: 175, lactate: 6.0 },
      ]

      const result = calculateAerobicThreshold(stages)

      expect(result).not.toBeNull()
      // Result should have valid structure
      expect(result?.heartRate).toBeGreaterThan(0)
      expect(result?.value).toBeGreaterThan(0)
      expect(result?.unit).toBe('km/h')
    })

    it('should return null for empty stages', () => {
      const result = calculateAerobicThreshold([])
      expect(result).toBeNull()
    })

    it('should handle cycling tests with power values', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, power: 150, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, power: 200, heartRate: 140, lactate: 2.0 },
        { id: '3', testId: 't1', sequence: 3, power: 250, heartRate: 160, lactate: 4.0 },
        { id: '4', testId: 't1', sequence: 4, power: 300, heartRate: 175, lactate: 6.0 },
      ]

      const result = calculateAerobicThreshold(stages)

      expect(result?.unit).toBe('watt')
    })
  })

  describe('calculateAnaerobicThreshold', () => {
    it('should calculate anaerobic threshold at approximately 4.0 mmol/L', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, speed: 10, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, speed: 12, heartRate: 140, lactate: 2.0 },
        { id: '3', testId: 't1', sequence: 3, speed: 14, heartRate: 160, lactate: 4.0 },
        { id: '4', testId: 't1', sequence: 4, speed: 16, heartRate: 175, lactate: 6.0 },
        { id: '5', testId: 't1', sequence: 5, speed: 17, heartRate: 185, lactate: 8.0 },
      ]

      const result = calculateAnaerobicThreshold(stages)

      expect(result).not.toBeNull()
      // Anaerobic threshold should be around HR 160 based on 4.0 mmol/L
      expect(result?.heartRate).toBeGreaterThanOrEqual(155)
      expect(result?.heartRate).toBeLessThanOrEqual(165)
    })

    it('should return null for empty stages', () => {
      const result = calculateAnaerobicThreshold([])
      expect(result).toBeNull()
    })

    it('should handle cycling tests with power values', () => {
      const stages: TestStage[] = [
        { id: '1', testId: 't1', sequence: 1, power: 150, heartRate: 120, lactate: 1.0 },
        { id: '2', testId: 't1', sequence: 2, power: 200, heartRate: 140, lactate: 2.0 },
        { id: '3', testId: 't1', sequence: 3, power: 250, heartRate: 160, lactate: 4.0 },
        { id: '4', testId: 't1', sequence: 4, power: 300, heartRate: 175, lactate: 6.0 },
      ]

      const result = calculateAnaerobicThreshold(stages)

      expect(result?.unit).toBe('watt')
    })
  })
})

describe('Linear Interpolation Edge Cases', () => {
  it('should calculate thresholds correctly when lactate exactly equals target', () => {
    const stages: TestStage[] = [
      { id: '1', testId: 't1', sequence: 1, speed: 10, heartRate: 120, lactate: 1.0 },
      { id: '2', testId: 't1', sequence: 2, speed: 12, heartRate: 140, lactate: 2.0 }, // Exactly 2.0
      { id: '3', testId: 't1', sequence: 3, speed: 14, heartRate: 160, lactate: 4.0 }, // Exactly 4.0
      { id: '4', testId: 't1', sequence: 4, speed: 16, heartRate: 175, lactate: 6.0 },
    ]

    const aerobic = calculateAerobicThreshold(stages)
    const anaerobic = calculateAnaerobicThreshold(stages)

    // Both thresholds should return valid results
    expect(aerobic).not.toBeNull()
    expect(anaerobic).not.toBeNull()

    // Both should have valid heart rate values within the test range
    expect(aerobic?.heartRate).toBeGreaterThan(0)
    expect(aerobic?.heartRate).toBeLessThan(180)
    expect(anaerobic?.heartRate).toBeGreaterThan(0)
    expect(anaerobic?.heartRate).toBeLessThan(180)
  })

  it('should handle monotonically increasing lactate values', () => {
    const stages: TestStage[] = [
      { id: '1', testId: 't1', sequence: 1, speed: 8, heartRate: 110, lactate: 0.8 },
      { id: '2', testId: 't1', sequence: 2, speed: 10, heartRate: 125, lactate: 1.2 },
      { id: '3', testId: 't1', sequence: 3, speed: 12, heartRate: 140, lactate: 1.8 },
      { id: '4', testId: 't1', sequence: 4, speed: 14, heartRate: 155, lactate: 2.5 },
      { id: '5', testId: 't1', sequence: 5, speed: 15, heartRate: 165, lactate: 3.5 },
      { id: '6', testId: 't1', sequence: 6, speed: 16, heartRate: 172, lactate: 4.2 },
      { id: '7', testId: 't1', sequence: 7, speed: 17, heartRate: 180, lactate: 5.5 },
    ]

    const aerobic = calculateAerobicThreshold(stages)
    const anaerobic = calculateAnaerobicThreshold(stages)

    // Both thresholds should return valid results
    expect(aerobic).not.toBeNull()
    expect(anaerobic).not.toBeNull()

    // Both should have valid heart rate values
    expect(aerobic?.heartRate).toBeGreaterThan(0)
    expect(aerobic?.heartRate).toBeLessThan(190)
    expect(anaerobic?.heartRate).toBeGreaterThan(0)
    expect(anaerobic?.heartRate).toBeLessThan(190)
  })
})
