// app/(business)/[businessSlug]/athlete/subscription/page.tsx
/**
 * Business Athlete Subscription Page
 *
 * Allows athletes to view and manage their subscription within business context.
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { validateBusinessMembership } from '@/lib/business-context'
import { SubscriptionClient } from '@/app/athlete/subscription/SubscriptionClient'

export const metadata = {
  title: 'Prenumeration | Atlet',
  description: 'Hantera din prenumeration',
}

interface BusinessSubscriptionPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessSubscriptionPage({ params }: BusinessSubscriptionPageProps) {
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

  const basePath = `/${businessSlug}`

  // Get athlete account with subscription
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: {
        include: {
          athleteSubscription: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  const subscription = athleteAccount.client.athleteSubscription

  // Serialize subscription for client component (convert Date to string)
  const serializedSubscription = subscription
    ? {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
        aiChatEnabled: subscription.aiChatEnabled,
        aiChatMessagesUsed: subscription.aiChatMessagesUsed,
        aiChatMessagesLimit: subscription.aiChatMessagesLimit,
        videoAnalysisEnabled: subscription.videoAnalysisEnabled,
        stravaEnabled: subscription.stravaEnabled,
        garminEnabled: subscription.garminEnabled,
      }
    : null

  return (
    <SubscriptionClient
      clientId={athleteAccount.clientId}
      subscription={serializedSubscription}
      basePath={basePath}
    />
  )
}
