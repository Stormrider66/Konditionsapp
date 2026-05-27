import { describe, expect, it } from 'vitest'
import {
  aggregateLactateByHeartRate,
  buildReliableLactateHeartRateFit,
  getLactateHeartRatePoints,
} from '@/lib/lactate/heart-rate-chart'

describe('lactate heart-rate chart helpers', () => {
  it('filters missing and invalid values without turning null lactate into zero', () => {
    expect(getLactateHeartRatePoints([
      { heartRate: 130, lactate: 1.2 },
      { heartRate: 140, lactate: null },
      { heartRate: null, lactate: 2.0 },
      { heartRate: 150, lactate: Number.NaN },
    ])).toEqual([{ heartRate: 130, lactate: 1.2 }])
  })

  it('keeps a normal lactate and heart-rate curve eligible for polynomial display', () => {
    const points = getLactateHeartRatePoints([
      { heartRate: 130, lactate: 1.2 },
      { heartRate: 140, lactate: 1.5 },
      { heartRate: 148, lactate: 1.8 },
      { heartRate: 158, lactate: 2.3 },
      { heartRate: 168, lactate: 3.2 },
      { heartRate: 178, lactate: 5.1 },
      { heartRate: 188, lactate: 8.5 },
    ])

    const fit = buildReliableLactateHeartRateFit(points)

    expect(fit.status).toBe('reliable')
    expect(fit.r2).toBeGreaterThan(0.85)
    expect(fit.curve.length).toBeGreaterThan(0)
  })

  it('hides the polynomial when an outlier makes the heart-rate fit unreliable', () => {
    const points = getLactateHeartRatePoints([
      { heartRate: 132, lactate: 3.1 },
      { heartRate: 150, lactate: 3.8 },
      { heartRate: 160, lactate: 18.4 },
      { heartRate: 161, lactate: 4.7 },
      { heartRate: 168, lactate: 5.5 },
    ])

    const fit = buildReliableLactateHeartRateFit(points)

    expect(fit.status).toBe('low_r2')
    expect(fit.r2).toBeLessThan(0.85)
  })

  it('averages duplicate heart-rate values before fitting so singular matrices do not break the chart', () => {
    const points = getLactateHeartRatePoints([
      { heartRate: 140, lactate: 1.5 },
      { heartRate: 140, lactate: 1.7 },
      { heartRate: 150, lactate: 2.0 },
      { heartRate: 160, lactate: 3.0 },
      { heartRate: 170, lactate: 4.5 },
    ])

    expect(aggregateLactateByHeartRate(points)).toEqual([
      { heartRate: 140, lactate: 1.6 },
      { heartRate: 150, lactate: 2.0 },
      { heartRate: 160, lactate: 3.0 },
      { heartRate: 170, lactate: 4.5 },
    ])
    expect(buildReliableLactateHeartRateFit(points).status).not.toBe('fit_failed')
  })

  it('reports too little data when there are fewer than four unique heart-rate values', () => {
    const points = getLactateHeartRatePoints([
      { heartRate: 140, lactate: 1.5 },
      { heartRate: 150, lactate: 2.0 },
      { heartRate: 150, lactate: 2.2 },
      { heartRate: 160, lactate: 3.0 },
    ])

    const fit = buildReliableLactateHeartRateFit(points)

    expect(fit.status).toBe('not_enough_unique_heart_rates')
    expect(fit.r2).toBeNull()
    expect(fit.curve).toEqual([])
  })
})
