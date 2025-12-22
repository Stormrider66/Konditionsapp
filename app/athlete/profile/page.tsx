// app/athlete/profile/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete, getAthleteClientId } from '@/lib/auth-utils'
import { fetchAthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { AthleteProfileClient } from '@/components/athlete-profile/AthleteProfileClient'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AthleteProfilePage({ searchParams }: PageProps) {
  const { tab = 'physiology' } = await searchParams

  const user = await requireAthlete()

  // Get athlete's client ID
  const clientId = await getAthleteClientId(user.id)

  if (!clientId) {
    redirect('/login')
  }

  // Fetch all profile data in parallel
  const data = await fetchAthleteProfileData(clientId)

  // Handle client not found
  if (!data.identity.client) {
    redirect('/athlete/dashboard')
  }

  return (
    <AthleteProfileClient
      data={data}
      viewMode="athlete"
      initialTab={tab}
      currentUserId={user.id}
    />
  )
}

export const dynamic = 'force-dynamic'
