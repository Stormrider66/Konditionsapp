/**
 * Field Test Results Page
 *
 * Display detailed field test results and analysis
 */

import { requireCoach } from '@/lib/auth-utils';
import { TestResultsDisplay } from '@/components/coach/tests/TestResultsDisplay';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface FieldTestPageProps {
  params: {
    testId: string;
  };
}

export default async function FieldTestPage({ params }: FieldTestPageProps) {
  const user = await requireCoach();

  const fieldTest = await prisma.fieldTest.findUnique({
    where: { id: params.testId },
    include: {
      athlete: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!fieldTest || fieldTest.userId !== user.id) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Field Test Results</h1>
        <p className="text-muted-foreground">
          {fieldTest.athlete.firstName} {fieldTest.athlete.lastName} •{' '}
          {new Date(fieldTest.testDate).toLocaleDateString()}
        </p>
      </div>

      <TestResultsDisplay
        testType={fieldTest.testType as any}
        results={fieldTest.resultData}
        confidence={fieldTest.confidence as any}
        validation={{
          isValid: !fieldTest.validationIssues || (fieldTest.validationIssues as any).length === 0,
          errors: (fieldTest.validationIssues as any)?.errors || [],
          warnings: (fieldTest.validationIssues as any)?.warnings || []
        }}
        recommendations={(fieldTest.resultData as any).recommendations || []}
      />
    </div>
  );
}
