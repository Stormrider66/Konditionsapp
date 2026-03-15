import { redirect } from 'next/navigation'
import { getCurrentUser, canAccessClient, getAthleteClientId } from '@/lib/auth-utils'
import { fetchAthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { AthleteProfileClient } from '@/components/athlete-profile/AthleteProfileClient'
import { canAccessCoachPlatform, canAccessPhysioPlatform } from '@/lib/user-capabilities'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function AthleteProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab = 'physiology' } = await searchParams

  // Authentication
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // Authorization - determine view mode based on role
  let viewMode: 'coach' | 'athlete' = 'coach'

  if (user.role === 'ATHLETE') {
    // Athletes can only view their own profile
    const athleteClientId = await getAthleteClientId(user.id)
    if (!athleteClientId || athleteClientId !== id) {
      redirect('/athlete/dashboard')
    }
    viewMode = 'athlete'
  } else if (
    user.role === 'ADMIN' ||
    (await canAccessCoachPlatform(user.id)) ||
    (await canAccessPhysioPlatform(user.id))
  ) {
    // Professionals must be able to access the client.
    const hasAccess = await canAccessClient(user.id, id)
    if (!hasAccess) {
      redirect('/clients')
    }
  } else {
    redirect('/')
  }

  // Fetch all profile data in parallel
  const data = await fetchAthleteProfileData(id)

  // Handle client not found
  if (!data.identity.client) {
    redirect('/clients')
  }

  return (
    <AthleteProfileClient
      data={data}
      viewMode={viewMode}
      initialTab={tab}
      currentUserId={user.id}
    />
  )
}

export const dynamic = 'force-dynamic'
