// app/athlete/agility/[workoutId]/page.tsx
// Workout execution page for athletes

import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AgilityWorkoutExecution } from '@/components/athlete/AgilityWorkoutExecution'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Agility Workout | Athlete',
  description: 'Execute your assigned agility workout.'
}

interface PageProps {
  params: Promise<{ workoutId: string }>
}

async function getWorkoutData(workoutId: string, clientId: string) {
  // Get the workout with drills
  const workout = await prisma.agilityWorkout.findUnique({
    where: { id: workoutId },
    include: {
      drills: {
        orderBy: { order: 'asc' },
        include: {
          drill: true
        }
      }
    }
  })

  if (!workout) return null

  // Check if athlete has an assignment for this workout
  const assignment = await prisma.agilityWorkoutAssignment.findFirst({
    where: {
      workoutId,
      athleteId: clientId
    }
  })

  return { workout, assignmentId: assignment?.id }
}

export default async function AthleteWorkoutExecutionPage({ params }: PageProps) {
  const { workoutId } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  const data = await getWorkoutData(workoutId, clientId)

  if (!data?.workout) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<WorkoutExecutionSkeleton />}>
        <AgilityWorkoutExecution
          workout={data.workout}
          clientId={clientId}
          assignmentId={data.assignmentId}
        />
      </Suspense>
    </div>
  )
}

function WorkoutExecutionSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-96" />
      <div className="flex justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
