/**
 * Coach Tools Page
 *
 * Calculators and utilities:
 * - VDOT Calculator
 * - Environmental Adjustment Calculator
 * - Cross-Training Workout Converter
 * - Injury Assessment
 */

import { requireCoach } from '@/lib/auth-utils';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { validateBusinessMembership } from '@/lib/business-context';
import { getCoachScopedIds } from '@/lib/coach/scoping';
import { VDOTCalculator } from '@/components/coach/calculators/VDOTCalculator';
import { EnvironmentalCalculator } from '@/components/coach/calculators/EnvironmentalCalculator';
import { WorkoutConverter } from '@/components/coach/cross-training/WorkoutConverter';
import { InjuryAssessmentForm } from '@/components/coach/injury/InjuryAssessmentForm';
import { GoalZoneWizard } from '@/components/coach/goal-based/GoalZoneWizard';
import { prisma } from '@/lib/prisma';
import { Calculator, Thermometer, Activity, AlertTriangle, Target } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage';

interface CoachToolsPageProps {
  businessSlug?: string;
}

export default async function CoachToolsPage({ businessSlug }: CoachToolsPageProps = {}) {
  const user = await requireCoach();
  const locale = (await getLocale()) === 'sv' ? 'sv' : 'en';
  const copy = (en: string, sv: string) => locale === 'sv' ? sv : en;
  const membership = businessSlug
    ? await validateBusinessMembership(user.id, businessSlug)
    : null;
  if (businessSlug && !membership) {
    notFound();
  }
  const coachIds = membership
    ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
    : [user.id];

  // Fetch athletes for injury assessment and cross-training converter
  const clients = await prisma.client.findMany({
    where: {
      userId: { in: coachIds },
      ...(membership ? { businessId: membership.businessId } : {}),
    },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  const athletes = clients.map(c => ({
    id: c.id,
    name: c.name
  }));

  return (
    <RolePageFrame>
      <RolePageHeader
        eyebrow={copy('Coach', 'Coach')}
        title="Coach Tools"
        description="Calculators and utilities for training optimization"
      />

      <Tabs defaultValue="vdot" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="vdot">
            <Calculator className="h-4 w-4 mr-2" />
            VDOT
          </TabsTrigger>
          <TabsTrigger value="goal-zones">
            <Target className="h-4 w-4 mr-2" />
            {copy('Goal zones', 'Målzoner')}
          </TabsTrigger>
          <TabsTrigger value="environmental">
            <Thermometer className="h-4 w-4 mr-2" />
            {copy('Environment', 'Miljö')}
          </TabsTrigger>
          <TabsTrigger value="cross-training">
            <Activity className="h-4 w-4 mr-2" />
            {copy('Cross-training', 'Korsträning')}
          </TabsTrigger>
          <TabsTrigger value="injury">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {copy('Injury', 'Skada')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vdot">
          <VDOTCalculator />
        </TabsContent>

        <TabsContent value="goal-zones">
          <GoalZoneWizard />
        </TabsContent>

        <TabsContent value="environmental">
          <EnvironmentalCalculator />
        </TabsContent>

        <TabsContent value="cross-training">
          <WorkoutConverter />
        </TabsContent>

        <TabsContent value="injury">
          <InjuryAssessmentForm athletes={athletes} />
        </TabsContent>
      </Tabs>
    </RolePageFrame>
  );
}
