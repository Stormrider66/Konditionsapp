// app/athlete/workouts/[id]/log/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { WorkoutLogClient } from '@/components/athlete/workout/WorkoutLogClient'

interface WorkoutLogPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkoutLogPage({ params }: WorkoutLogPageProps) {
  const user = await requireAthlete()
  const { id } = await params

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

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
  if (workout.day.week.program.clientId !== athleteAccount.clientId) {
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
