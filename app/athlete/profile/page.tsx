// app/athlete/profile/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AthleteProfileEditor } from '@/components/athlete/AthleteProfileEditor'

export default async function AthleteProfilePage() {
  const user = await requireAthlete()

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

  // Transform the sportProfile data for the editor
  const sportProfile = athleteAccount.client.sportProfile
    ? {
        id: athleteAccount.client.sportProfile.id,
        primarySport: athleteAccount.client.sportProfile.primarySport,
        secondarySports: athleteAccount.client.sportProfile.secondarySports,
        runningExperience: athleteAccount.client.sportProfile.runningExperience || undefined,
        cyclingExperience: athleteAccount.client.sportProfile.cyclingExperience || undefined,
        swimmingExperience: athleteAccount.client.sportProfile.swimmingExperience || undefined,
        currentGoal: athleteAccount.client.sportProfile.currentGoal || undefined,
        preferredSessionLength: athleteAccount.client.sportProfile.preferredSessionLength || undefined,
        // Sport-specific settings (stored as JSON)
        cyclingSettings: athleteAccount.client.sportProfile.cyclingSettings as Record<string, unknown> | undefined,
        skiingSettings: athleteAccount.client.sportProfile.skiingSettings as Record<string, unknown> | undefined,
        swimmingSettings: athleteAccount.client.sportProfile.swimmingSettings as Record<string, unknown> | undefined,
        triathlonSettings: athleteAccount.client.sportProfile.triathlonSettings as Record<string, unknown> | undefined,
        hyroxSettings: athleteAccount.client.sportProfile.hyroxSettings as Record<string, unknown> | undefined,
        generalFitnessSettings: athleteAccount.client.sportProfile.generalFitnessSettings as Record<string, unknown> | undefined,
      }
    : null

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Min profil</h1>

      <AthleteProfileEditor
        clientId={athleteAccount.clientId}
        clientName={athleteAccount.client.name}
        clientEmail={athleteAccount.client.email || undefined}
        sportProfile={sportProfile}
      />
    </div>
  )
}
