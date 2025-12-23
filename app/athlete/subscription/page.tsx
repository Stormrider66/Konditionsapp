/**
 * Athlete Subscription Page
 *
 * Allows athletes to view and manage their subscription.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionClient } from './SubscriptionClient'

export const metadata = {
  title: 'Prenumeration | Atlet',
  description: 'Hantera din prenumeration',
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

  return (
    <SubscriptionClient
      clientId={athleteAccount.clientId}
      subscription={subscription}
    />
  )
}
