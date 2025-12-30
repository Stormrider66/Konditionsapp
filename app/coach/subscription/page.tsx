/**
 * Coach Subscription Page
 *
 * Allows coaches to view and manage their subscription.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { CoachSubscriptionClient } from './CoachSubscriptionClient';

export const metadata = {
  title: 'Prenumeration | Coach',
  description: 'Hantera din coach-prenumeration',
};

export default async function CoachSubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get coach user with subscription
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      subscription: true,
      _count: {
        select: { clients: true },
      },
    },
  });

  if (!dbUser || dbUser.role !== 'COACH') {
    redirect('/login');
  }

  return (
    <CoachSubscriptionClient
      userId={dbUser.id}
      subscription={dbUser.subscription}
      currentAthleteCount={dbUser._count.clients}
    />
  );
}
