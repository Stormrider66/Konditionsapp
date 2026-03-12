import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { BrowseWorkoutsClient } from '@/components/athlete/browse-workouts/BrowseWorkoutsClient'

export const metadata = {
  title: 'Hitta pass | Athlete',
  description: 'Utforska färdiga träningspass',
}

export default async function BrowseWorkoutsPage() {
  const resolved = await requireAthleteOrCoachInAthleteMode()

  const sportProfile = await prisma.sportProfile.findUnique({
    where: { clientId: resolved.clientId },
    select: { primarySport: true },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <BrowseWorkoutsClient athleteSport={sportProfile?.primarySport ?? null} />
    </div>
  )
}
