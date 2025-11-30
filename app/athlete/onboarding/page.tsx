// app/athlete/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { OnboardingWizard } from '@/components/onboarding'

export default async function AthleteOnboardingPage() {
  const user = await requireAthlete()

  // Get athlete account with client info
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: {
        include: {
          sportProfile: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  // If onboarding is already completed, redirect to dashboard
  if (athleteAccount.client.sportProfile?.onboardingCompleted) {
    redirect('/athlete/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <OnboardingWizard
        clientId={athleteAccount.clientId}
        clientName={athleteAccount.client.name}
        locale="sv"
      />
    </div>
  )
}
