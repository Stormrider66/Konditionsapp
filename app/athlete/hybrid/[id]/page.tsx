/**
 * Athlete Single Hybrid Workout Page
 *
 * View workout details and log results.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { HybridWorkoutDetail } from '@/components/athlete/hybrid/HybridWorkoutDetail';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AthleteHybridWorkoutPage({ params }: PageProps) {
  const { id } = await params;
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

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
  });

  if (!workout) {
    notFound();
  }

  // Get PR for this workout
  const personalBest = await prisma.hybridWorkoutResult.findFirst({
    where: {
      workoutId: id,
      athleteId: clientId,
      isPR: true,
    },
  });

  // Cast to any to avoid Prisma's JsonValue type issues
  // The component handles the typing internally
  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<WorkoutDetailSkeleton />}>
        <HybridWorkoutDetail
          workout={workout as any}
          clientId={clientId}
          personalBest={personalBest as any}
        />
      </Suspense>
    </div>
  );
}

function WorkoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
