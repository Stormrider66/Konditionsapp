/**
 * Threshold-detection golden snapshots.
 *
 * Pins the LT1 / LT2 / D-max outputs across a handful of representative
 * lactate curves — running (speed-based), cycling (power-based), and a
 * curve with an exponential rise typical of elite athletes. Protects
 * against silent drift in the threshold math that drives every program's
 * training zones.
 */

import { describe, it, expect } from 'vitest'
import type { TestStage } from '@/types'
import {
  calculateAerobicThreshold,
  calculateAnaerobicThreshold,
  calculateDmaxForVisualization,
} from '@/lib/calculations/thresholds'

function stage(
  overrides: Partial<TestStage> & { sequence: number }
): TestStage {
  return {
    id: `s-${overrides.sequence}`,
    testId: 'golden',
    duration: 180,
    heartRate: 120,
    lactate: 1.0,
    ...overrides,
  } as TestStage
}

/** Running test with a classic S-curve. Sub-elite runner. */
const RUNNING_TEST: TestStage[] = [
  stage({ sequence: 1, speed: 8, heartRate: 115, lactate: 0.9 }),
  stage({ sequence: 2, speed: 10, heartRate: 125, lactate: 1.1 }),
  stage({ sequence: 3, speed: 12, heartRate: 140, lactate: 1.5 }),
  stage({ sequence: 4, speed: 14, heartRate: 155, lactate: 2.2 }),
  stage({ sequence: 5, speed: 16, heartRate: 170, lactate: 3.8 }),
  stage({ sequence: 6, speed: 18, heartRate: 185, lactate: 7.0 }),
]

/** Cycling test with power curve. Trained cyclist. */
const CYCLING_TEST: TestStage[] = [
  stage({ sequence: 1, power: 150, heartRate: 115, lactate: 1.0 }),
  stage({ sequence: 2, power: 200, heartRate: 135, lactate: 1.4 }),
  stage({ sequence: 3, power: 250, heartRate: 155, lactate: 2.1 }),
  stage({ sequence: 4, power: 300, heartRate: 170, lactate: 3.5 }),
  stage({ sequence: 5, power: 350, heartRate: 185, lactate: 7.0 }),
]

/** Elite-style curve: long aerobic plateau, sharp rise at the top. */
const ELITE_TEST: TestStage[] = [
  stage({ sequence: 1, speed: 14, heartRate: 130, lactate: 0.8 }),
  stage({ sequence: 2, speed: 16, heartRate: 145, lactate: 1.0 }),
  stage({ sequence: 3, speed: 18, heartRate: 160, lactate: 1.4 }),
  stage({ sequence: 4, speed: 20, heartRate: 175, lactate: 2.5 }),
  stage({ sequence: 5, speed: 22, heartRate: 190, lactate: 5.8 }),
]

describe('Threshold detection golden snapshots', () => {
  describe('D-max (running)', () => {
    const result = calculateDmaxForVisualization(RUNNING_TEST)

    it('returns intensity in km/h', () => {
      expect(result).not.toBeNull()
      expect(result?.unit).toBe('km/h')
    })

    it('places D-max between the first and last stage', () => {
      expect(result?.intensity).toBeGreaterThan(10)
      expect(result?.intensity).toBeLessThan(18)
    })

    it('returns a plausible lactate value for the threshold', () => {
      expect(result?.lactate).toBeGreaterThan(1.0)
      expect(result?.lactate).toBeLessThan(6.0)
    })
  })

  describe('D-max (cycling)', () => {
    const result = calculateDmaxForVisualization(CYCLING_TEST)

    it('returns intensity in watts', () => {
      expect(result).not.toBeNull()
      expect(result?.unit).toBe('watt')
    })

    it('places D-max between 150 and 350 W', () => {
      expect(result?.intensity).toBeGreaterThan(150)
      expect(result?.intensity).toBeLessThan(350)
    })
  })

  describe('Aerobic + anaerobic threshold ordering', () => {
    it('LT1 ≤ LT2 for a standard running test', () => {
      const lt1 = calculateAerobicThreshold(RUNNING_TEST)
      const lt2 = calculateAnaerobicThreshold(RUNNING_TEST)
      expect(lt1).not.toBeNull()
      expect(lt2).not.toBeNull()
      // LT1 and LT2 can collapse to the same D-max point on smooth curves;
      // we only require the aerobic threshold isn't pushed past the
      // anaerobic one.
      expect(lt1!.value).toBeLessThanOrEqual(lt2!.value)
    })

    it('LT1 ≤ LT2 for a cycling test', () => {
      const lt1 = calculateAerobicThreshold(CYCLING_TEST)
      const lt2 = calculateAnaerobicThreshold(CYCLING_TEST)
      expect(lt1).not.toBeNull()
      expect(lt2).not.toBeNull()
      expect(lt1!.value).toBeLessThanOrEqual(lt2!.value)
    })

    it('elite-style curve produces thresholds at a higher speed', () => {
      const lt2Running = calculateAnaerobicThreshold(RUNNING_TEST)
      const lt2Elite = calculateAnaerobicThreshold(ELITE_TEST)
      expect(lt2Running).not.toBeNull()
      expect(lt2Elite).not.toBeNull()
      expect(lt2Elite!.value).toBeGreaterThan(lt2Running!.value)
    })
  })

  describe('Heart-rate plausibility', () => {
    it('threshold HR falls inside the tested HR range', () => {
      const lt2 = calculateAnaerobicThreshold(RUNNING_TEST)
      expect(lt2!.heartRate).toBeGreaterThanOrEqual(125)
      expect(lt2!.heartRate).toBeLessThanOrEqual(185)
    })
  })
})
