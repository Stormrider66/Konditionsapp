/**
 * Coach Referrals Page
 *
 * Allows coaches to manage their referral program.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { ReferralDashboardClient } from './ReferralDashboardClient';
import { getTranslations } from '@/i18n/server';

export async function generateMetadata() {
  const t = await getTranslations('referrals');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function CoachReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get coach user with referral data
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      referralCode: {
        include: {
          referrals: {
            select: {
              id: true,
              status: true,
              referredEmail: true,
              referredUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              rewards: {
                select: {
                  id: true,
                  rewardType: true,
                  value: true,
                  applied: true,
                },
              },
              createdAt: true,
              completedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      },
      referralRewards: {
        where: {
          applied: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          referral: {
            select: {
              referredUser: {
                select: { name: true },
              },
              referredEmail: true,
            },
          },
        },
      },
    },
  });

  if (!dbUser || dbUser.role !== 'COACH') {
    redirect('/login');
  }

  // Calculate stats
  const stats = {
    totalReferrals: dbUser.referralCode?.referrals.length || 0,
    completedReferrals: dbUser.referralCode?.successfulReferrals || 0,
    pendingReferrals: dbUser.referralCode?.referrals.filter(r => r.status === 'PENDING').length || 0,
    availableRewards: dbUser.referralRewards.length,
  };

  return (
    <ReferralDashboardClient
      userId={dbUser.id}
      userName={dbUser.name}
      referralCode={dbUser.referralCode}
      referrals={dbUser.referralCode?.referrals || []}
      availableRewards={dbUser.referralRewards}
      stats={stats}
    />
  );
}
