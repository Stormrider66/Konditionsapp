import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { BrowseWorkoutsClient } from '@/components/athlete/browse-workouts/BrowseWorkoutsClient'

export const metadata = {
  title: 'Hitta pass | Athlete',
  description: 'Utforska färdiga träningspass',
}

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BrowseWorkoutsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const resolved = await requireAthleteOrCoachInAthleteMode()
  const membership = await validateBusinessMembership(resolved.user.id, businessSlug)
  if (!membership) return notFound()

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
