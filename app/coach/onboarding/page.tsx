// app/coach/onboarding/page.tsx
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { getTranslations } from '@/i18n/server';
import { redirect } from 'next/navigation';
import { CoachOnboardingClient } from './CoachOnboardingClient';

export default async function CoachOnboardingPage() {
  const user = await requireCoach();
  const t = await getTranslations('onboarding');

  // Check if user has already completed onboarding
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  // If user has a paid subscription, they've likely completed onboarding
  // Redirect to dashboard
  if (subscription && subscription.tier !== 'FREE') {
    redirect('/coach/dashboard');
  }

  // Get client count to show in welcome
  const clientsCount = await prisma.client.count({
    where: { userId: user.id },
  });

  return (
    <CoachOnboardingClient
      userId={user.id}
      userName={user.name || ''}
      userEmail={user.email}
      hasClients={clientsCount > 0}
      currentTier={subscription?.tier || 'FREE'}
    />
  );
}
