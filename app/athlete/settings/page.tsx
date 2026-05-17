// app/athlete/settings/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AthleteSettingsClient } from './AthleteSettingsClient'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.settings')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function AthleteSettingsPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

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
      userEmail={supabaseUser?.email || ''}
    />
  )
}
