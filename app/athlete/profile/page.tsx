// app/athlete/profile/page.tsx
import { redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { fetchAthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { AthleteProfileClient } from '@/components/athlete-profile/AthleteProfileClient'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AthleteProfilePage({ searchParams }: PageProps) {
  const { tab = 'physiology' } = await searchParams

  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

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
