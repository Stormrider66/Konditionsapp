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

import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { ProgramReportViewer } from '@/components/athlete/program/ProgramReportViewer';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getTranslations } from '@/i18n/server';

interface ProgramReportPageProps {
  searchParams: Promise<{
    programId?: string;
  }>;
}

export default async function ProgramReportPage({ searchParams }: ProgramReportPageProps) {
  const t = await getTranslations('pages.programReport');
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
        <h1 className="font-display text-3xl font-bold mb-4">{t('emptyTitle')}</h1>
        <p className="text-muted-foreground">
          {t('emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <ProgramReportViewer programId={programId} />
    </div>
  );
}
