/**
 * Field Test Results Page
 *
 * Display detailed field test results and analysis
 */

import { requireCoach } from '@/lib/auth-utils';
import { TestResultsDisplay } from '@/components/coach/tests/TestResultsDisplay';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface FieldTestPageProps {
  params: Promise<{
    testId: string;
  }>;
}

export default async function FieldTestPage({ params }: FieldTestPageProps) {
  const user = await requireCoach();
  const { testId } = await params;

  const fieldTest = await prisma.fieldTest.findUnique({
    where: { id: testId },
    include: {
      client: {
        select: {
          name: true,
          userId: true
        }
      }
    }
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
          warnings: []
        }}
        recommendations={(fieldTest.results as any)?.recommendations || []}
      />
    </div>
  );
}
