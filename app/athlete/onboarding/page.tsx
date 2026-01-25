// app/athlete/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { OnboardingWizard } from '@/components/onboarding'

export default async function AthleteOnboardingPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

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
    redirect('/athlete/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <OnboardingWizard
        clientId={clientId}
        clientName={client.name}
        locale="sv"
      />
    </div>
  )
}
