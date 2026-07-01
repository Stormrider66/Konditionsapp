/**
 * Create Field Test Page
 *
 * Submit and analyze field tests:
 * - 30-Minute Time Trial
 * - HR Drift Test
 * - Critical Velocity Test
 */

import { requireCoach } from '@/lib/auth-utils';
import { notFound } from 'next/navigation';
import { validateBusinessMembership } from '@/lib/business-context';
import { getCoachScopedIds } from '@/lib/coach/scoping';
import { FieldTestForm } from '@/components/coach/tests/FieldTestForm';
import { prisma } from '@/lib/prisma';

interface NewFieldTestPageProps {
  businessSlug?: string;
}

export default async function NewFieldTestPage({ businessSlug }: NewFieldTestPageProps = {}) {
  const user = await requireCoach();
  const membership = businessSlug
    ? await validateBusinessMembership(user.id, businessSlug)
    : null;
  if (businessSlug && !membership) {
    notFound();
  }
  const coachIds = membership
    ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
    : [user.id];

  // Fetch athletes for this coach
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
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Create Field Test</h1>
        <p className="text-muted-foreground">
          Submit and analyze field test results for your athletes
        </p>
      </div>

      <FieldTestForm athletes={athletes} />
    </div>
  );
}
