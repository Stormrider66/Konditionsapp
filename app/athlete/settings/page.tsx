// app/athlete/settings/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AthleteSettingsClient } from './AthleteSettingsClient'

export const metadata = {
  title: 'Inställningar | Atlet',
  description: 'Hantera dina inställningar',
}

export default async function AthleteSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
    />
  )
}
