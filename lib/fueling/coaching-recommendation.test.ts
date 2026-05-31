import { describe, expect, it } from 'vitest'
import { buildFuelingCoachingRecommendation } from './coaching-recommendation'

describe('buildFuelingCoachingRecommendation', () => {
  it('reduces the next target when stomach response is poor', () => {
    const recommendation = buildFuelingCoachingRecommendation({
      raceTargetGPerHour: 90,
      logs: [
        {
          plannedCarbsGPerHour: 75,
          actualCarbsGPerHour: 70,
          stomachRating: 2,
          energyRating: 3,
          productsUsed: [{ label: 'Gel', count: 3, carbsPerItemG: 25, totalCarbsG: 75 }],
        },
      ],
    })

    expect(recommendation.status).toBe('REDUCE')
    expect(recommendation.nextTargetGPerHour).toBe(60)
    expect(recommendation.productEn).toContain('adjust')
    expect(recommendation.productEn).toContain('3 gel at 25 g')
    expect(recommendation.productSv).toContain('justera')
    expect(recommendation.productSv).toContain('3 gel à 25 g')
  })

  it('progresses when latest log is stable', () => {
    const recommendation = buildFuelingCoachingRecommendation({
      raceTargetGPerHour: 90,
      logs: [
        {
          plannedCarbsGPerHour: 75,
          actualCarbsGPerHour: 75,
          stomachRating: 5,
          energyRating: 4,
        },
      ],
    })

    expect(recommendation.status).toBe('PROGRESS')
    expect(recommendation.nextTargetGPerHour).toBe(80)
  })

  it('marks race target ready after repeated stable target-level logs', () => {
    const recommendation = buildFuelingCoachingRecommendation({
      raceTargetGPerHour: 90,
      logs: [
        {
          plannedCarbsGPerHour: 90,
          actualCarbsGPerHour: 90,
          stomachRating: 4,
          energyRating: 4,
        },
        {
          plannedCarbsGPerHour: 85,
          actualCarbsGPerHour: 88,
          stomachRating: 5,
          energyRating: 4,
        },
      ],
    })

    expect(recommendation.status).toBe('RACE_READY')
    expect(recommendation.nextTargetGPerHour).toBe(90)
  })
})
