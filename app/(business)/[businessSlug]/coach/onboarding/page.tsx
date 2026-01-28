// app/(business)/[businessSlug]/coach/onboarding/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { CoachOnboardingClient } from '@/app/coach/onboarding/CoachOnboardingClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessCoachOnboardingPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  // Check if user has already completed onboarding
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  })

  // If user has a paid subscription, they've likely completed onboarding
  // Redirect to dashboard within business context
  if (subscription && subscription.tier !== 'FREE') {
    redirect(`/${businessSlug}/coach/dashboard`)
  }

  // Get client count to show in welcome
  const clientsCount = await prisma.client.count({
    where: { userId: user.id },
  })

  return (
    <CoachOnboardingClient
      userId={user.id}
      userName={user.name || ''}
      userEmail={user.email}
      hasClients={clientsCount > 0}
      currentTier={subscription?.tier || 'FREE'}
    />
  )
}
