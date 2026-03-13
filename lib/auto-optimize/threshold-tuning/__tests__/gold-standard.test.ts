import { describe, it, expect } from 'vitest'
import { GOLD_STANDARD_CASES, getGoldStandard, getGoldStandardByProfile } from '../gold-standard'

describe('Gold Standard Dataset', () => {
  it('has at least 12 cases', () => {
    expect(GOLD_STANDARD_CASES.length).toBeGreaterThanOrEqual(12)
  })

  it('has unique IDs', () => {
    const ids = GOLD_STANDARD_CASES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers all three profile types', () => {
    const types = new Set(GOLD_STANDARD_CASES.map(c => c.profileType))
    expect(types.has('ELITE_FLAT')).toBe(true)
    expect(types.has('STANDARD')).toBe(true)
    expect(types.has('RECREATIONAL')).toBe(true)
  })

  it('each case has at least 5 data points', () => {
    for (const c of GOLD_STANDARD_CASES) {
      expect(c.data.length).toBeGreaterThanOrEqual(5)
    }
  })

  it('intensities are strictly increasing in each case', () => {
    for (const c of GOLD_STANDARD_CASES) {
      for (let i = 1; i < c.data.length; i++) {
        expect(c.data[i].intensity).toBeGreaterThan(c.data[i - 1].intensity)
      }
    }
  })

  it('lactate ends higher than it starts (except contaminated stage 1)', () => {
    for (const c of GOLD_STANDARD_CASES) {
      // Use stage 2 as start for edge case with elevated baseline
      const startIdx = c.id === 'edge-elevated-baseline' ? 1 : 0
      expect(c.data[c.data.length - 1].lactate).toBeGreaterThan(c.data[startIdx].lactate)
    }
  })

  it('expectedLT1 intensity < expectedLT2 intensity', () => {
    for (const c of GOLD_STANDARD_CASES) {
      expect(c.expectedLT1.intensity).toBeLessThan(c.expectedLT2.intensity)
    }
  })

  it('expected thresholds fall within data intensity range', () => {
    for (const c of GOLD_STANDARD_CASES) {
      const minI = c.data[0].intensity
      const maxI = c.data[c.data.length - 1].intensity
      expect(c.expectedLT1.intensity).toBeGreaterThanOrEqual(minI)
      expect(c.expectedLT2.intensity).toBeLessThanOrEqual(maxI)
    }
  })

  it('tolerances are reasonable (0.3-15 intensity units)', () => {
    for (const c of GOLD_STANDARD_CASES) {
      expect(c.expectedLT1.toleranceIntensity).toBeGreaterThanOrEqual(0.3)
      expect(c.expectedLT1.toleranceIntensity).toBeLessThanOrEqual(15)
      expect(c.expectedLT2.toleranceIntensity).toBeGreaterThanOrEqual(0.3)
      expect(c.expectedLT2.toleranceIntensity).toBeLessThanOrEqual(15)
    }
  })

  it('elite cases have low baseline lactate', () => {
    const eliteCases = getGoldStandardByProfile('ELITE_FLAT')
    for (const c of eliteCases) {
      const baseline = c.data.slice(0, 3).reduce((s, d) => s + d.lactate, 0) / 3
      expect(baseline).toBeLessThan(2.0)
    }
  })

  it('recreational cases have higher baseline lactate', () => {
    const recCases = getGoldStandardByProfile('RECREATIONAL')
    for (const c of recCases) {
      expect(c.data[0].lactate).toBeGreaterThanOrEqual(1.8)
    }
  })

  it('getGoldStandard returns all cases', () => {
    expect(getGoldStandard()).toHaveLength(GOLD_STANDARD_CASES.length)
  })

  it('getGoldStandardByProfile filters correctly', () => {
    const elite = getGoldStandardByProfile('ELITE_FLAT')
    const standard = getGoldStandardByProfile('STANDARD')
    const rec = getGoldStandardByProfile('RECREATIONAL')
    expect(elite.length + standard.length + rec.length).toBe(GOLD_STANDARD_CASES.length)
    expect(elite.every(c => c.profileType === 'ELITE_FLAT')).toBe(true)
    expect(standard.every(c => c.profileType === 'STANDARD')).toBe(true)
    expect(rec.every(c => c.profileType === 'RECREATIONAL')).toBe(true)
  })
})
