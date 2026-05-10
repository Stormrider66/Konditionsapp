import { describe, expect, it } from 'vitest'
import { buildFuelingSessionFeedback } from './session-feedback'

describe('buildFuelingSessionFeedback', () => {
  it('reduces the next target when stomach rating is low', () => {
    const feedback = buildFuelingSessionFeedback({
      plannedCarbsGPerHour: 75,
      actualCarbsGPerHour: 70,
      stomachRating: 2,
      energyRating: 3,
    })

    expect(feedback.status).toBe('REDUCE')
    expect(feedback.nextTargetGPerHour).toBe(60)
  })

  it('progresses when intake, stomach and energy are stable', () => {
    const feedback = buildFuelingSessionFeedback({
      plannedCarbsGPerHour: 75,
      actualCarbsGPerHour: 75,
      stomachRating: 5,
      energyRating: 4,
    })

    expect(feedback.status).toBe('PROGRESS')
    expect(feedback.nextTargetGPerHour).toBe(80)
  })

  it('builds up gradually when actual intake missed the plan', () => {
    const feedback = buildFuelingSessionFeedback({
      plannedCarbsGPerHour: 85,
      actualCarbsGPerHour: 55,
      stomachRating: 4,
      energyRating: 4,
    })

    expect(feedback.status).toBe('HOLD')
    expect(feedback.nextTargetGPerHour).toBe(60)
  })
})
