// app/(business)/[businessSlug]/coach/monitoring/page.tsx
import { Suspense } from 'react';
import { requireCoach } from '@/lib/auth-utils';
import { validateBusinessMembership } from '@/lib/business-context';
import { getCoachScopedIds } from '@/lib/coach/scoping';
import { notFound } from 'next/navigation';
import { MonitoringCharts } from '@/components/coach/dashboards/MonitoringCharts';
import { MonitoringHeader } from '@/components/coach/monitoring/MonitoringHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage';
import { prisma } from '@/lib/prisma';
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart';
import { WeeklyZoneSummary } from '@/components/athlete/WeeklyZoneSummary';
import { YearlyTrainingOverview } from '@/components/athlete/YearlyTrainingOverview';
import { getTranslations } from '@/i18n/server';

interface BusinessMonitoringPageProps {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ athleteId?: string }>;
}

export default async function BusinessMonitoringPage({ params, searchParams }: BusinessMonitoringPageProps) {
  const { businessSlug } = await params;
  const user = await requireCoach();
  const resolvedParams = await searchParams;
  const t = await getTranslations('coach.pages.monitoring');

  const membership = await validateBusinessMembership(user.id, businessSlug);
  if (!membership) {
    notFound();
  }

  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role);
  const clients = await prisma.client.findMany({
    where: {
      userId: { in: coachIds },
      businessId: membership.businessId
    },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  const requestedAthleteId = resolvedParams.athleteId ?? null;
  const selectedAthleteId: string | null = requestedAthleteId && clients.some((client) => client.id === requestedAthleteId)
    ? requestedAthleteId
    : (clients.length > 0 ? clients[0].id : null);

  return (
    <RolePageFrame maxWidth="wide">
      {clients.length === 0 ? (
        <>
          <RolePageHeader
            eyebrow="Coach"
            title={t('title')}
            description={t('description')}
          />
          <RolePanel className="p-6">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('emptyTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {t('emptyDescription')}
            </p>
          </RolePanel>
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
                <h2 className="mb-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">{t('zoneDistribution')}</h2>
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
    </RolePageFrame>
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
