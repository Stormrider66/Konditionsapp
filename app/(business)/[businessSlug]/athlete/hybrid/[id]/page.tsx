// app/(business)/[businessSlug]/athlete/hybrid/[id]/page.tsx
/**
 * Business Athlete Single Hybrid Workout Page
 *
 * View workout details and log results.
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { HybridWorkoutDetail } from '@/components/athlete/hybrid/HybridWorkoutDetail'
import { Skeleton } from '@/components/ui/skeleton'

interface BusinessHybridWorkoutPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessHybridWorkoutPage({ params }: BusinessHybridWorkoutPageProps) {
  const { businessSlug, id } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  const workout = await prisma.hybridWorkout.findUnique({
    where: { id },
    include: {
      movements: {
        include: {
          exercise: true,
        },
        orderBy: [
          { setNumber: 'asc' },
          { order: 'asc' },
        ],
      },
      results: {
        where: { athleteId: clientId },
        orderBy: { completedAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!workout) {
    notFound()
  }

  // Get PR for this workout
  const personalBest = await prisma.hybridWorkoutResult.findFirst({
    where: {
      workoutId: id,
      athleteId: clientId,
      isPR: true,
    },
  })

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<WorkoutDetailSkeleton />}>
        <HybridWorkoutDetail
          workout={workout as any}
          clientId={clientId}
          personalBest={personalBest as any}
          basePath={basePath}
        />
      </Suspense>
    </div>
  )
}

function WorkoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
