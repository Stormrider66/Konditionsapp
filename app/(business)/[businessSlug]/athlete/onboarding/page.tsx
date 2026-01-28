// app/(business)/[businessSlug]/athlete/onboarding/page.tsx
import { redirect, notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { OnboardingWizard } from '@/components/onboarding'

interface BusinessOnboardingPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteOnboardingPage({ params }: BusinessOnboardingPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get client with sport profile
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sportProfile: true,
    },
  })

  if (!client) {
    redirect('/login')
  }

  // If onboarding is already completed, redirect to dashboard
  if (client.sportProfile?.onboardingCompleted) {
    redirect(`${basePath}/athlete/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <OnboardingWizard
        clientId={clientId}
        clientName={client.name}
        locale="sv"
        basePath={basePath}
      />
    </div>
  )
}
