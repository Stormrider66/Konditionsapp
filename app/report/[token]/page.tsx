/**
 * Public Report Page
 *
 * Allows anyone with a valid public token to view a test report
 * without logging in. Shows upgrade CTAs for creating an account.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { performAllCalculations } from '@/lib/calculations';
import { PublicReportView } from '@/components/reports/PublicReportView';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicReportPage({ params }: PageProps) {
  const { token } = await params;

  // Find test by public token
  const test = await prisma.test.findUnique({
    where: { publicToken: token },
    include: {
      client: true,
      testStages: {
        orderBy: { sequence: 'asc' },
      },
      user: {
        select: {
          name: true,
        },
      },
      tester: {
        select: {
          name: true,
          title: true,
        },
      },
      testLocation: {
        select: {
          name: true,
          city: true,
        },
      },
    },
  });

  // Check if test exists and token hasn't expired
  if (!test) {
    notFound();
  }

  if (test.publicExpiresAt && test.publicExpiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Länken har gått ut
          </h1>
          <p className="text-gray-600 mb-6">
            Den här rapportlänken är inte längre giltig. Kontakta din coach för
            att få en ny länk.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Skapa konto för att spara dina rapporter
          </Link>
        </div>
      </div>
    );
  }

  // Calculate test results
  // Transform test to match expected type (null -> undefined)
  const testForCalculations = {
    ...test,
    location: test.location ?? undefined,
    testLeader: test.testLeader ?? undefined,
    notes: test.notes ?? undefined,
  };
  const calculations = await performAllCalculations(testForCalculations as any, test.client as any);

  // Determine test leader name
  const testLeaderName =
    test.tester?.name || test.testLeader || test.user?.name || 'Okänd';

  // Determine location
  const locationName =
    test.testLocation?.name ||
    (test.testLocation?.city
      ? `${test.testLocation.name}, ${test.testLocation.city}`
      : test.location || '');

  return (
    <PublicReportView
      client={test.client}
      test={test}
      calculations={calculations}
      testLeader={testLeaderName}
      location={locationName}
      organization="Trainomics"
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;

  const test = await prisma.test.findUnique({
    where: { publicToken: token },
    include: {
      client: {
        select: { name: true },
      },
    },
  });

  if (!test) {
    return {
      title: 'Rapport ej hittad',
    };
  }

  return {
    title: `Konditionstestrapport - ${test.client.name}`,
    description: 'Din personliga konditionstestrapport från Trainomics',
  };
}
