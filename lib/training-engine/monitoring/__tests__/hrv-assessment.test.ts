import { describe, it, expect, beforeAll } from 'vitest'
import {
  assessHRV,
  establishHRVBaseline,
  type HRVMeasurement,
  type HRVBaseline
} from '../hrv-assessment'

let baseline: HRVBaseline
let baselineSeries: HRVMeasurement[]

const DAY_MS = 24 * 60 * 60 * 1000

function createMeasurement(rmssd: number, daysAgo = 0): HRVMeasurement {
  return {
    rmssd,
    quality: 'GOOD',
    artifactPercent: 2,
    duration: 240,
    position: 'SUPINE',
    timestamp: new Date(Date.now() - daysAgo * DAY_MS)
  }
}

beforeAll(() => {
  baselineSeries = Array.from({ length: 14 }, (_, idx) =>
    createMeasurement(60 + idx, 14 - idx)
  )
  baseline = establishHRVBaseline(baselineSeries)
})

describe('HRV Assessment', () => {
  it('rates high-quality measurements as EXCELLENT when above baseline', () => {
    const current = createMeasurement(baseline.mean * 1.05)
    const assessment = assessHRV(current, baseline, baselineSeries.slice(-7))

    expect(assessment.status).toBe('EXCELLENT')
    expect(assessment.score).toBe(10)
    expect(assessment.warnings).toEqual([])
  })

  it('triggers critical warnings for severe HRV suppression', () => {
    const current = createMeasurement(baseline.mean * 0.6)
    const assessment = assessHRV(current, baseline)

    expect(assessment.status).toBe('VERY_POOR')
    expect(assessment.warnings.some(flag => flag.includes('CRITICAL'))).toBe(true)
    expect(assessment.recommendation.toLowerCase()).toContain('rest')
  })

  it('detects declining trends over multiple days', () => {
    const decliningSeries = Array.from({ length: 5 }, (_, idx) =>
      createMeasurement(baseline.mean * (0.97 - idx * 0.02), 5 - idx)
    )
    const current = createMeasurement(baseline.mean * 0.88)

    const assessment = assessHRV(current, baseline, decliningSeries)

    expect(assessment.trend).toBe('DECLINING')
    expect(assessment.consecutiveDeclines).toBeGreaterThanOrEqual(3)
    expect(assessment.warnings.some(flag => flag.includes('consecutive days'))).toBe(true)
  })
})

