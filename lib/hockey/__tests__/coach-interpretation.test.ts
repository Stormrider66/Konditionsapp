import { describe, expect, it } from 'vitest'
import { buildHockeyCoachInterpretations } from '../coach-interpretation'

describe('buildHockeyCoachInterpretations aerobic signals', () => {
  it('flags a missing aerobic anchor when VO2, LT2 and beep are absent', () => {
    const interpretations = buildHockeyCoachInterpretations({
      latest: {
        metrics: {
          beepScore: null,
          vo2Max: null,
          lt2SpeedKmh: null,
        },
      },
      trends: [],
    })

    expect(interpretations.some((item) => item.id === 'aerobic-baseline-missing')).toBe(true)
  })

  it('recognizes LT2 efficiency gains when VO2 is stable', () => {
    const interpretations = buildHockeyCoachInterpretations({
      latest: {
        metrics: {
          beepScore: 13.2,
          vo2Max: 58.2,
          lt1SpeedKmh: 12.8,
          lt2SpeedKmh: 15.4,
          maxLactate: 10.5,
        },
      },
      trends: [
        {
          key: 'lt2SpeedKmh',
          delta: 0.5,
          percentChange: 3.4,
          isImprovement: true,
        },
        {
          key: 'vo2Max',
          delta: 0.2,
          percentChange: 0.3,
          isImprovement: true,
        },
      ],
    })

    expect(interpretations.some((item) => item.id === 'lt2-efficiency-gain')).toBe(true)
  })

  it('adds context for low max lactate profiles', () => {
    const interpretations = buildHockeyCoachInterpretations({
      latest: {
        metrics: {
          beepScore: 12.6,
          vo2Max: 55,
          lt2SpeedKmh: 14.8,
          maxLactate: 7.4,
          maxHeartRate: 184,
        },
      },
      trends: [],
    })

    expect(interpretations.some((item) => item.id === 'low-lactate-profile')).toBe(true)
  })
})
