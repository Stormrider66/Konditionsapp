/**
 * Athlete Hybrid Workouts Page
 *
 * Shows assigned hybrid workouts, benchmark library, and workout history.
 */

import { Suspense } from 'react';
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { getAthleteSelfServiceAccess } from '@/lib/auth/tier-utils';
import { AthleteHybridClient } from '@/components/athlete/hybrid/AthleteHybridClient';
import { Skeleton } from '@/components/ui/skeleton';
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.hybrid')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function AthleteHybridPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode();
  const { enabled: canAccessTemplates } = await getAthleteSelfServiceAccess(clientId);

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<HybridSkeleton />}>
        <AthleteHybridClient
          clientId={clientId}
          canAccessTemplates={canAccessTemplates}
        />
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
