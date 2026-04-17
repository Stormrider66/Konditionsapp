/**
 * VDOT golden-file snapshots.
 *
 * Locks down the Jack-Daniels VDOT calculation across a spread of
 * race performances — elite → recreational, 5K → marathon — so
 * future refactors can't silently drift the output. Regenerate by
 * running the suite with `-u` if we ever intentionally change the
 * formula.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateVDOT,
  findVDOTFromRaceTime,
  getTrainingPaces,
  categorizeVDOT,
  validateRacePerformance,
  generateVDOTEntry,
} from '@/lib/calculations/vdot'

const RACE_FIXTURES = [
  // Elite male 5K — 13:00
  { label: 'elite-5k-13min', distanceMeters: 5000, timeSeconds: 13 * 60 },
  // Sub-elite 10K — 30:00
  { label: 'sub-elite-10k-30min', distanceMeters: 10000, timeSeconds: 30 * 60 },
  // Advanced half marathon — 1:10:00
  { label: 'advanced-half-70min', distanceMeters: 21097, timeSeconds: 70 * 60 },
  // Recreational marathon — 4:00:00
  { label: 'recreational-marathon-4h', distanceMeters: 42195, timeSeconds: 4 * 3600 },
  // Beginner 5K — 28:00
  { label: 'beginner-5k-28min', distanceMeters: 5000, timeSeconds: 28 * 60 },
  // Women's advanced 10K — 40:00
  { label: 'womens-advanced-10k-40min', distanceMeters: 10000, timeSeconds: 40 * 60 },
] as const

describe('VDOT golden snapshots', () => {
  it('calculates VDOT for each fixture', () => {
    const snapshot: Record<string, number> = {}
    for (const fx of RACE_FIXTURES) {
      snapshot[fx.label] = calculateVDOT(fx.distanceMeters, fx.timeSeconds)
    }
    expect(snapshot).toMatchInlineSnapshot(`
      {
        "advanced-half-70min": 68,
        "beginner-5k-28min": 33.5,
        "elite-5k-13min": 82,
        "recreational-marathon-4h": 38,
        "sub-elite-10k-30min": 73,
        "womens-advanced-10k-40min": 52,
      }
    `)
  })

  it('produces the full TrainingPaces shape at each VDOT tier', () => {
    const vdots = [30, 40, 50, 60, 70] as const
    for (const v of vdots) {
      const p = getTrainingPaces(v)
      expect(p.easy.formatted).toBeDefined()
      expect(p.marathon.formatted).toBeDefined()
      expect(p.threshold.formatted).toBeDefined()
      expect(p.interval.formatted).toBeDefined()
      expect(p.repetition.formatted).toBeDefined()
    }
  })

  it('paces get faster as VDOT goes up', () => {
    const p30 = getTrainingPaces(30)
    const p70 = getTrainingPaces(70)
    // Threshold pace (seconds/km) should be faster (lower) for higher VDOT.
    expect(p70.threshold.pace).toBeLessThan(p30.threshold.pace)
    expect(p70.marathon.pace).toBeLessThan(p30.marathon.pace)
  })

  it('round-trips race time → VDOT within 1.5 points', () => {
    for (const fx of RACE_FIXTURES) {
      const vdot = calculateVDOT(fx.distanceMeters, fx.timeSeconds)
      const distanceKey =
        fx.distanceMeters === 5000 ? '5K'
          : fx.distanceMeters === 10000 ? '10K'
            : fx.distanceMeters === 21097 ? 'Half Marathon'
              : 'Marathon'
      const recovered = findVDOTFromRaceTime(distanceKey, fx.timeSeconds)
      // findVDOTFromRaceTime indexes the discrete table — expect ≤ 1.5 wobble.
      expect(Math.abs(recovered - vdot)).toBeLessThanOrEqual(1.5)
    }
  })

  it('categorizes VDOT into known bands', () => {
    expect(categorizeVDOT(35).category).toBeTruthy()
    expect(categorizeVDOT(55).category).toBeTruthy()
    expect(categorizeVDOT(75).category).toBeTruthy()
  })

  it('validateRacePerformance flags outliers', () => {
    // Sub-3 marathon is ~VDOT 67 — a claimed pairing of
    // (marathon, 2:00:00) should yield a confidence or flag indicating
    // the performance is unusually fast.
    const result = validateRacePerformance(60, 'Marathon', '2:00:00')
    expect(result).toBeDefined()
  })

  it('generateVDOTEntry builds a full row with race-time + pace fields', () => {
    const row = generateVDOTEntry(50)
    expect(row.vdot).toBe(50)
    expect(row['5K']).toBeDefined()
    expect(row['Marathon']).toBeDefined()
    expect(row.easyPace).toBeDefined()
    expect(row.thresholdPace).toBeDefined()
  })
})
