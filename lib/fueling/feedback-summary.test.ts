import { describe, expect, it } from 'vitest'
import { adaptCarbTargetFromFeedback, type FuelingFeedbackSummary } from './feedback-summary'

function summary(overrides: Partial<FuelingFeedbackSummary>): FuelingFeedbackSummary {
  return {
    count: 3,
    averageActualCarbsGPerHour: 75,
    averagePlannedCarbsGPerHour: 80,
    averageStomachRating: 4,
    averageEnergyRating: 4,
    bestToleratedCarbsGPerHour: 75,
    latestActualCarbsGPerHour: 75,
    status: 'ON_TRACK',
    ...overrides,
  }
}

describe('adaptCarbTargetFromFeedback', () => {
  it('keeps the planned target when there is no feedback yet', () => {
    const target = adaptCarbTargetFromFeedback(80, summary({
      count: 0,
      status: 'NO_DATA',
      averageActualCarbsGPerHour: null,
      averagePlannedCarbsGPerHour: null,
      averageStomachRating: null,
      averageEnergyRating: null,
      bestToleratedCarbsGPerHour: null,
      latestActualCarbsGPerHour: null,
    }))

    expect(target).toBe(80)
  })

  it('backs off from the planned target when stomach feedback is poor', () => {
    const target = adaptCarbTargetFromFeedback(90, summary({
      status: 'REDUCE',
      bestToleratedCarbsGPerHour: 65,
      latestActualCarbsGPerHour: 70,
      averageStomachRating: 2,
    }))

    expect(target).toBe(65)
  })

  it('holds near the latest actual intake when the athlete missed the plan', () => {
    const target = adaptCarbTargetFromFeedback(95, summary({
      status: 'HOLD',
      latestActualCarbsGPerHour: 62,
      averageActualCarbsGPerHour: 60,
    }))

    expect(target).toBe(65)
  })

  it('progresses gradually when recent sessions are stable', () => {
    const target = adaptCarbTargetFromFeedback(85, summary({
      status: 'READY_TO_PROGRESS',
      averageActualCarbsGPerHour: 86,
      averageStomachRating: 4.5,
    }))

    expect(target).toBe(90)
  })
})
