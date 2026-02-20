/**
 * Test Results Page
 *
 * Handles both lab tests (Test model) and field tests (FieldTest model).
 * Tries lab test first, then falls back to field test.
 */

import { requireCoach } from '@/lib/auth-utils';
import { TestResultsDisplay } from '@/components/coach/tests/TestResultsDisplay';
import { ReportTemplate } from '@/components/reports/ReportTemplate';
import { PDFExportButton } from '@/components/reports/PDFExportButton';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { TestCalculations, Threshold, TrainingZone } from '@/types';

interface TestPageProps {
  params: Promise<{
    testId: string;
    businessSlug?: string;
  }>;
}

export default async function TestDetailPage({ params }: TestPageProps) {
  const user = await requireCoach();
  const resolvedParams = await params;
  const { testId } = resolvedParams;
  const businessSlug = (resolvedParams as any).businessSlug as string | undefined;
  const basePath = businessSlug ? `/${businessSlug}` : '';

  // Try lab test (Test model) first
  const labTest = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      testStages: { orderBy: { sequence: 'asc' } },
      client: true,
    },
  });

  if (labTest && labTest.userId === user.id) {
    const client = labTest.client;
    const bmi = client.weight && client.height
      ? parseFloat((client.weight / ((client.height / 100) ** 2)).toFixed(1))
      : 0;

    const calculations: TestCalculations = {
      bmi,
      vo2max: labTest.vo2max || 0,
      maxHR: labTest.maxHR || 0,
      maxLactate: labTest.maxLactate || 0,
      aerobicThreshold: labTest.aerobicThreshold as unknown as Threshold | null,
      anaerobicThreshold: labTest.anaerobicThreshold as unknown as Threshold | null,
      trainingZones: (labTest.trainingZones as unknown as TrainingZone[]) || [],
      economyData: (labTest as any).economyData || undefined,
      cyclingData: (labTest as any).cyclingData || undefined,
      dmaxVisualization: (labTest as any).dmaxVisualization || undefined,
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4 print:hidden">
          <div className="flex flex-wrap gap-3">
            <Link href={`${basePath}/coach/clients/${labTest.clientId}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka till atlet
              </Button>
            </Link>
            <PDFExportButton
              reportData={{
                client: client as any,
                test: labTest as any,
                calculations,
                testLeader: labTest.testLeader || 'Trainomics',
                organization: 'Trainomics',
                reportDate: new Date(labTest.testDate),
              }}
              variant="default"
              size="md"
            />
          </div>
        </div>

        <main className="container mx-auto px-4 pb-8">
          <ReportTemplate
            client={client as any}
            test={labTest as any}
            calculations={calculations}
            testLeader={labTest.testLeader || 'Trainomics'}
            organization="Trainomics"
          />
        </main>
      </div>
    );
  }

  // Fall back to field test (FieldTest model)
  const fieldTest = await prisma.fieldTest.findUnique({
    where: { id: testId },
    include: {
      client: {
        select: {
          name: true,
          userId: true,
        },
      },
    },
  });

  if (!fieldTest || fieldTest.client.userId !== user.id) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Field Test Results</h1>
        <p className="text-muted-foreground">
          {fieldTest.client.name} •{' '}
          {new Date(fieldTest.date).toLocaleDateString()}
        </p>
      </div>

      <TestResultsDisplay
        testType={fieldTest.testType as any}
        results={fieldTest.results}
        confidence={fieldTest.confidence as any}
        validation={{
          isValid: fieldTest.valid,
          errors: [],
          warnings: [],
        }}
        recommendations={(fieldTest.results as any)?.recommendations || []}
      />
    </div>
  );
}
