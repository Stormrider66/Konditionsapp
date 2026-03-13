import { describe, it, expect } from 'vitest'
import { runParameterSweep, evaluateConfig, computeMetrics } from '../parameter-sweep'
import {
  DEFAULT_CONFIG,
  generateParameterGrid,
  classifyAthleteProfileWithConfig,
  runFullDetectionWithConfig,
} from '../tunable-config'
import { GOLD_STANDARD_CASES, getGoldStandardByProfile } from '../gold-standard'

describe('Parameterized Wrappers', () => {
  it('classifies elite profiles correctly with default config', () => {
    const eliteCases = getGoldStandardByProfile('ELITE_FLAT')
    for (const c of eliteCases) {
      // Borderline cases may be classified differently
      if (c.id === 'elite-borderline-01') continue
      const profile = classifyAthleteProfileWithConfig(c.data, DEFAULT_CONFIG)
      expect(profile.type).toBe('ELITE_FLAT')
    }
  })

  it('classifies standard profiles correctly with default config', () => {
    const standardCases = getGoldStandardByProfile('STANDARD')
    for (const c of standardCases) {
      if (c.id === 'edge-elevated-baseline') continue // edge case may vary
      const profile = classifyAthleteProfileWithConfig(c.data, DEFAULT_CONFIG)
      expect(['STANDARD', 'RECREATIONAL']).toContain(profile.type)
    }
  })

  it('reclassifies when thresholds change', () => {
    const eliteCase = GOLD_STANDARD_CASES.find(c => c.id === 'elite-marathon-01')!

    // Default config should classify as ELITE_FLAT
    const defaultProfile = classifyAthleteProfileWithConfig(eliteCase.data, DEFAULT_CONFIG)
    expect(defaultProfile.type).toBe('ELITE_FLAT')

    // Very restrictive config should classify as STANDARD
    const strictConfig = structuredClone(DEFAULT_CONFIG)
    strictConfig.eliteClassification.traditionalBaselineMax = 0.5 // Very restrictive
    strictConfig.eliteClassification.highRangeLactateMin = 10.0  // Impossible
    strictConfig.eliteClassification.veryLowBaselineMax = 0.3    // Very restrictive

    const strictProfile = classifyAthleteProfileWithConfig(eliteCase.data, strictConfig)
    expect(strictProfile.type).not.toBe('ELITE_FLAT')
  })

  it('runFullDetectionWithConfig returns valid LT1 and LT2', () => {
    for (const testCase of GOLD_STANDARD_CASES.slice(0, 5)) {
      const result = runFullDetectionWithConfig(testCase.data, DEFAULT_CONFIG)

      // Should detect at least one threshold
      const hasThreshold = result.lt1 !== null || result.lt2 !== null
      expect(hasThreshold).toBe(true)

      // LT1 should be lower intensity than LT2 if both detected
      if (result.lt1 && result.lt2) {
        expect(result.lt1.intensity).toBeLessThan(result.lt2.intensity)
      }
    }
  })
})

describe('Parameter Grid Generation', () => {
  it('generates a reasonable number of configs', () => {
    const grid = generateParameterGrid()
    expect(grid.length).toBeGreaterThanOrEqual(30)
    expect(grid.length).toBeLessThanOrEqual(500)
  })

  it('includes the default config', () => {
    const grid = generateParameterGrid()
    const hasDefault = grid.some(c =>
      c.bishopModDmax.riseThreshold === DEFAULT_CONFIG.bishopModDmax.riseThreshold &&
      c.dmax.r2MinFallback === DEFAULT_CONFIG.dmax.r2MinFallback &&
      c.baselinePlus.eliteDelta === DEFAULT_CONFIG.baselinePlus.eliteDelta
    )
    expect(hasDefault).toBe(true)
  })
})

describe('Config Evaluation', () => {
  it('evaluates default config with valid metrics', () => {
    const result = evaluateConfig(DEFAULT_CONFIG, GOLD_STANDARD_CASES)

    expect(result.metrics.casesEvaluated).toBe(GOLD_STANDARD_CASES.length)
    expect(result.metrics.combinedScore).toBeGreaterThan(0)
    expect(result.metrics.lt2MeanAbsoluteError).toBeLessThan(10)
    expect(result.caseResults.length).toBe(GOLD_STANDARD_CASES.length)
  })

  it('each case result has valid structure', () => {
    const result = evaluateConfig(DEFAULT_CONFIG, GOLD_STANDARD_CASES)

    for (const cr of result.caseResults) {
      expect(cr.caseId).toBeTruthy()
      expect(cr.profileType).toBeTruthy()
      expect(typeof cr.lt1Hit).toBe('boolean')
      expect(typeof cr.lt2Hit).toBe('boolean')
    }
  })
})

describe('computeMetrics', () => {
  it('handles empty results', () => {
    const metrics = computeMetrics([])
    expect(metrics.casesEvaluated).toBe(0)
    expect(metrics.combinedScore).toBe(0)
  })

  it('computes perfect score for perfect predictions', () => {
    const perfectResults = [{
      caseId: 'test',
      profileType: 'STANDARD' as const,
      lt1Predicted: { intensity: 10, lactate: 2 },
      lt2Predicted: { intensity: 13, lactate: 4 },
      lt1Error: 0,
      lt2Error: 0,
      lt1Hit: true,
      lt2Hit: true,
      algorithmUsed: 'DMAX',
    }]

    const metrics = computeMetrics(perfectResults)
    expect(metrics.lt1MeanAbsoluteError).toBe(0)
    expect(metrics.lt2MeanAbsoluteError).toBe(0)
    expect(metrics.lt1Within05).toBe(100)
    expect(metrics.lt2Within05).toBe(100)
    expect(metrics.combinedScore).toBe(100)
  })
})

describe('Full Parameter Sweep', () => {
  it('completes without error and produces valid results', () => {
    const sweep = runParameterSweep()

    expect(sweep.configsTested).toBeGreaterThan(0)
    expect(sweep.bestScore).toBeGreaterThan(0)
    expect(sweep.durationMs).toBeGreaterThan(0)
    expect(sweep.bestConfig).toBeDefined()
  })

  it('best config scores at least as well as default', () => {
    const sweep = runParameterSweep()
    const defaultResult = evaluateConfig(DEFAULT_CONFIG, GOLD_STANDARD_CASES)

    expect(sweep.bestScore).toBeGreaterThanOrEqual(defaultResult.metrics.combinedScore)
  })

  it('produces per-profile results', () => {
    const sweep = runParameterSweep()

    expect(sweep.profileResults).toHaveProperty('ELITE_FLAT')
    expect(sweep.profileResults).toHaveProperty('STANDARD')
    expect(sweep.profileResults).toHaveProperty('RECREATIONAL')

    for (const result of Object.values(sweep.profileResults)) {
      expect(result.bestScore).toBeGreaterThanOrEqual(0)
      expect(result.bestConfig).toBeDefined()
    }
  })

  it('is deterministic (same results on repeated runs)', () => {
    const run1 = runParameterSweep()
    const run2 = runParameterSweep()

    expect(run1.bestScore).toBe(run2.bestScore)
    expect(run1.configsTested).toBe(run2.configsTested)
  })

  it('runs in under 30 seconds', () => {
    const sweep = runParameterSweep()
    expect(sweep.durationMs).toBeLessThan(30000)
  })
})
