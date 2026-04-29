// app/(business)/[businessSlug]/coach/referrals/page.tsx
/**
 * Business-scoped Coach Referrals Page
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { ReferralDashboardClient } from '@/components/coach/referrals/ReferralDashboardClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessCoachReferralsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
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
  })

  // requireCoach + validateBusinessMembership above already enforce that
  // this user has coach-platform access for this business — admins legitimately
  // get through both, so don't second-guess the role here. Without this
  // relaxation, a User.role='ADMIN' user (e.g. platform admin viewing a
  // tenant) hits redirect('/login') and effectively gets bounced out.
  if (!dbUser) {
    notFound()
  }

  // Calculate stats
  const stats = {
    totalReferrals: dbUser.referralCode?.referrals.length || 0,
    completedReferrals: dbUser.referralCode?.successfulReferrals || 0,
    pendingReferrals: dbUser.referralCode?.referrals.filter(r => r.status === 'PENDING').length || 0,
    availableRewards: dbUser.referralRewards.length,
  }

  return (
    <ReferralDashboardClient
      userId={dbUser.id}
      userName={dbUser.name}
      referralCode={dbUser.referralCode}
      referrals={dbUser.referralCode?.referrals || []}
      availableRewards={dbUser.referralRewards}
      stats={stats}
    />
  )
}
