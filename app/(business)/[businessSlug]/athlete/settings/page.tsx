// app/(business)/[businessSlug]/athlete/settings/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { AthleteSettingsClient } from '@/app/athlete/settings/AthleteSettingsClient'

export const metadata = {
  title: 'Inställningar | Atlet',
  description: 'Hantera dina inställningar',
}

interface BusinessSettingsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteSettingsPage({ params }: BusinessSettingsPageProps) {
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
    notFound()
  }

  return (
    <AthleteSettingsClient
      clientId={clientId}
      clientName={client.name}
      sportProfile={client.sportProfile}
      basePath={basePath}
    />
  )
}
