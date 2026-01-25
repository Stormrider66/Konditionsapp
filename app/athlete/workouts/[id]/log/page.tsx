// app/athlete/workouts/[id]/log/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { WorkoutLogClient } from '@/components/athlete/workout/WorkoutLogClient'

interface WorkoutLogPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkoutLogPage({ params }: WorkoutLogPageProps) {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const { id } = await params

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

  return (
    <WorkoutLogClient
      workout={workout as any}
      athleteId={user.id}
      existingLog={existingLog as any}
    />
  )
}
