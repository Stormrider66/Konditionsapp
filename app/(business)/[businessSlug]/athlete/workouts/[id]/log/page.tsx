// app/(business)/[businessSlug]/athlete/workouts/[id]/log/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { WorkoutLogClient } from '@/components/athlete/workout/WorkoutLogClient'

interface BusinessWorkoutLogPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

const RACE_KEYWORDS = ['tävling', 'race', 'lopp', 'time trial', 'test/tävling', 'tävlingslopp']

function isRaceWorkoutName(name: string): boolean {
  const lower = name.toLowerCase()
  return RACE_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export default async function BusinessWorkoutLogPage({ params }: BusinessWorkoutLogPageProps) {
  const { businessSlug, id } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Fetch workout with program info
  const workout = await prisma.workout.findFirst({
    where: {
      id: id,
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: {
                  id: true,
                  name: true,
                  clientId: true,
                  goalRace: true,
                  goalType: true,
                  weeks: {
                    select: {
                      id: true,
                      weekNumber: true,
                      days: {
                        select: {
                          id: true,
                          workouts: {
                            select: {
                              id: true,
                              name: true,
                              logs: {
                                where: {
                                  athleteId: user.id,
                                  completed: true,
                                },
                                select: { id: true },
                                take: 1,
                              },
                            },
                          },
                        },
                      },
                    },
                    orderBy: { weekNumber: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
      segments: {
        orderBy: {
          order: 'asc',
        },
        include: {
          exercise: true,
        },
      },
      logs: {
        where: {
          athleteId: user.id,
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 1,
      },
    },
  })

  if (!workout || !workout.day.week.program) {
    notFound()
  }

  // Verify athlete has access to this program
  if (workout.day.week.program.clientId !== clientId) {
    notFound()
  }

  const existingLog = workout.logs[0]

  // Build race context
  const program = workout.day.week.program
  // Fetch athlete context for post-program "What's Next?" flow
  const athleteContextData = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      isAICoached: true,
      sportProfile: { select: { primarySport: true } },
      athleteSubscription: { select: { assignedCoachId: true } },
    },
  })

  const athleteContext = {
    isAICoached: athleteContextData?.isAICoached ?? false,
    hasCoach: !!athleteContextData?.athleteSubscription?.assignedCoachId,
    primarySport: athleteContextData?.sportProfile?.primarySport ?? null,
  }

  let raceContext = undefined

  if (program.weeks && program.weeks.length > 0) {
    // Flatten all workouts in the program
    const allWorkouts = program.weeks.flatMap((week) =>
      week.days.flatMap((day) => day.workouts)
    )
    const totalWorkouts = allWorkouts.length
    const completedWorkouts = allWorkouts.filter((w) => w.logs.length > 0).length

    // Check if current workout is already logged (don't count it as completed yet)
    const currentIsLogged = allWorkouts.find((w) => w.id === id)?.logs.length ?? 0
    const completedExcludingCurrent = completedWorkouts - (currentIsLogged > 0 ? 1 : 0)

    // This is the last unlogged workout if completing it would finish the program
    const isLastWorkout = completedExcludingCurrent === totalWorkouts - 1

    // Detect race workout
    const isRaceWorkout = isRaceWorkoutName(workout.name)

    // Determine the max week number
    const maxWeekNumber = Math.max(...program.weeks.map((w) => w.weekNumber))
    const currentWeekNumber = workout.day.week.weekNumber

    // Is in final week of a program with a race goal?
    const hasRaceGoal = ['5k', '10k', 'half-marathon', 'marathon', '5K', '10K'].includes(
      program.goalType || ''
    )
    const isInFinalWeek = currentWeekNumber === maxWeekNumber

    // isProgramFinalWorkout: this is the last unlogged workout in the program
    const isProgramFinalWorkout = isLastWorkout

    // isRaceWorkout: race keywords match OR (final week + race goal + last workout)
    const effectiveIsRaceWorkout =
      isRaceWorkout || (isInFinalWeek && hasRaceGoal && isLastWorkout)

    if (isProgramFinalWorkout || effectiveIsRaceWorkout) {
      raceContext = {
        isRaceWorkout: effectiveIsRaceWorkout,
        isProgramFinalWorkout,
        programId: program.id,
        programName: program.name,
        goalType: program.goalType,
        goalRace: program.goalRace,
        isLastWorkout,
        totalWorkouts,
        completedWorkouts: completedExcludingCurrent,
      }
    }
  }

  return (
    <WorkoutLogClient
      workout={workout as any}
      athleteId={user.id}
      existingLog={existingLog as any}
      basePath={basePath}
      raceContext={raceContext}
      athleteContext={athleteContext}
    />
  )
}
