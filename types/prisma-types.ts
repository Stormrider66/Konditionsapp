import { Prisma } from '@prisma/client'

/**
 * Full Program type with all nested relations commonly used in the Dashboard and Coach views.
 * Matches the query in `app/coach/programs/[id]/page.tsx` and `app/athlete/dashboard/page.tsx`
 */
export type ProgramWithWeeks = Prisma.TrainingProgramGetPayload<{
  include: {
    client: {
      select: {
        id: true
        name: true
        email: true
        gender: true
        birthDate: true
      }
    }
    test: {
      select: {
        id: true
        testDate: true
        testType: true
        vo2max: true
        trainingZones: true
      }
    }
    weeks: {
      include: {
        days: {
          include: {
            workouts: {
              include: {
                segments: {
                  include: {
                    exercise: true
                  }
                }
                logs: true
              }
            }
          }
        }
      }
    }
  }
}>

export type WeekWithDays = ProgramWithWeeks['weeks'][number]
export type DayWithWorkouts = WeekWithDays['days'][number]
export type WorkoutWithSegments = DayWithWorkouts['workouts'][number]
export type SegmentWithExercise = WorkoutWithSegments['segments'][number]

/**
 * Lightweight summary for Active Programs dashboard widget
 */
export type ActiveProgramSummary = Prisma.TrainingProgramGetPayload<{
  select: {
    id: true
    name: true
    startDate: true
    endDate: true
    weeks: {
      select: {
        id: true
        weekNumber: true
        phase: true
      }
    }
  }
}>

/**
 * Optimized Workout Fetch for Dashboard
 */
export type DashboardWorkout = Prisma.WorkoutGetPayload<{
  include: {
    day: true
    segments: {
      include: {
        exercise: true
      }
    }
    logs: true
  }
}>

export type DashboardWorkoutWithContext = DashboardWorkout & {
  programId: string
  programName: string
  dayDate: Date // Populated by the fetcher logic (day.date)
  // Optional scheduling fields (from assignment models)
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
  location?: { id: string; name: string } | null
}

/**
 * Dashboard Activity Log with workout context
 */
export type DashboardActivityLog = Prisma.WorkoutLogGetPayload<{
  include: {
    workout: {
      select: {
        id: true
        name: true
        type: true
        intensity: true
      }
    }
  }
}>
