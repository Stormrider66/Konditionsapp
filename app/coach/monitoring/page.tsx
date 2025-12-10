/**
 * Athlete Monitoring Dashboard
 *
 * Track HRV, RHR, wellness, and readiness trends
 */

import { Suspense } from 'react';
import { requireCoach } from '@/lib/auth-utils';
import { MonitoringCharts } from '@/components/coach/dashboards/MonitoringCharts';
import { MonitoringHeader } from '@/components/coach/monitoring/MonitoringHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

interface MonitoringPageProps {
  searchParams: Promise<{
    athleteId?: string;
  }>;
}

export default async function MonitoringPage({ searchParams }: MonitoringPageProps) {
  const user = await requireCoach();
  const resolvedParams = await searchParams;

  // Fetch all athletes for this coach
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  const selectedAthleteId = resolvedParams.athleteId || (clients.length > 0 ? clients[0].id : null);

  return (
    <div className="container mx-auto py-8">
      {clients.length === 0 ? (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Atletmonitorering</h1>
            <p className="text-muted-foreground">
              Följ HRV, vilopuls, välmående och beredskap
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Inga atleter</CardTitle>
              <CardDescription>
                Du har inga atleter ännu. Skapa en klient först.
              </CardDescription>
            </CardHeader>
          </Card>
        </>
      ) : (
        <>
          <MonitoringHeader
            clients={clients}
            selectedAthleteId={selectedAthleteId}
          />

          {selectedAthleteId && (
            <Suspense fallback={<MonitoringSkeleton />}>
              <MonitoringCharts athleteId={selectedAthleteId} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}

function MonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}
