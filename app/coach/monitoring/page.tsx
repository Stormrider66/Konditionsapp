/**
 * Athlete Monitoring Dashboard
 *
 * Track HRV, RHR, wellness, and readiness trends
 */

import { Suspense } from 'react';
import { requireCoach } from '@/lib/auth-utils';
import { MonitoringCharts } from '@/components/coach/dashboards/MonitoringCharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Athlete Monitoring</h1>
        <p className="text-muted-foreground">
          Track HRV, resting HR, wellness, and readiness trends
        </p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Athletes</CardTitle>
            <CardDescription>
              You don&apos;t have any athletes yet. Create a client first.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Select Athlete</label>
            <Select value={selectedAthleteId || undefined}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select athlete" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
