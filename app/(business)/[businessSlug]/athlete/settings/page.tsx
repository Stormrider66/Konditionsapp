// app/(business)/[businessSlug]/athlete/settings/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get athlete account with sport profile
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

  return (
    <AthleteSettingsClient
      clientId={athleteAccount.clientId}
      clientName={athleteAccount.client.name}
      sportProfile={athleteAccount.client.sportProfile}
      basePath={basePath}
    />
  )
}
