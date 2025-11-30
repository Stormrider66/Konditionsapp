/**
 * Program Report Viewer Page (Athlete Portal)
 *
 * View compiled program report with:
 * - Training zones
 * - Race protocols
 * - Field test schedule
 * - Quality programming
 * - PDF/JSON export
 */

import { requireAthlete } from '@/lib/auth-utils';
import { ProgramReportViewer } from '@/components/athlete/program/ProgramReportViewer';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface ProgramReportPageProps {
  searchParams: Promise<{
    programId?: string;
  }>;
}

export default async function ProgramReportPage({ searchParams }: ProgramReportPageProps) {
  const user = await requireAthlete();
  const resolvedParams = await searchParams;

  // Get athlete's client
  const client = await prisma.client.findFirst({
    where: {
      athleteAccount: {
        userId: user.id
      }
    },
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
        <h1 className="text-3xl font-bold mb-4">Programrapport</h1>
        <p className="text-muted-foreground">
          Du har inget aktivt träningsprogram ännu. Kontakta din tränare.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Min programrapport</h1>
        <p className="text-muted-foreground">
          Detaljerad översikt över ditt träningsprogram med zoner, tester och loppstrategier.
        </p>
      </div>

      <ProgramReportViewer programId={programId} />
    </div>
  );
}
