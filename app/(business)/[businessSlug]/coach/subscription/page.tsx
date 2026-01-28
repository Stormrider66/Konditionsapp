// app/(business)/[businessSlug]/coach/subscription/page.tsx
/**
 * Business-scoped Coach Subscription Page
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { CoachSubscriptionClient } from '@/app/coach/subscription/CoachSubscriptionClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessCoachSubscriptionPage({ params }: PageProps) {
  const { businessSlug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  if (!dbUser || dbUser.role !== 'COACH') {
    redirect('/login')
  }

  return (
    <CoachSubscriptionClient
      userId={dbUser.id}
      subscription={dbUser.subscription}
      currentAthleteCount={dbUser._count.clients}
    />
  )
}
