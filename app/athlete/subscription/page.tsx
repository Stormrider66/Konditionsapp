/**
 * Athlete Subscription Page
 *
 * Allows athletes to view and manage their subscription.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionClient } from './SubscriptionClient'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.subscription')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
      billingEnabled={Boolean(process.env.STRIPE_SECRET_KEY)}
    />
  )
}
