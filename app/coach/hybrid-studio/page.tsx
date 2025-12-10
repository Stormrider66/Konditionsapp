/**
 * Hybrid Studio Page
 *
 * Main page for creating and managing hybrid workouts (CrossFit, HYROX, functional fitness).
 */

import { Suspense } from 'react';
import { requireCoach } from '@/lib/auth-utils';
import { HybridStudioClient } from '@/components/hybrid-studio/HybridStudioClient';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Hybrid Studio | Konditionstest',
  description: 'Create and manage CrossFit, HYROX, and functional fitness workouts',
};

export default async function HybridStudioPage() {
  await requireCoach();

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<HybridStudioSkeleton />}>
        <HybridStudioClient />
      </Suspense>
    </div>
  );
}

function HybridStudioSkeleton() {
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
