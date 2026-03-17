import { generateDailyGuidance } from '@/lib/nutrition-timing'
import type { GuidanceGeneratorInput, WorkoutContext } from '@/lib/nutrition-timing'

function createInput(todaysWorkouts: WorkoutContext[]): GuidanceGeneratorInput {
  return {
    client: {
      id: 'client-1',
      weightKg: 70,
      heightCm: 175,
    },
    preferences: null,
    goal: null,
    sportProfile: null,
    todaysWorkouts,
    tomorrowsWorkouts: [],
    currentTime: new Date('2026-03-17T09:00:00.000Z'),
    bodyComposition: {
      bmrKcal: 1600,
    },
  }
}

function createWorkout(overrides: Partial<WorkoutContext> = {}): WorkoutContext {
  return {
    id: 'workout-1',
    name: 'Threshold Run',
    type: 'RUNNING',
    intensity: 'THRESHOLD',
    duration: 60,
    distance: 10,
    scheduledTime: new Date('2026-03-17T18:00:00.000Z'),
    source: 'PROGRAM',
    status: 'PLANNED',
    isToday: true,
    isTomorrow: false,
    daysUntil: 0,
    ...overrides,
  }
}

describe('generateDailyGuidance', () => {
  it('keeps base calorie targets for planned workouts that are not completed', () => {
    const plannedGuidance = generateDailyGuidance(createInput([createWorkout()]))
    const completedGuidance = generateDailyGuidance(
      createInput([
        createWorkout({
          status: 'COMPLETED',
          scheduledTime: new Date('2026-03-17T07:30:00.000Z'),
        }),
      ])
    )

    expect(plannedGuidance.targets.caloriesKcal).toBeLessThan(completedGuidance.targets.caloriesKcal)
    expect(plannedGuidance.preWorkoutGuidance).toHaveLength(1)
    expect(plannedGuidance.postWorkoutGuidance).toHaveLength(0)
  })

  it('raises calorie targets only for completed workouts and shows post-workout guidance', () => {
    const guidance = generateDailyGuidance(
      createInput([
        createWorkout({
          status: 'COMPLETED',
          scheduledTime: new Date('2026-03-17T07:30:00.000Z'),
        }),
      ])
    )

    expect(guidance.targets.caloriesKcal).toBeGreaterThan(2000)
    expect(guidance.preWorkoutGuidance).toHaveLength(0)
    expect(guidance.postWorkoutGuidance).toHaveLength(1)
  })
})
