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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VDOTCalculator } from '@/components/coach/calculators/VDOTCalculator';
import { EnvironmentalCalculator } from '@/components/coach/calculators/EnvironmentalCalculator';
import { WorkoutConverter } from '@/components/coach/cross-training/WorkoutConverter';
import { InjuryAssessmentForm } from '@/components/coach/injury/InjuryAssessmentForm';
import { prisma } from '@/lib/prisma';
import { Calculator, Thermometer, Activity, AlertTriangle } from 'lucide-react';

export default async function CoachToolsPage() {
  const user = await requireCoach();

  // Fetch athletes for injury assessment and cross-training converter
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
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
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Coach Tools</h1>
        <p className="text-muted-foreground">
          Calculators and utilities for training optimization
        </p>
      </div>

      <Tabs defaultValue="vdot" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vdot">
            <Calculator className="h-4 w-4 mr-2" />
            VDOT
          </TabsTrigger>
          <TabsTrigger value="environmental">
            <Thermometer className="h-4 w-4 mr-2" />
            Environmental
          </TabsTrigger>
          <TabsTrigger value="cross-training">
            <Activity className="h-4 w-4 mr-2" />
            Cross-Training
          </TabsTrigger>
          <TabsTrigger value="injury">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Injury
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vdot">
          <VDOTCalculator />
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
    </div>
  );
}
