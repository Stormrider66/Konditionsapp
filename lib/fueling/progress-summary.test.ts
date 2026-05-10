import { describe, expect, it } from 'vitest'
import { buildFuelingProgressSummary } from './progress-summary'

describe('buildFuelingProgressSummary', () => {
  it('summarizes linked workouts, logged fueling, and best tolerated intake', () => {
    const progress = buildFuelingProgressSummary({
      raceDate: null,
      recommendedCarbsGPerHour: 90,
      workoutPrescriptions: [
        {
          workout: {
            logs: [{
              fuelingLog: {
                actualCarbsGPerHour: 70,
                stomachRating: 4,
                energyRating: 4,
              },
            }],
          },
        },
        {
          workout: {
            logs: [{
              fuelingLog: {
                actualCarbsGPerHour: 80,
                stomachRating: 2,
                energyRating: 4,
              },
            }],
          },
        },
      ],
    })

    expect(progress.linkedWorkoutCount).toBe(2)
    expect(progress.loggedWorkoutCount).toBe(2)
    expect(progress.bestToleratedGPerHour).toBe(70)
    expect(progress.nextBuildUpTargetGPerHour).toBe(70)
    expect(progress.buildUpWeeks).toBe(5)
  })

  it('still builds a progression without logged tolerance', () => {
    const progress = buildFuelingProgressSummary({
      raceDate: null,
      recommendedCarbsGPerHour: 75,
      workoutPrescriptions: [],
    })

    expect(progress.linkedWorkoutCount).toBe(0)
    expect(progress.loggedWorkoutCount).toBe(0)
    expect(progress.bestToleratedGPerHour).toBeNull()
    expect(progress.nextBuildUpTargetGPerHour).toBe(50)
  })
})
