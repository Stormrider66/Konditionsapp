// app/(business)/[businessSlug]/coach/subscription/page.tsx
/**
 * Business-scoped Coach Subscription Page
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { CoachSubscriptionClient } from '@/components/coach/subscription/CoachSubscriptionClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessCoachSubscriptionPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
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
  })

  // requireCoach + validateBusinessMembership above already enforce that
  // this user has coach-platform access for this business — admins legitimately
  // get through both, so don't second-guess the role here. Without this
  // relaxation, a User.role='ADMIN' user (e.g. platform admin viewing a
  // tenant) hits redirect('/login') and effectively gets bounced out.
  if (!dbUser) {
    notFound()
  }

  return (
    <CoachSubscriptionClient
      userId={dbUser.id}
      subscription={dbUser.subscription}
      currentAthleteCount={dbUser._count.clients}
    />
  )
}
