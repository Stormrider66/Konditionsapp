// app/(business)/[businessSlug]/coach/monitoring/page.tsx
import { Suspense } from 'react';
import { requireCoach } from '@/lib/auth-utils';
import { validateBusinessMembership } from '@/lib/business-context';
import { notFound } from 'next/navigation';
import { MonitoringCharts } from '@/components/coach/dashboards/MonitoringCharts';
import { MonitoringHeader } from '@/components/coach/monitoring/MonitoringHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart';
import { WeeklyZoneSummary } from '@/components/athlete/WeeklyZoneSummary';
import { YearlyTrainingOverview } from '@/components/athlete/YearlyTrainingOverview';

interface BusinessMonitoringPageProps {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ athleteId?: string }>;
}

export default async function BusinessMonitoringPage({ params, searchParams }: BusinessMonitoringPageProps) {
  const { businessSlug } = await params;
  const user = await requireCoach();
  const resolvedParams = await searchParams;

  const membership = await validateBusinessMembership(user.id, businessSlug);
  if (!membership) {
    notFound();
  }

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
            <>
              <Suspense fallback={<MonitoringSkeleton />}>
                <MonitoringCharts athleteId={selectedAthleteId} />
              </Suspense>

              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Pulszonfördelning</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="lg:col-span-1">
                    <WeeklyZoneSummary clientId={selectedAthleteId} />
                  </div>
                  <div className="lg:col-span-2">
                    <ZoneDistributionChart clientId={selectedAthleteId} />
                  </div>
                </div>
                <YearlyTrainingOverview clientId={selectedAthleteId} />
              </div>
            </>
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
