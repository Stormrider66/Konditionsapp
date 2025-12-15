import { redirect } from 'next/navigation'
import { getCurrentUser, canAccessClient, getAthleteClientId } from '@/lib/auth-utils'
import { fetchAthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { AthleteProfileClient } from '@/components/athlete-profile/AthleteProfileClient'

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
  } else if (user.role === 'COACH' || user.role === 'ADMIN') {
    // Coaches/Admins must own the client or be admin
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
