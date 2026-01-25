/**
 * Benchmark Schedule Page (Athlete Portal)
 *
 * View upcoming field tests with:
 * - Test types and purposes
 * - Due dates and critical flags
 * - Completed test results
 */

import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { BenchmarkSchedule } from '@/components/athlete/program/BenchmarkSchedule';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface BenchmarkSchedulePageProps {
  searchParams: Promise<{
    programId?: string;
  }>;
}

export default async function BenchmarkSchedulePage({ searchParams }: BenchmarkSchedulePageProps) {
  const { clientId } = await requireAthleteOrCoachInAthleteMode();
  const resolvedParams = await searchParams;

  // Get athlete's client with training programs
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      trainingPrograms: {
        where: {
          isActive: true
        },
        orderBy: {
          startDate: 'desc'
        },
        take: 1
      }
    }
  });

  if (!client) {
    notFound();
  }

  const programId = resolvedParams.programId || client.trainingPrograms[0]?.id;

  if (!programId) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Testschema</h1>
        <p className="text-muted-foreground">
          Du har inget aktivt träningsprogram ännu. Kontakta din tränare.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mitt testschema</h1>
        <p className="text-muted-foreground">
          Planerade fälttester för att följa dina framsteg genom säsongen.
        </p>
      </div>

      <BenchmarkSchedule programId={programId} />
    </div>
  );
}
