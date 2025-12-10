/**
 * Athlete Hybrid Workouts Page
 *
 * Shows assigned hybrid workouts, benchmark library, and workout history.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireAthlete } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { AthleteHybridClient } from '@/components/athlete/hybrid/AthleteHybridClient';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Hybrid Pass | Star by Thomson',
  description: 'Dina CrossFit, HYROX och funktionella pass',
};

export default async function AthleteHybridPage() {
  const user = await requireAthlete();

  // Get athlete account to get clientId
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    select: { clientId: true },
  });

  if (!athleteAccount) {
    redirect('/login');
  }

  const clientId = athleteAccount.clientId;

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<HybridSkeleton />}>
        <AthleteHybridClient clientId={clientId} />
      </Suspense>
    </div>
  );
}

function HybridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
