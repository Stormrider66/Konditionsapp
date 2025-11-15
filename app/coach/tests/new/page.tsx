/**
 * Create Field Test Page
 *
 * Submit and analyze field tests:
 * - 30-Minute Time Trial
 * - HR Drift Test
 * - Critical Velocity Test
 */

import { requireCoach } from '@/lib/auth-utils';
import { FieldTestForm } from '@/components/coach/tests/FieldTestForm';
import prisma from '@/lib/prisma';

export default async function NewFieldTestPage() {
  const user = await requireCoach();

  // Fetch athletes for this coach
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true
    },
    orderBy: { lastName: 'asc' }
  });

  const athletes = clients.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`
  }));

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Field Test</h1>
        <p className="text-muted-foreground">
          Submit and analyze field test results for your athletes
        </p>
      </div>

      <FieldTestForm athletes={athletes} />
    </div>
  );
}
